Formats text following the MediaWiki (http://meta.wikimedia.org/wiki/Help:Editing) syntax.

Usage
-----

To return HTML from Wiki::

	from wikimarkup import parse

	html = parse(text[, show_toc=True])

To return HTML without certain "annoying" (TODO: define annoying) elements, such as headings::

	from wikimarkup import parselite

	parselite(text)

Adding New Tags
---------------

You can add new tags with the `registerTagHook` method.::

	from wikimarkup import registerTagHook, parse
	import cgi
	
	def blockquoteTagHook(parser_env, body, attributes={}):
	    """<quote[ cite="Person"]>A paragraph of text.</quote>"""
	    text = ['<blockquote>']
	    if 'cite' in attributes:
	        text.append('<cite>%s</cite>' % (cgi.escape(attributes['cite']),))
	    text.append(parse(body.strip()))
	    text.append('</blockquote>')
	    return u'\n'.join(text)
	registerTagHook('quote', blockquoteTagHook)

Adding Internal Links
---------------------

You can support [[internal links]] with the `registerInternalLinkHook`
method.  There is no default handling for internal links.  If no hook
handles the link, it will appear unchanged in the output.  An internal
link may have a `namespace:` prefix.  Hooks are registered per namespace,
with 'None' for unprefixed links:

    def internalLinkHook(parser_env, namespace, body):
       ...
       return replacement

    registerInternalLinkHook(None, internalLinkHook)  # called for [[link]]
    registerInternalLinkHook('Wikipedia', hook) # called for [[Wikipedia: Link]]
    registerInternalLinkHook(':en', hook)       # called for [[:en:link]
    registerInternalLinkHook(':', hook)         # called for [[:any:link]]
    registerInternalLinkHook('*', hook)         # called for [[anything]]

Examples:

    from wikimarkup import parse, registerInternalLinkHook

    def wikipediaLinkHook(parser_env, namespace, body):
	# namespace is going to be 'Wikipedia'
	(article, pipe, text) = body.partition('|')
	href = article.strip().capitalize().replace(' ', '_')
	text = (text or article).strip()
	return '<a href="http://en.wikipedia.org/wiki/%s">%s</a>' % (href, text)

    registerInternalLinkHook('Wikipedia', wikipediaLinkHook)

    print parse("[[Wikipedia:public transport|public transportation]]")
    print parse("[[Wikipedia: bus]]")

    import settings
    from pytils.translit import slugify
    from blog.models import Post

    def byteflowLinkHook(parser_env, namespace, body):
	(article, pipe, text) = body.partition('|')
	slug = slugify(article.strip())
	text = (text or article).strip()
	try:
	    post = Post.objects.get(slug=slug)
	    href = post.get_absolute_url()
	except Post.DoesNotExist:
	    href = '#'
	return '<a href="%s">%s</a>' % (href, text)

    registerInternalLinkHook(None, byteflowLinkHook)

    parse("[[Blog post title]]")
