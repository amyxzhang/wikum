from channels.staticfiles import StaticFilesConsumer
from website.consumers import ws_connect, ws_receive, ws_disconnect

channel_routing = {
    # This makes Django serve static files from settings.STATIC_URL, similar
    # to django.views.static.serve. This isn't ideal (not exactly production
    # quality) but it works for a minimal example.
    'http.request': StaticFilesConsumer(),

    # Wire up websocket channels to our consumers:
    'websocket.connect': ws_connect,
    'websocket.receive': ws_receive,
    'websocket.disconnect': ws_disconnect,
}