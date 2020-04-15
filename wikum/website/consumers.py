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
from website.models import Article, Source, CommentRating, CommentAuthor, Permissions, Notification
from website.views import recurse_up_post, recurse_down_num_subtree, make_vector, get_summary, clean_parse
from website.engine import count_words_shown, count_article
from pinax.notifications.models import send, NoticeType

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
        # message['path'] = /ws/article/[article_name]/subtree
        self.article_id = self.scope['url_route']['kwargs']['article_id']
        self.group_name = 'article_%s' % self.article_id
        self.user_to_locked_nodes = {}
        self.subtree_users = []

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Release locks held by user
        username = self.scope["user"].username if self.scope["user"].is_authenticated else None
        ids = []
        if username in self.user_to_locked_nodes:
            ids = self.user_to_locked_nodes[username]
        message_ids = ids[:]
        data = {'to_lock': False, 'ids': ids, 'type': 'update_locks'}
        message = {'user': username, 'type': 'update_locks', 'ids': message_ids, 'to_lock': False}
        self.handle_update_locks(data, username)
        self.handle_update_drag({'to_lock': False, 'type': 'update_drag_locks'}, username)
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                'type': 'handle.data',
                'message': message
            }
        )
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
        user = self.scope["user"]
        reply_parents_mail = []
        # Parse out a article message from the content text, bailing if it doesn't
        # conform to the expected message format.
        try:
            data = json.loads(text_data)
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
                elif data_type == 'update_drag_locks':
                    message = self.handle_update_drag(data, username)
                elif data_type == 'summarize_comment':
                    message = self.handle_summarize_comment(data, username)
                elif data_type == 'summarize_selected':
                    message = self.handle_summarize_selected(data, username)
                elif data_type == 'summarize_comments':
                    message = self.handle_summarize_comments(data, username)
                elif data_type == 'move_comments':
                    message = self.handle_move_comments(data, username)
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
        if post.author and post.author.user and not post.author.user.is_anonymous and post.author.user != self.scope['user']:
            self.subtree_users.append(post.author.user)
        children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
        for child in children:
            child.summarized = True
            child.save()
            self.mark_children_summarized(child)

    def mark_children_unsummarized(self, post, children=None):
        if post.is_replacement:
            return
        else:
            post.summarized = False
        if not children:
            children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=self.article_id)
        for child in children:
            child.summarized = False
            child.save()
            self.mark_children_unsummarized(child)

    def recurse_down_post(self, post):
        children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=self.article_id)
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

    # for debugging purposes -- goes through and prints out each node's pointers
    def print_pointers(self, c):
        print("=========PRINT POINTERS=========")
        if c.is_replacement:
            print("This node's text:", c.summary)
        else:
            print("This node's text:", c.text)
        first_child = Comment.objects.filter(disqus_id=c.first_child, article=self.article_id)
        if first_child.count() > 0:
            first_child = first_child[0]
        else:
            first_child = None
        last_child = Comment.objects.filter(disqus_id=c.last_child, article=self.article_id)
        if last_child.count() > 0:
            last_child = last_child[0]
        else:
            last_child = None
        sibling_prev = Comment.objects.filter(disqus_id=c.sibling_prev, article=self.article_id)
        if sibling_prev.count() > 0:
            sibling_prev = sibling_prev[0]
        else:
            sibling_prev = None
        sibling_next = Comment.objects.filter(disqus_id=c.sibling_next, article=self.article_id)
        if sibling_next.count() > 0:
            sibling_next = sibling_next[0]
        else:
            sibling_next = None
        if first_child:
            text = first_child.summary if first_child.is_replacement else first_child.text
            print("This node's first child:", text)
        if last_child:
            text = last_child.summary if last_child.is_replacement else last_child.text
            print("This node's last child:", text)
        if sibling_prev:
            text = sibling_prev.summary if sibling_prev.is_replacement else sibling_prev.text
            print("This node's previous sibling:", text)
        if sibling_next:
            text = sibling_next.summary if sibling_next.is_replacement else sibling_next.text
            print("This node's next sibling:", text)

        parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=self.article_id)
        if parent.count() > 0:
            parent = parent[0]
        else:
            parent = Article.objects.get(id=self.article_id)
        print("Parent:", parent)
        first_child = Comment.objects.filter(disqus_id=parent.first_child, article=self.article_id)
        if first_child.count() > 0:
            first_child = first_child[0]
        else:
            first_child = None
        last_child = Comment.objects.filter(disqus_id=parent.last_child, article=self.article_id)
        if last_child.count() > 0:
            last_child = last_child[0]
        else:
            last_child = None
        if first_child:
            text = first_child.summary if first_child.is_replacement else first_child.text
            print("This node's parent's first child:", text)
        if last_child:
            text = last_child.summary if last_child.is_replacement else last_child.text
            print("This node's parent's last child:", text)

        print("=========END PRINT POINTERS=========")

    def handle_data(self, event):
        message = event['message']
        self.send(text_data=json.dumps(message))

    def create_notifs(self, recipients, label_type, article_id, owner_name, comment_id, req_user, message, content):
        notice = NoticeType.objects.get(label=label_type)
        url = '/visualization_flags?id=' + str(article_id) + '&owner=' + owner_name + '#comment_' + str(comment_id)
        from_user = 'Anonymous' if req_user == None else req_user.username
        for u in recipients:
            Notification.objects.create(recipient=u, notice_type=notice, sender=from_user, url=url, message=message, content=content)

    def truncate_notif_content(self, content, num_words=20, max_char_length=100):
        return (' '.join(content.split()[:num_words]))[:max_char_length] + '...'

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
                notif_users = []
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
                    author.save()
                new_id = random_with_N_digits(10)
                new_comment = None
                prior_last_child = None
                explanation = ''
                prior_last_child_id = None
                if data['type'] == 'new_node':
                    if article.last_child:
                        prior_last_child = Comment.objects.get(disqus_id=article.last_child)
                        prior_last_child_id = prior_last_child.disqus_id
                    new_comment = Comment.objects.create(article=article,
                                                         author=author,
                                                         is_replacement=False,
                                                         created_at=datetime.datetime.now(),
                                                         disqus_id=new_id,
                                                         text=comment,
                                                         sibling_prev=prior_last_child_id,
                                                         sibling_next=None,
                                                         summarized=False,
                                                         text_len=len(comment))
                    explanation = 'new comment'
                    if prior_last_child:
                        prior_last_child.sibling_next = new_id
                        prior_last_child.save()
                    # assumes always adds to end
                    article.last_child = new_id
                    if not article.first_child:
                        # first comment in article
                        article.first_child = new_id
                elif data['type'] == 'reply_comment':
                    id = data['id']
                    c = Comment.objects.get(id=id)
                    prior_last_child_id = None

                    if c.last_child:
                        prior_last_child = Comment.objects.get(disqus_id=c.last_child)
                        prior_last_child_id = prior_last_child.disqus_id
                    new_comment = Comment.objects.create(article=article,
                                                         author=author,
                                                         is_replacement=False,
                                                         created_at=datetime.datetime.now(),
                                                         reply_to_disqus=c.disqus_id,
                                                         disqus_id=new_id,
                                                         text=comment,
                                                         sibling_prev=prior_last_child_id,
                                                         sibling_next=None,
                                                         summarized=False,
                                                         text_len=len(comment),
                                                         import_order=c.import_order)
                    explanation = 'reply to comment'
                    if prior_last_child:
                        prior_last_child.sibling_next = new_id
                        prior_last_child.save()
                    # assumes always adds to end
                    c.last_child = new_id
                    if not c.first_child:
                        # first reply
                        c.first_child = new_id
                    c.save()
                    search_id = ',' + str(c.id) + ','
                    subscribed_users = User.objects.filter(wikumuser__subscribe_replies__contains=search_id)
                    if req_user != None:
                        subscribed_users = subscribed_users.exclude(id=req_user.id)
                    notif_dict = {"from_user": 'Anonymous' if req_user == None else req_user.username, "id": article_id, "owner": article.owner.username, "comment_id": new_comment.id, "content": self.truncate_notif_content(comment)}
                    message = notif_dict['from_user'] + ' Replied to Your Subscribed Comment'
                    self.create_notifs(subscribed_users, 'subscribed_reply', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
                    send(subscribed_users, "subscribed_reply", notif_dict)
                    current_parent = c
                    if current_parent.author and not current_parent.author.anonymous:
                        if current_parent.author.user and current_parent.author.user != user:
                            notif_users.append(current_parent.author.user)
                        else:
                            user_with_username = User.objects.filter(username=current_parent.author.username)
                            if user_with_username.count() > 0 and user_with_username[0] != user:
                                notif_users.append(user_with_username[0])

                    while current_parent.reply_to_disqus:
                        current_parent = Comment.objects.get(disqus_id=current_parent.reply_to_disqus)
                        if current_parent.author and not current_parent.author.anonymous:
                            if current_parent.author.user and current_parent.author.user != user:
                                notif_users.append(current_parent.author.user)
                            else:
                                user_with_username = User.objects.filter(username=current_parent.author.username)
                                if user_with_username.count() > 0 and user_with_username[0] != user:
                                    notif_users.append(user_with_username[0])
                    notif_dict = {"from_user": 'Anonymous' if req_user == None else req_user.username, "id": article_id, "owner": article.owner.username, "comment_id": new_comment.id, "content": self.truncate_notif_content(comment)}
                    notif_users_list = list(dict.fromkeys(notif_users))
                    message = notif_dict['from_user'] + ' Replied to Your Comment Thread'
                    self.create_notifs(notif_users_list, 'reply_in_thread', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
                    send(notif_users_list, "reply_in_thread", notif_dict)

                at_indices = [m.start() for m in re.finditer('@', comment)]
                parts = [comment[i:j] for i,j in zip(at_indices, at_indices[1:]+[None])]
                at_names = [part.split(' ')[0][1:] for part in parts if len(part.split(' ')) > 0]
                at_users = User.objects.filter(username__in=at_names)
                notif_dict = {"from_user": 'Anonymous' if req_user == None else req_user.username, "id": article_id, "owner": article.owner.username, "comment_id": new_comment.id, "content": self.truncate_notif_content(comment)}
                message = notif_dict['from_user'] + ' Mentioned You In A Comment'
                self.create_notifs(at_users, 'at_user', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
                send(at_users, "at_user", notif_dict)

                new_comment.save()
                action = data['type']
                
                recurse_up_post(new_comment)

                recurse_down_num_subtree(new_comment)

                # make_vector(new_comment, article)
                article.comment_num = article.comment_num + 1
                words_shown = count_words_shown(article)
                percent_complete = count_article(article)
                h = History.objects.create(user=req_user,
                                           article=article,
                                           action=action,
                                           explanation=explanation,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)
                h.comments.add(new_comment)
                article.percent_complete = percent_complete
                article.words_shown = words_shown
                article.last_updated = datetime.datetime.now()
                article.save()
                response_dict = {'comment': comment, 'last_updated': json.dumps(datetime.datetime.now(), indent=4, sort_keys=True, default=str), 'd_id': new_comment.id, 'author': req_username, 'type': data['type'], 'user': req_username}
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
                                               explanation="Add tag %s to a comment" % t.text,
                                               words_shown=article.words_shown,
                                               current_percent_complete=article.percent_complete)
                    h.comments.add(comment)
                    
                    article.last_updated = datetime.datetime.now()
                    article.save()
                    
                    recurse_up_post(comment)
                        
                tag_count = article.comment_set.filter(tags__isnull=False).count()
                if tag_count % 2 == 0:
                    from .tasks import generate_tags
                    generate_tags.delay(article_id)

                if affected:
                    response_dict = {'user': username, 'color': color, 'type': data['type'], 'd_id': data['id'], 'tag': data['tag'], 'did_str': data['did_str']}
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
                                               explanation='Add tag %s to comments' % t.text,
                                               words_shown=article.words_shown,
                                               current_percent_complete=article.percent_complete)
                    article.last_updated = datetime.datetime.now()
                    article.save()
                
                    for com in affected_comms:
                        recurse_up_post(com)
                        h.comments.add(com)
                    
                tag_count = article.comment_set.filter(tags__isnull=False).count()
                if tag_count % 2 == 0:
                    from .tasks import generate_tags
                    generate_tags.delay(article_id)
                    
                if len(affected_comms) > 0:
                    response_dict = {'user': username, 'color': color, 'type': data['type'], 'dids': data['ids'], 'tag': data['tag'], 'did_str': data['did_str']}
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
            if username not in self.user_to_locked_nodes:
                self.user_to_locked_nodes[username] = []
            for id in ids:
                if username is not 'Anonymous':
                    c = Comment.objects.get(id=id)
                    if data['to_lock']:
                        self.user_to_locked_nodes[username].append(id)
                        c.is_locked = True
                    else:
                        self.user_to_locked_nodes[username].remove(id)
                        c.is_locked = False
                    c.save()
                    recurse_up_post(c)
            res = {'user': username, 'type': data['type'], 'ids': data['ids'], 'to_lock': data['to_lock']}
            return res
        except Exception as e:
            print(e)
            return {'user': username}

    def handle_update_drag(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            unique_user_id = -1
            if 'unique_user_id' in data:
                unique_user_id = data['unique_user_id']
            if data['to_lock'] == False:
                enable_or_disable = 'enable'
                a.drag_locked = False
            else:
                if a.drag_locked:
                    return
                else:
                    enable_or_disable = 'disable'
                    a.drag_locked = True

            res = {'user': username, 'new_parent_did': data['new_parent_did'] if 'new_parent_did' in data else None, 'type': data['type'], 'unique_user_id': unique_user_id, 'enable': enable_or_disable}
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
                
            recurse_up_post(c)
            words_shown = count_words_shown(a)
            percent_complete = count_article(a)
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action=action,
                                       from_str=from_summary,
                                       to_str=summary,
                                       explanation=explanation,
                                       words_shown=words_shown,
                                       current_percent_complete=percent_complete)
            
            h.comments.add(c)
            a.percent_complete = percent_complete
            a.words_shown = words_shown
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
            # ids are ids of all selected
            ids = data['ids']
            # children are ids of top level selected
            children_ids = data['children']
            first_selected_id = data['first_selected']
            last_selected_id = data['last_selected']
            
            delete_nodes = data['delete_nodes']
            
            summary = data['comment']
            
            top_summary, bottom_summary = get_summary(summary)
            
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            # comments in order
            comments = [Comment.objects.get(id=comment_id) for comment_id in ids]
            children = [c for c in comments if c.id in children_ids]
            first_selected = Comment.objects.get(id=first_selected_id)
            last_selected = Comment.objects.get(id=last_selected_id)
            
            lowest_child = children[0]
            self.subtree_users = []
            for c in comments:
                c.summarized = True
                c.save()
                if c.import_order < lowest_child.import_order:
                    lowest_child = c
                if c.author and c.author.user and not c.author.user.is_anonymous and c.author.user != self.scope['user']:
                    self.subtree_users.append(c.author.user)
            new_id = random_with_N_digits(10)
            new_comment = Comment.objects.create(article=a,
                                                 is_replacement=True,
                                                 created_at=datetime.datetime.now(),
                                                 reply_to_disqus=first_selected.reply_to_disqus,
                                                 first_child = first_selected.disqus_id,
                                                 last_child = last_selected.disqus_id,
                                                 summarized=True,
                                                 summary=top_summary,
                                                 extra_summary=bottom_summary,
                                                 disqus_id=new_id,
                                                 points=first_selected.points,
                                                 text_len=len(summary),
                                                 import_order=lowest_child.import_order)
            for node in delete_nodes:
                self.delete_node(node, a)
            
            notif_users = self.subtree_users
            notif_dict = {"from_user": 'Anonymous' if req_user == None else req_user.username, "id": article_id, "owner": a.owner.username, "comment_id": new_comment.id,  "content": self.truncate_notif_content(top_summary)}
            notif_users_list = list(set(list(notif_users)))
            message = notif_dict['from_user'] + ' Summarized Your Comment'
            self.create_notifs(notif_users_list, 'summarize_your_comment', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
            send(notif_users_list, "summarize_your_comment", notif_dict)

            # Get the parent
            parent = Comment.objects.filter(disqus_id=first_selected.reply_to_disqus, article=a)
            if parent.count() > 0:
                parent = parent[0]
            else:
                parent = a
            all_children = Comment.objects.filter(reply_to_disqus=first_selected.reply_to_disqus, hidden=False, article=a)
            unselected_children = []
            current_node = next((c for c in all_children if c.disqus_id == parent.first_child), None)
            if current_node:
                if current_node not in children and current_node != new_comment:
                    unselected_children.append(current_node)
                while current_node and current_node.sibling_next:
                    current_node = next((c for c in all_children if c.disqus_id == current_node.sibling_next), None)
                    if current_node == last_selected:
                        break
                    else:
                        if current_node and current_node not in children and current_node != new_comment:
                            unselected_children.append(current_node)
            
            # Set the parent's last_child and first_child pointers
            if last_selected.disqus_id == parent.last_child:
                parent.last_child = new_id
            if first_selected.disqus_id == parent.first_child:
                if len(unselected_children) > 0:
                    parent.first_child = unselected_children[0].disqus_id
                else:
                    parent.first_child = new_id
            parent.save()
            last_selected_sib_next_list = Comment.objects.filter(disqus_id=last_selected.sibling_next)
            if last_selected_sib_next_list.count() > 0:
                last_selected_sib_next = last_selected_sib_next_list[0]
            else:
                last_selected_sib_next = None

            new_comment.sibling_next = last_selected.sibling_next
            if last_selected_sib_next:
                last_selected_sib_next.sibling_prev = new_id
                last_selected_sib_next.save()
                recurse_up_post(last_selected_sib_next)

            if len(unselected_children) == 0:
                new_comment.sibling_prev = None
            elif len(unselected_children) == 1:
                comment = unselected_children[0]
                comment.sibling_prev = None
                comment.sibling_next = new_id
                new_comment.sibling_prev = comment.disqus_id
                comment.save()
            else:
                for index, comment in enumerate(unselected_children):
                    if index == 0:
                        comment.sibling_prev = None
                        comment.sibling_next = unselected_children[index + 1].disqus_id
                    elif index == len(unselected_children) - 1:
                        comment.sibling_next = new_id
                        new_comment.sibling_prev = comment.disqus_id
                        comment.sibling_prev = unselected_children[index - 1].disqus_id
                    else:
                        comment.sibling_next = unselected_children[index + 1].disqus_id
                        comment.sibling_prev = unselected_children[index - 1].disqus_id
                    comment.save()
            # Set the sibling pointers in the selected comments
            for index, comment in enumerate(children):
                if index == 0:
                    comment.sibling_prev = None
                    if len(children) > 1:
                        comment.sibling_next = children[index + 1].disqus_id
                    else:
                        comment.sibling_next = None
                elif index == len(children) - 1:
                    comment.sibling_next = None
                    if len(children) > 1:
                        comment.sibling_prev = children[index - 1].disqus_id
                    else:
                        comment.sibling_prev = None
                else:
                    comment.sibling_prev = children[index - 1].disqus_id
                    comment.sibling_next = children[index + 1].disqus_id
                comment.reply_to_disqus = new_id
                comment.save()
            recurse_up_post(new_comment)
            recurse_down_num_subtree(new_comment)
            a.summary_num = a.summary_num + 1
            words_shown = count_words_shown(a)
            percent_complete = count_article(a)
            h = History.objects.create(user=req_user, 
                                       article=a,
                                       action='sum_selected',
                                       to_str=summary,
                                       explanation='initial summary of group of comments',
                                       words_shown=words_shown,
                                       current_percent_complete=percent_complete) 
                
            h.comments.add(new_comment)
            for c in comments:
                h.comments.add(c)
            a.percent_complete = percent_complete
            a.words_shown = words_shown
            a.last_updated = datetime.datetime.now()
            
            a.save()
            res = {'user': username, 'type': data['type'], 'last_updated': json.dumps(datetime.datetime.now(), indent=4, sort_keys=True, default=str), 'd_id': new_comment.id, 'lowest_d': first_selected_id, 'highest_d': last_selected_id, 'children': children_ids}
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
            percent_complete = a.percent_complete
            words_shown = a.words_shown

            if not c.is_replacement:
                new_id = random_with_N_digits(10);
                sibling_prev = c.sibling_prev if c.sibling_prev else None
                sibling_next = c.sibling_next if c.sibling_next else None
                new_comment = Comment.objects.create(article=a,
                                                     is_replacement=True,
                                                     created_at=datetime.datetime.now(),
                                                     reply_to_disqus=c.reply_to_disqus,
                                                     sibling_prev=sibling_prev,
                                                     sibling_next=sibling_next,
                                                     first_child=c.disqus_id,
                                                     last_child=c.disqus_id,
                                                     summary=top_summary,
                                                     summarized=True,
                                                     extra_summary=bottom_summary,
                                                     disqus_id=new_id,
                                                     points=c.points,
                                                     text_len=len(summary),
                                                     import_order=c.import_order)

                parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=a)
                sibling_prev_node = None
                sibling_next_node = None
                if sibling_prev:
                    sibling_prev_node = Comment.objects.get(disqus_id=sibling_prev, article=a)
                if sibling_next:
                    sibling_next_node = Comment.objects.get(disqus_id=sibling_next, article=a)
                if parent:
                    parent = parent[0]
                else:
                    parent = a
                if sibling_prev:
                    sibling_prev_node.sibling_next = new_id
                    sibling_prev_node.save()
                else:
                    # c was the first child; update to new_comment
                    parent.first_child = new_id
                if sibling_next:
                    sibling_next_node.sibling_prev = new_id
                    sibling_next_node.save()
                else:
                    # c was the last child; update to new_comment
                    parent.last_child = new_id
                c.reply_to_disqus = new_id
                c.sibling_prev = None
                c.sibling_next = None
                c.save()
                parent.save()

                d_id = new_comment.id

                self.subtree_users = []
                self.mark_children_summarized(new_comment)
                notif_users = self.subtree_users
                notif_dict = {"from_user": 'Anonymous' if req_user == None else req_user.username, "id": article_id, "owner": a.owner.username, "comment_id": new_comment.id, "content": self.truncate_notif_content(top_summary)}
                notif_users_list = list(set(list(notif_users)))
                message = notif_dict['from_user'] + ' Summarized Your Comment'
                self.create_notifs(notif_users_list, 'summarize_your_comment', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
                send(notif_users_list, "summarize_your_comment", notif_dict)

                recurse_up_post(new_comment)

                recurse_down_num_subtree(new_comment)

                words_shown = count_words_shown(a)
                percent_complete = count_article(a)
                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='sum_nodes',
                                           to_str=summary,
                                           explanation='initial summary of subtree',
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)
                h.comments.add(new_comment)
                
            else:
                from_summary = c.summary + '\n----------\n' + c.extra_summary
                c.summary = top_summary
                c.extra_summary=bottom_summary
                c.save()
                
                d_id = c.id
                
                new_comment = c
                new_comment.created_at = datetime.datetime.now()
                words_shown = count_words_shown(a)
                h = History.objects.create(user=req_user, 
                               article=a,
                               action='edit_sum_nodes',
                               from_str=from_summary,
                               to_str=summary,
                               explanation='edit summary of subtree',
                               words_shown=words_shown,
                               current_percent_complete=a.percent_complete)
                recurse_down_num_subtree(new_comment)
                recurse_up_post(c)
                hist = c.history_set.filter(action__contains='sum')
                editors = set()
                for h in hist:
                    if h.user and h.user != req_user:
                        editors.add(h.user)

                notif_dict = {"from_user": 'Anonymous' if req_user == None else req_user.username, "id": article_id, "owner": a.owner.username, "comment_id": c.id, "content": self.truncate_notif_content(top_summary)}
                notif_users_list = list(editors)
                message = notif_dict['from_user'] + ' Edited a Summary You Contributed To'
                self.create_notifs(notif_users_list, 'summary_edit', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
                send(notif_users_list, "summary_edit", notif_dict)

                search_id = ',' + str(c.id) + ','
                subscribed_users = User.objects.filter(wikumuser__subscribe_edit__contains=search_id)
                if req_user != None:
                    subscribed_users = subscribed_users.exclude(id=req_user.id)
                message = notif_dict['from_user'] + ' Edited a Summary You Are Subscribed To'
                self.create_notifs(subscribed_users, 'subscribed_edit', notif_dict['id'], notif_dict['owner'], notif_dict['comment_id'], req_user, message, notif_dict['content'])
                send(subscribed_users, "subscribed_edit", notif_dict)

            for node in delete_nodes:
                new_h = History.objects.create(user=req_user,
                               article=a,
                               action='delete_node',
                               from_str=node,
                               to_str=c.id,
                               explanation='promote summary',
                               words_shown=a.words_shown,
                               current_percent_complete=a.percent_complete)
                self.delete_node(node, a)

            h.comments.add(c)
            if not c.is_replacement:
                a.summary_num = a.summary_num + 1
                a.percent_complete = percent_complete
                a.words_shown = words_shown
            a.last_updated = datetime.datetime.now()
            a.save()
            res = {'user': username, 'type': data['type'], 'last_updated': json.dumps(datetime.datetime.now(), indent=4, sort_keys=True, default=str), 'd_id': new_comment.id, 'node_id': data['node_id'], 'orig_did': data['id']}
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

    def find_nearest_summary(self, comment, article):
        if comment == article:
            return None
        if comment.is_replacement:
            return comment
        current = comment
        nearest_sum = None
        while current.reply_to_disqus:
            c = Comment.objects.get(disqus_id=current.reply_to_disqus)
            if c.is_replacement:
                nearest_sum = c
                break
            current = c
        return nearest_sum


    def handle_move_comments(self, data, username):
        try:
            new_parent_id = data['new_parent']
            node_id = data['node']
            sibling_prev = data['sibling_before']
            sibling_next = data['sibling_after']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            
            comment = Comment.objects.get(id=node_id)
            article = Article.objects.get(id=self.article_id)
            new_comment_prev = None
            new_comment_next = None
            if sibling_prev != 'None':
                new_comment_prev = Comment.objects.get(id=sibling_prev, article=article)
            else:
                new_comment_prev = None
            if sibling_next != 'None':
                new_comment_next = Comment.objects.get(id=sibling_next, article=article)
            else:
                new_comment_next = None

            if sibling_prev == 'None' and new_comment_next != None:
                if new_comment_next.sibling_prev:
                    new_comment_prev = Comment.objects.get(disqus_id=new_comment_next.sibling_prev, article=article)
            if sibling_next == 'None' and new_comment_prev != None:
                if new_comment_prev.sibling_next:
                    new_comment_next = Comment.objects.get(disqus_id=new_comment_prev.sibling_next, article=article)

            # Set child and sibling pointers of surrounding nodes in original location
            old_parent = None
            if comment.reply_to_disqus:
                old_parent = Comment.objects.get(disqus_id=comment.reply_to_disqus, article=article)
            else:
                old_parent = article

            new_parent = None
            if new_parent_id == 'article':
                new_parent = article
            else:
                new_parent = Comment.objects.get(id=new_parent_id, article=article)

            if old_parent.first_child == comment.disqus_id:
                old_parent.first_child = comment.sibling_next
            if old_parent.last_child == comment.disqus_id:
                old_parent.last_child = comment.sibling_prev
            old_parent.save()

            # old comment siblings
            comment_prev = None
            comment_next = None
            if comment.sibling_prev:
                comment_prev = Comment.objects.filter(disqus_id=comment.sibling_prev, article=article)
                if comment_prev.count() > 0:
                    comment_prev = comment_prev[0]
            if comment.sibling_next:
                comment_next = Comment.objects.filter(disqus_id=comment.sibling_next, article=article)
                if comment_next.count() > 0:
                    comment_next = comment_next[0]

            # Set child and sibling pointers of surrounding nodes in new location
            if new_parent == old_parent:
                if new_comment_prev != None and new_comment_prev == comment_next:
                    # Move above comment below
                    self.set_sibling_pointers(old_parent, old_parent, comment, comment_next, new_comment_next, comment_prev, comment_next, article)
                elif new_comment_next != None and new_comment_next == comment_prev:
                    # Move below comment above
                    self.set_sibling_pointers(old_parent, old_parent, comment, new_comment_prev, comment_prev, comment_prev, comment_next, article)
                else:
                    self.set_sibling_pointers(old_parent, old_parent, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article)
            elif comment_prev and comment_prev == new_parent:
                self.set_sibling_pointers(old_parent, comment_prev, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article)
            elif comment_next and comment_next == new_parent:
                self.set_sibling_pointers(old_parent, comment_next, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article)
            elif new_comment_prev != None and old_parent != article and int(new_comment_prev.id) == int(old_parent.id):
                self.set_sibling_pointers(old_parent, new_parent, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article, True, False)
            elif new_comment_next != None and old_parent != article and int(new_comment_next.id) == int(old_parent.id):
                self.set_sibling_pointers(old_parent, new_parent, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article, False, True) 
            else:
                self.set_sibling_pointers(old_parent, new_parent, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article)
            
            old_nearest_sum = self.find_nearest_summary(old_parent, article)
            new_nearest_sum = self.find_nearest_summary(new_parent, article)
            if not comment.is_replacement and old_nearest_sum != new_nearest_sum:
                self.mark_children_unsummarized(comment)
            recurse_down_num_subtree(comment)
            article.last_updated = datetime.datetime.now()
            article.save()
            
            comment.save()
            comment_text = comment.summary if comment.is_replacement else comment.text
            old_parent_text = ''
            if old_parent == article:
                old_parent_text = article.title
            else:
                old_parent_text = old_parent.summary if old_parent.is_replacement else old_parent.text
            new_parent_text = ''
            if new_parent == article:
                new_parent_text = article.title
            else:
                new_parent_text = new_parent.summary if new_parent.is_replacement else new_parent.text
            

            words_shown = count_words_shown(article)
            percent_complete = count_article(article)

            h = History.objects.create(user=req_user, 
                                           article=article,
                                           action='move_comment',
                                           from_str=old_parent_text,
                                           to_str=new_parent_text,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete,
                                           explanation='Move comment: ' + comment_text)

            h.comments.add(comment)
            article.percent_complete = percent_complete
            article.words_shown = words_shown
            article.last_updated = datetime.datetime.now()
            article.save()
            
            if old_parent and old_parent != article:
                recurse_up_post(old_parent)
                h.comments.add(old_parent)

            recurse_up_post(comment)
            old_parent_id = 'article' if old_parent == article else old_parent.id
            prev_sib_id = sibling_prev if sibling_prev else 'None'
            res = {'position': data['position'], 'user': username, 'new_parent_id': new_parent_id, 'node_id': node_id, 'old_parent_id': old_parent_id, 'type': data['type']}
            return res
        
        except Exception as e:
            print(e)
            import traceback
            print(traceback.format_exc())
            return {'user': username}

    def set_sibling_pointers(self, old_parent, new_parent, comment, new_comment_prev, new_comment_next, comment_prev, comment_next, article, is_newsibprev_oldparent=False, is_newsibnext_oldparent=False):
        if comment_prev:
            comment_prev.sibling_next = comment.sibling_next
            comment_prev.save()
            recurse_up_post(comment_prev)
        if comment_next:
            comment_next.sibling_prev = comment.sibling_prev
            comment_next.save()
            recurse_up_post(comment_next)

        if new_comment_prev == None:
            comment.sibling_prev = None
            new_parent.first_child = comment.disqus_id
        else:
            if is_newsibprev_oldparent:
                comment.sibling_prev = old_parent.disqus_id
                old_parent.sibling_next = comment.disqus_id
                old_parent.save()
            else:
                comment.sibling_prev = new_comment_prev.disqus_id
                new_comment_prev.sibling_next = comment.disqus_id
                new_comment_prev.save()
                recurse_up_post(new_comment_prev)
        if new_comment_next == None:
            comment.sibling_next = None
            new_parent.last_child = comment.disqus_id
        else:
            if is_newsibnext_oldparent:
                comment.sibling_next = old_parent.disqus_id
                old_parent.sibling_prev = comment.disqus_id
                old_parent.save()
            else:
                comment.sibling_next = new_comment_next.disqus_id
                new_comment_next.sibling_prev = comment.disqus_id
                new_comment_next.save()
                recurse_up_post(new_comment_next)
        if new_parent == article:
            comment.reply_to_disqus = None
        else:
            comment.reply_to_disqus = new_parent.disqus_id
        new_parent.save()
        comment.save()
        if new_parent != article:
            recurse_up_post(new_parent)
            recurse_down_num_subtree(new_parent)

    def handle_delete_tags(self, data, username):
        article_id = self.article_id
        a = Article.objects.get(id=article_id)
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
                                           explanation="Deleted tag %s from comments" % tag,
                                           words_shown=a.words_shown,
                                           current_percent_complete=a.percent_complete)
                for comment in affected_comments:
                    h.comments.add(comment)
                
                a.last_updated = datetime.datetime.now()
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

    def remove_summarized(self, post):
        post.summarized = False
        children = Comment.objects.filter(reply_to_disqus=post.disqus_id, article=post.article)
        for child in children:
            if not child.is_replacement:
                child.summarized = False
                child.save()
                self.remove_summarized(child)

    def delete_node(self, did, article):
        try:
            c = Comment.objects.get(id=did)
            
            if c.is_replacement:
                self.remove_summarized(c)
                parent = Comment.objects.filter(disqus_id=c.reply_to_disqus, article=article)
                parent_node = parent
                
                if parent.count() > 0:
                    parent_id = parent[0].disqus_id
                    parent_node = parent[0]
                else:
                    parent_id = None
                    parent_node = article
                
                children = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=article)
                if parent_node.last_child == c.disqus_id:
                    parent_node.last_child = c.last_child
                if parent_node.first_child == c.disqus_id:
                    parent_node.first_child = c.first_child
                parent_node.save()
                first = Comment.objects.get(disqus_id=parent_node.first_child)

                first_child = Comment.objects.filter(disqus_id=c.first_child, article=article)
                if first_child.count() > 0:
                    first_child = first_child[0]
                else:
                    first_child = None
                last_child = Comment.objects.filter(disqus_id=c.last_child, article=article)
                if last_child.count() > 0:
                    last_child = last_child[0]
                else:
                    last_child = None
                if first_child == last_child:
                    first_child = last_child
                sibling_prev = Comment.objects.filter(disqus_id=c.sibling_prev, article=article)
                if sibling_prev.count() > 0:
                    sibling_prev = sibling_prev[0]
                else:
                    sibling_prev = None
                sibling_next = Comment.objects.filter(disqus_id=c.sibling_next, article=article)
                if sibling_next.count() > 0:
                    sibling_next = sibling_next[0]
                else:
                    sibling_next = None
                if first_child:
                    first_child.sibling_prev = c.sibling_prev
                    first_child.save()
                if last_child:
                    last_child.sibling_next = c.sibling_next
                    last_child.save()
                if c.sibling_prev is not None:
                    sibling_prev.sibling_next = c.first_child
                    sibling_prev.save()
                    recurse_up_post(sibling_prev)
                if c.sibling_next is not None:
                    sibling_next.sibling_prev = c.last_child
                    sibling_next.save()
                    recurse_up_post(sibling_next)

                for child in children:
                    child.reply_to_disqus = parent_id
                    child.json_flatten = ''
                    recurse_up_post(child)
                    child.save()
                c.delete()
                
                if parent.count() > 0:
                    recurse_up_post(parent_node)
                    recurse_down_num_subtree(parent_node)

                parent_node.save()
                article.summary_num = article.summary_num - 1
                article.save()
        except Exception as e:
            print(e)

    def handle_hide_comment(self, data, username):
        try:
            article_id = self.article_id
            a = Article.objects.get(id=article_id)
            id = data['id']
            explain = data['comment']
            req_user = self.scope["user"] if self.scope["user"].is_authenticated else None
            comment = Comment.objects.get(id=id)

            parent = Comment.objects.filter(disqus_id=comment.reply_to_disqus, article=a)
            parent_node = parent
            
            if parent.count() > 0:
                parent_node = parent[0]
            else:
                parent_node = a
            
            if comment.is_replacement:
                action = 'delete_sum'
                content = comment.summary
                first = Comment.objects.get(disqus_id=parent_node.first_child)
                self.recurse_down_post(comment)
                self.delete_node(comment.id, a)
                words_shown = count_words_shown(a)
                percent_complete = count_article(a)
                h = History.objects.create(user=req_user,
                                           article=a,
                                           action=action,
                                           explanation=explain,
                                           from_str=content,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)
                a.percent_complete = percent_complete
                a.words_shown = words_shown
                a.last_updated = datetime.datetime.now()
                a.save()
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
                parent = Comment.objects.filter(disqus_id=comment.reply_to_disqus, article=a)
                parent_node = a
                if parent.count() > 0:
                    parent_node = parent[0]
                if parent_node and parent_node.last_child == comment.disqus_id:
                    parent_node.last_child = comment.sibling_prev
                    parent_node.save()
                if parent_node and parent_node.first_child == comment.disqus_id:
                    parent_node.first_child = comment.sibling_next
                    parent_node.save()
                if comment.sibling_prev:
                    sibling_prev = Comment.objects.get(disqus_id=comment.sibling_prev, article=a)
                    sibling_prev.sibling_next = comment.sibling_next
                    sibling_prev.save()
                if comment.sibling_next:
                    sibling_next = Comment.objects.get(disqus_id=comment.sibling_next, article=a)
                    sibling_next.sibling_prev = comment.sibling_prev
                    sibling_next.save()
                if parent.count() > 0:
                    recurse_up_post(parent_node)

                a.comment_num = a.comment_num - 1
                words_shown = count_words_shown(a)
                percent_complete = count_article(a)
                h = History.objects.create(user=req_user,
                                           article=a,
                                           action=action,
                                           explanation=explain,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)
                h.comments.add(comment)
                a.percent_complete = percent_complete
                a.words_shown = words_shown
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
            children_ids = data['children']
            explain = data['comment']
            first_selected_id = data['first_selected']
            last_selected_id = data['last_selected']
            first_selected = Comment.objects.get(id=first_selected_id)
            last_selected = Comment.objects.get(id=last_selected_id)
            parent = Comment.objects.filter(disqus_id=first_selected.reply_to_disqus, article=a)
            if parent.count() > 0:
                parent = parent[0]
            else:
                parent = a
            comments = [Comment.objects.get(id=comment_id) for comment_id in ids]
            children = [c for c in comments if c.id in children_ids]

            all_children = Comment.objects.filter(reply_to_disqus=first_selected.reply_to_disqus, hidden=False, article=a)
            unselected_children = []
            current_node = next((c for c in all_children if c.disqus_id == parent.first_child), None)
            if current_node:
                if current_node not in children:
                    unselected_children.append(current_node)
                while current_node and current_node.sibling_next:
                    current_node = next((c for c in all_children if c.disqus_id == current_node.sibling_next), None)
                    if current_node and current_node not in children:
                        unselected_children.append(current_node)

            affected = Comment.objects.filter(id__in=ids, hidden=False).update(hidden=True)
            
            if affected > 0:
                words_shown = count_words_shown(a)
                percent_complete = count_article(a)

                # Set the parent's last_child and first_child pointers
                if first_selected.disqus_id == parent.first_child:
                    if len(unselected_children) > 0:
                        parent.first_child = unselected_children[0].disqus_id
                    else:
                        parent.first_child = None
                    
                if last_selected.disqus_id == parent.last_child:
                    if len(unselected_children) > 0:
                        parent.last_child = unselected_children[-1].disqus_id
                    else:
                        parent.last_child = None
                parent.save()

                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='hide_comments',
                                           explanation=explain,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)

                # Set the sibling pointers of the siblings of the deleted comments
                if len(unselected_children) == 1:
                    comment = unselected_children[0]
                    comment.sibling_prev = None
                    comment.sibling_next = None
                    comment.save()
                else:
                    for index, comment in enumerate(unselected_children):
                        if index == 0:
                            comment.sibling_prev = None
                            comment.sibling_next = unselected_children[index + 1].disqus_id
                        elif index == len(unselected_children) - 1:
                            comment.sibling_next = None
                            comment.sibling_prev = unselected_children[index - 1].disqus_id
                        else:
                            comment.sibling_next = unselected_children[index + 1].disqus_id
                            comment.sibling_prev = unselected_children[index - 1].disqus_id
                        comment.save()

                for comment in comments:
                    h.comments.add(comment)
                    parent = Comment.objects.filter(disqus_id=comment.reply_to_disqus, article=a)
                    if parent.count() > 0:
                        recurse_up_post(parent[0])
                
                a.comment_num = a.comment_num - affected
                a.percent_complete = percent_complete
                a.words_shown = words_shown
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
                words_shown = count_words_shown(a)
                percent_complete = count_article(a)
                c.first_child = None
                c.last_child = None
                c.save()
                h = History.objects.create(user=req_user, 
                                           article=a,
                                           action='hide_replies',
                                           explanation=explain,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)
                replies = Comment.objects.filter(reply_to_disqus=c.disqus_id, article=a)
                for reply in replies:
                    h.comments.add(reply)
                
                recurse_up_post(c)
                
                ids = [reply.id for reply in replies]
                
                a.comment_num = a.comment_num - affected
                a.percent_complete = percent_complete
                a.words_shown = words_shown
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
                words_shown = count_words_shown(article)
                percent_complete = count_article(article)
                h = History.objects.create(user=req_user,
                                           article=article,
                                           action='delete_comment_sum',
                                           explanation=explain,
                                           words_shown=words_shown,
                                           current_percent_complete=percent_complete)

                h.comments.add(comment)
                
                article.percent_complete = percent_complete
                article.words_shown = words_shown
                article.last_updated = datetime.datetime.now()
                article.save()
                
            return {'d_id': data['id'], 'user': username, 'type': data['type']}

        except Exception as e:
            print(e)
            return {'user': username}
