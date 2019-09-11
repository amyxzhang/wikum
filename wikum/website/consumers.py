import re
import json
import logging
from channels import Group
from channels.sessions import channel_session
from website.models import Article

log = logging.getLogger(__name__)

@channel_session
def ws_connect(message):
    # Extract the article from the message. This expects message.path to be of the
    # form /article/{label}/, and finds a Article if the message path is applicable,
    # and if the article exists. Otherwise, bails (meaning this is a some othersort
    # of websocket). So, this is effectively a version of _get_object_or_404.
    try:
        prefix, label = message['path'].decode('ascii').strip('/').split('/')
        if prefix != 'article':
            log.debug('invalid ws path=%s', message['path'])
            return
        article = Article.objects.get(label=label)
    except ValueError:
        log.debug('invalid ws path=%s', message['path'])
        return
    except Article.DoesNotExist:
        log.debug('ws article does not exist label=%s', label)
        return

    log.debug('article connect article=%s client=%s:%s', 
        article.label, message['client'][0], message['client'][1])
    
    # Need to be explicit about the channel layer so that testability works
    # This may be a FIXME?
    Group('article-'+label, channel_layer=message.channel_layer).add(message.reply_channel)

    message.channel_session['article'] = article.label

@channel_session
def ws_receive(message):
    # Look up the article from the channel session, bailing if it doesn't exist
    try:
        label = message.channel_session['article']
        article = Article.objects.get(label=label)
    except KeyError:
        log.debug('no article in channel_session')
        return
    except Article.DoesNotExist:
        log.debug('recieved message, buy article does not exist label=%s', label)
        return

    # Parse out a article message from the content text, bailing if it doesn't
    # conform to the expected message format.
    try:
        data = json.loads(message['text'])
    except ValueError:
        log.debug("ws message isn't json text=%s", text)
        return
    
    if set(data.keys()) != set(('handle', 'message')):
        log.debug("ws message unexpected format data=%s", data)
        return

    if data:
        log.debug('article message article=%s handle=%s message=%s', 
            article.label, data['handle'], data['message'])
        m = article.messages.create(**data)

        # See above for the note about Group
        Group('article-'+label, channel_layer=message.channel_layer).send({'text': json.dumps(m.as_dict())})

@channel_session
def ws_disconnect(message):
    try:
        label = message.channel_session['article']
        article = Article.objects.get(label=label)
        Group('article-'+label, channel_layer=message.channel_layer).discard(message.reply_channel)
    except (KeyError, Article.DoesNotExist):
        pass