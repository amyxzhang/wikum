from __future__ import print_function
from __future__ import absolute_import
from builtins import str
import re
import json
import random
import logging
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.exceptions import StopConsumer

# from channels import Group
# from channels.auth import channel_session, http_session_user, channel_session_user, channel_session_user_from_http
from .engine import *
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.encoding import smart_text
from website.models import Article, Source, CommentRating, CommentAuthor, Permissions
from website.views import recurse_up_post, recurse_down_num_subtree, make_vector, get_summary, clean_parse, delete_node
from website.engine import count_article

log = logging.getLogger(__name__)

class WikumConsumer(WebsocketConsumer):
    """
    This chat consumer handles websocket connections for chat clients.
    It uses AsyncJsonWebsocketConsumer, which means all the handling functions
    must be async functions, and any sync work (like ORM access) has to be
    behind database_sync_to_async or sync_to_async. For more, read
    http://channels.readthedocs.io/en/latest/topics/consumers.html
    """
    ##### WebSocket event handlers

    def connect(self):
        """
        Called when the websocket is handshaking as part of initial connection.
        """
        # message['path'] = /ws/article/[article_name]/visualization_flags
        self.article_id = self.scope['url_route']['kwargs']['article_id']
        self.group_name = 'article_%s' % self.article_id

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name,
            self.channel_name
        )
        raise StopConsumer

    def receive(self, text_data):
        try:
            article_id = self.article_id
            article = Article.objects.get(id=article_id)
        except KeyError:
            log.debug('no article in channel_session')
            return
        except Article.DoesNotExist:
            log.debug('recieved message, but article does not exist id=%s', article_id)
            return

        message = {}
        # Parse out a article message from the content text, bailing if it doesn't
        # conform to the expected message format.
        try:
            data = json.loads(text_data)
            user = self.scope["user"]
            req_user = user if user.is_authenticated else None
            username = user.username if user.is_authenticated else None
            if user.is_anonymous:
                    username = "Anonymous"
            if 'type' in data:
                data_type = data['type']
                if data_type == 'new_node' or data_type == 'reply_comment':
                    message = self.handle_message(data, username)
                elif data_type == 'tag_one' or data_type == 'tag_selected':
                    message = self.handle_tags(data, username)
                elif data_type == 'delete_tags':
                    message = self.handle_delete_tags(data, username)
                elif data_type == 'update_locks':
                    message = self.handle_update_locks(data, username)
                elif data_type == 'summarize_comment':
                    message = self.handle_summarize_comment(data, username)
                elif data_type == 'summarize_selected':
                    message = self.handle_summarize_selected(data, username)
                elif data_type == 'summarize_comments':
                    message = self.handle_summarize_comments(data, username)
                elif data_type == 'hide_comment':
                    message = self.handle_hide_comment(data, username)
                elif data_type == 'hide_comments':
                    message = self.handle_hide_comments(data, username)
                elif data_type == 'hide_replies':
                    message = self.handle_hide_replies(data, username)
                elif data_type == 'delete_comment_summary':
                    message = self.handle_delete_comment_summary(data, username)
        except ValueError:
            log.debug("ws message isn't json text=%s", text)
            return

        if data:
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    'type': 'handle.data',
                    'message': message
                }
            )

    def mark_children_summarized(self, post):
        post.summarized = True
        children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
        for child in children:
            child.summarized = True
            child.save()
            self.mark_children_summarized(child)

    def recurse_down_post(self, post):
        children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
        for child in children:
            child.json_flatten = ""
            child.save()
            self.recurse_down_post(child)

    def recurse_down_hidden(self, replies, count):
        for reply in replies:
            if not reply.hidden:
                reply.hidden = True
                reply.json_flatten = ''
                reply.save()
                count += 1
                reps = Comment.objects.filter(reply_to_disqus=reply.disqus_id, article=reply.article)
                count = self.recurse_down_hidden(reps, count)
        return count

    def handle_data(self, event):
        message = event['message']
        self.send(text_data=json.dumps(message))


    def handle_message(self, data, username):
        article_id = self.article_id
        article = Article.objects.get(id=article_id)
        try:
            user = self.scope["user"]
            owner = data.get('owner', None)
            if not owner or owner == "None":
                owner = None
            else:
                owner = User.objects.get(username=owner)

            permission = None
            if user.is_authenticated:
                permission = Permissions.objects.filter(user=user, article=article)
                if permission.exists():
                    permission = permission[0]
            if article.access_mode < 2 or (user.is_authenticated and permission and (permission.access_level < 2)) or user == owner:
                comment = data['comment']
                req_user = user if user.is_authenticated else None
                req_username = user.username if user.is_authenticated else None
                # if commentauthor for username use it; otherwise create it
                author = CommentAuthor.objects.filter(username=req_username)
                if user.is_anonymous:
                    req_username = "Anonymous"
                    author = CommentAuthor.objects.create(username=req_username, anonymous=True, is_wikum=True)
                else:
                    if author.exists():
                        author = author[0]
                        author.is_wikum = True
                        author.user = user
                    else:
                        # existing user who is not a comment author
                        author = CommentAuthor.objects.create(username=req_username, is_wikum=True, user=user)
                new_id = random_with_N_digits(10)
                new_comment = None
                explanation = ''
                if data['type'] == 'new_node':
                    new_comment = Comment.objects.create(article=article,
                                                         author=author,
                                                         is_replacement=False,
                                                         disqus_id=new_id,
                                                         text=comment,
                                                         summarized=False,
                                                         text_len=len(comment))
                    explanation = 'new comment'
                elif data['type'] == 'reply_comment':
                    id = data['id']
                    c = Comment.objects.get(id=id)
                    new_comment = Comment.objects.create(article=article,
                                                         author=author,
                                                         is_replacement=False,
                                                         reply_to_disqus=c.disqus_id,
                                                         disqus_id=new_id,
                                                         text=comment,
                                                         summarized=False,
                                                         text_len=len(comment),
                                                         import_order=c.import_order)
                    explanation = 'reply to comment'

                new_comment.save()
                action = data['type']
                h = History.objects.create(user=req_user,
                                           article=article,
                                           action=action,
                                           explanation=explanation)

                h.comments.add(new_comment)
                recurse_up_post(new_comment)

                recurse_down_num_subtree(new_comment)

                # make_vector(new_comment, article)
                article.comment_num = article.comment_num + 1
                article.percent_complete = count_article(article)
                article.last_updated = datetime.datetime.now(tz=timezone.utc)

                article.save()
                response_dict = {'comment': comment, 'd_id': new_comment.id, 'author': req_username, 'type': data['type'], 'user': req_username}
                if data['type'] == 'reply_comment':
                    response_dict['parent_did'] = data['id']
                return response_dict
            else:
                return {'user': username}
        except Exception as e:
            print(e)
            return {}

    def handle_tags(self, data, username):
        article_id = self.article_id
        article = Article.objects.get(id=article_id)
        try:
            tag = data['tag']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            t, created = Tag.objects.get_or_create(article=article, text=tag.lower().strip())
            if created:
                r = lambda: random.randint(0, 255)
                color = '%02X%02X%02X' % (r(), r(), r())
                t.color = color
                t.save()
            else:
                color = t.color
            
            if data['type'] == 'tag_one':
                id = data['id']
                comment = Comment.objects.get(id=id)
                affected= False
                
                tag_exists = comment.tags.filter(text=t.text)
                if tag_exists.count() == 0:
                    comment.tags.add(t)
                    affected = True
                    
                if affected:
                    h = History.objects.create(user=req_user, 
                                               article=article,
                                               action='tag_comment',
                                               explanation="Add tag %s to a comment" % t.text)
                    
                    h.comments.add(comment)
                    
                    article.last_updated = datetime.datetime.now(tz=timezone.utc)
                    article.save()
                    
                    recurse_up_post(comment)
                        
                tag_count = article.comment_set.filter(tags__isnull=False).count()
                if tag_count % 2 == 0:
                    from .tasks import generate_tags
                    generate_tags.delay(article_id)

                if affected:
                    response_dict = {'user': username, 'color': color, 'type': data['type'], 'd_id': data['id'], 'tag': data['tag'], 'id_str': data['id_str'], 'did_str': data['id_str']}
                    return response_dict
                else:
                    return {'user': username}
            elif data['type'] == 'tag_selected':
                ids = data['ids']
                comments = Comment.objects.filter(id__in=ids, hidden=False)
                
                affected_comms = [];
                
                for comment in comments:
                    tag_exists = comment.tags.filter(text=t.text)
                    if tag_exists.count() == 0:
                        comment.tags.add(t)
                        affected_comms.append(comment)
                
                if affected_comms:
                    h = History.objects.create(user=req_user, 
                                               article=article,
                                               action='tag_comments',
                                               explanation='Add tag %s to comments' % t.text)
                    article.last_updated = datetime.datetime.now(tz=timezone.utc)
                    article.save()
                
                    for com in affected_comms:
                        recurse_up_post(com)
                        h.comments.add(com)
                    
                tag_count = article.comment_set.filter(tags__isnull=False).count()
                if tag_count % 2 == 0:
                    from .tasks import generate_tags
                    generate_tags.delay(article_id)
                    
                if len(affected_comms) > 0:
                    response_dict = {'user': username, 'color': color, 'type': data['type'], 'dids': data['ids'], 'tag': data['tag'], 'id_str': data['id_str'], 'did_str': data['id_str']}
                    return response_dict
                else:
                    return {'user': username}
        except Exception as e:
            print(e)
            return {}

    def handle_update_locks(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            ids = data['ids']
            for id in ids:
                c = Comment.objects.get(id=id)
                if data['to_lock']:
                    c.is_locked = True
                else:
                    c.is_locked = False
                c.save()
                recurse_up_post(c)
            res = {'user': username, 'type': data['type'], 'node_ids': data['node_ids'], 'ids': data['ids'], 'to_lock': data['to_lock']}
            return res
        except Exception as e:
            print(e)
            return {'user': username}


    def handle_summarize_comment(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            id = data['id']
            summary = data['comment']
            top_summary, bottom_summary = get_summary(summary)

            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            c = Comment.objects.get(id=id)
            from_summary = c.summary + '\n----------\n' + c.extra_summary
            c.summary = top_summary
            c.extra_summary = bottom_summary
            c.save()
            
            if from_summary != '':
                action = 'edit_sum'
                explanation = 'edit summary'
            else :
                action = 'sum_comment'
                explanation = 'initial summary'
                

            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action=action,
                                       from_str=from_summary,
                                       to_str=summary,
                                       explanation=explanation)
            
            h.comments.add(c)
            recurse_up_post(c)
            
            
            a.summary_num = a.summary_num + 1
            a.percent_complete = count_article(a)
            a.last_updated = datetime.datetime.now()
            a.save()
            res = {'user': username, 'type': data['type'], 'd_id': data['id']}
            if 'wikipedia.org' in a.url:
                if top_summary.strip() != '':
                    res['top_summary'] = clean_parse(top_summary)
                else:
                    res['top_summary'] = ''
                
                res['top_summary_wiki'] = top_summary
                
                if bottom_summary.strip() != '':
                    res['bottom_summary'] = clean_parse(bottom_summary)
                else:
                    res['bottom_summary'] = ''
                
                res['bottom_summary_wiki'] = bottom_summary
                return res
            else:
                res['top_summary'] = top_summary
                res['bottom_summary'] = bottom_summary
                return res
            
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_summarize_selected(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            ids = data['ids']
            children_ids = data['children']
            children_ids = [int(x) for x in children_ids]
            child_id = data['child']
            
            delete_nodes = data['delete_nodes']
            
            summary = data['comment']
            
            top_summary, bottom_summary = get_summary(summary)
            
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            comments = Comment.objects.filter(id__in=ids)
            children = [c for c in comments if c.id in children_ids]
            child = Comment.objects.get(id=child_id)
            
            lowest_child = children[0]
            for c in children:
                if c.import_order < lowest_child.import_order:
                    lowest_child = c

            new_id = random_with_N_digits(10)
                
            new_comment = Comment.objects.create(article=a, 
                                                 is_replacement=True, 
                                                 reply_to_disqus=child.reply_to_disqus,
                                                 summarized=True,
                                                 summary=top_summary,
                                                 extra_summary=bottom_summary,
                                                 disqus_id=new_id,
                                                 points=child.points,
                                                 text_len=len(summary),
                                                 import_order=lowest_child.import_order)

            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='sum_selected',
                                       to_str=summary,
                                       explanation='initial summary of group of comments') 
           
            for c in children:
                c.reply_to_disqus = new_id
                c.save()
                h.comments.add(c)
                
            h.comments.add(new_comment)

            for node in delete_nodes:
                delete_node(node)

            self.mark_children_summarized(new_comment)

            recurse_up_post(new_comment)

            recurse_down_num_subtree(new_comment)

            a.summary_num = a.summary_num + 1
            a.percent_complete = count_article(a)
            a.last_updated = datetime.datetime.now()
            
            a.save()
            
            res = {'user': username, 'type': data['type'], 'd_id': new_comment.id, 'lowest_d': child_id, 'children': children_ids}
            res['size'] = data['size']
            res['delete_summary_node_dids'] = data['delete_summary_node_dids']
            if 'wikipedia.org' in a.url:
                if top_summary.strip() != '':
                    res['top_summary'] = clean_parse(top_summary)
                else:
                    res['top_summary'] = ''
                
                res['top_summary_wiki'] = top_summary
                
                if bottom_summary.strip() != '':
                    res['bottom_summary'] = clean_parse(bottom_summary)
                else:
                    res['bottom_summary'] = ''
                
                res['bottom_summary_wiki'] = bottom_summary
                res['user'] = username
                res['type'] = data['type']
                return res
            else:
                res['top_summary'] = top_summary
                res['bottom_summary'] = bottom_summary
                return res
            
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_summarize_comments(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            id = data['id']
            summary = data['comment']
            top_summary, bottom_summary = get_summary(summary)

            delete_nodes = data['delete_nodes']
            
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            c = Comment.objects.get(id=id)
            
            if not c.is_replacement:
                new_id = random_with_N_digits(10);
                
                new_comment = Comment.objects.create(article=a, 
                                                     is_replacement=True, 
                                                     reply_to_disqus=c.reply_to_disqus,
                                                     summary=top_summary,
                                                     summarized=True,
                                                     extra_summary=bottom_summary,
                                                     disqus_id=new_id,
                                                     points=c.points,
                                                     text_len=len(summary),
                                                     import_order=c.import_order)

                c.reply_to_disqus = new_id
                c.save()

                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='sum_nodes',
                                           to_str=summary,
                                           explanation='initial summary of subtree')
                
                d_id = new_comment.id

                h.comments.add(new_comment)

                self.mark_children_summarized(new_comment)

                recurse_up_post(new_comment)

                recurse_down_num_subtree(new_comment)
                
            else:
                from_summary = c.summary + '\n----------\n' + c.extra_summary
                c.summary = top_summary
                c.extra_summary=bottom_summary
                c.save()
                
                h = History.objects.create(user=req_user, 
                               article=a,
                               action='edit_sum_nodes',
                               from_str=from_summary,
                               to_str=summary,
                               explanation='edit summary of subtree')
                
                d_id = c.id
                
                new_comment = c
                recurse_down_num_subtree(new_comment)
                recurse_up_post(c)

            for node in delete_nodes:
                new_h = History.objects.create(user=req_user, 
                               article=a,
                               action='delete_node',
                               from_str=node,
                               to_str=c.id,
                               explanation='promote summary')
                delete_node(node)

            h.comments.add(c)
            
            a.summary_num = a.summary_num + 1
            a.percent_complete = count_article(a)
            a.last_updated = datetime.datetime.now()
            
            a.save()
            
            res = {'user': username, 'type': data['type'], 'd_id': new_comment.id, 'node_id': data['node_id'], 'orig_did': data['id']}
            res['subtype'] = data['subtype']
            res['delete_summary_node_dids'] = data['delete_summary_node_dids']
            if 'wikipedia.org' in a.url:
                if top_summary.strip() != '':
                    res['top_summary'] = clean_parse(top_summary)
                else:
                    res['top_summary'] = ''
                
                res['top_summary_wiki'] = top_summary
                
                if bottom_summary.strip() != '':
                    res['bottom_summary'] = clean_parse(bottom_summary)
                else:
                    res['bottom_summary'] = ''
                
                res['bottom_summary_wiki'] = bottom_summary
                return res
            else:
                res['top_summary'] = top_summary
                res['bottom_summary'] = bottom_summary
                return res
            
        except Exception as e:
            print(e)
            import traceback
            print(traceback.format_exc())
            return {'user': username}


    def handle_delete_tags(self, data, username):
        article_id = self.article_id
        article = Article.objects.get(id=article_id)
        try:
            comment_ids = data['ids']
            comment_ids = comment_ids.split(',')
            ids = []
            for idx in comment_ids:
                if idx:
                    ids.append(int(idx))
                    
            tag = data['tag']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            comments = Comment.objects.filter(id__in=ids)
            
            affected_comments = []
            affected= False
            a = None
            
            for comment in comments:
                a = comment.article
                tag_exists = comment.tags.filter(text=tag)
                
                if tag_exists.count() == 1:
                    comment.tags.remove(tag_exists[0])
                    affected_comments.append(comment)
                    affected = True
                
            if affected:
                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='delete_tag',
                                           explanation="Deleted tag %s from comments" % tag)
                for comment in affected_comments:
                    h.comments.add(comment)
                
                a.last_updated = datetime.datetime.now(tz=timezone.utc)
                a.save()
                
                recurse_up_post(comment)
                    
            tag_count = a.comment_set.filter(tags__isnull=False).count()
            if tag_count % 2 == 0:
                from .tasks import generate_tags
                generate_tags.delay(a.id)

            response_dict = {'type': data['type'], 'dids': data['ids'], 'tag': data['tag'], 'user': username}
            if affected:
                response_dict['affected'] = 1
            else:
                response_dict['affected'] = 0
            return response_dict
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_hide_comment(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            id = data['id']
            explain = data['comment']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            comment = Comment.objects.get(id=id)
            if comment.is_replacement:
                action = 'delete_sum'
                self.recurse_down_post(comment)
                delete_node(comment.id)
                affected = False
            else:
                action = 'hide_comment'
                if not comment.hidden:
                    comment.hidden = True
                    comment.save()
                    affected = True
                else:
                    affected = False
            
            if affected:
                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action=action,
                                           explanation=explain)
                c = Comment.objects.get(id=id)
                h.comments.add(c)
                
                parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=a)
                if parent.count() > 0:
                    recurse_up_post(parent[0])

                a.comment_num = a.comment_num - 1
                a.percent_complete = count_article(a)
                a.last_updated = datetime.datetime.now()

                a.save()

            return {'d_id': data['id'], 'user': username, 'type': data['type']}
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_hide_comments(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            ids = data['ids']
            explain = data['comment']
            
            affected = Comment.objects.filter(id__in=ids, hidden=False).update(hidden=True)
            
            if affected > 0:
                
                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='hide_comments',
                                           explanation=explain)
                
                for id in ids:
                    c = Comment.objects.get(id=id)
                    h.comments.add(c)
                    
                    parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=a)
                    if parent.count() > 0:
                        recurse_up_post(parent[0])
                
                a.comment_num = a.comment_num - affected
                a.percent_complete = count_article(a)
                a.last_updated = datetime.datetime.now()
                a.save()

            return {'dids': data['ids'], 'user': username, 'type': data['type']}
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_hide_replies(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            id = data['id']
            explain = data['comment']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            c = Comment.objects.get(id=id)

            replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=a)
            
            affected = self.recurse_down_hidden(replies, 0)
            
            if affected > 0:
                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='hide_replies',
                                           explanation=explain)
                
                replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=a)
                for reply in replies:
                    h.comments.add(reply)
                
                recurse_up_post(c)
                
                ids = [reply.id for reply in replies]
                
                a.comment_num = a.comment_num - affected
                a.percent_complete = count_article(a)
                a.last_updated = datetime.datetime.now()
            
                a.save()
                
                return {'d_id': data['id'], 'user': username, 'type': data['type'], 'ids': ids}
            else:
                return {'user': username}
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_delete_comment_summary(self, data, username):
        try:
            article_id = self.article_id
            article = Article.objects.get(id=article_id)
            comment_id = data['id']
            explain = data['comment']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None

            comment = Comment.objects.get(id=comment_id)
            if not comment.is_replacement:
                comment.summary = ""
                comment.save()
                recurse_up_post(comment)
                h = History.objects.create(user=req_user,
                                           article=article,
                                           action='delete_comment_sum',
                                           explanation=explain)
                h.comments.add(comment)
                
                article.percent_complete = count_article(article)
                article.last_updated = datetime.datetime.now()
                article.save()
                
            return {'d_id': data['id'], 'user': username, 'type': data['type']}

        except Exception as e:
            print(e)
            return {'user': username}
