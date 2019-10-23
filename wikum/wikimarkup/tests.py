import unittest

from .parser import parse, Parser


class WikimarkupTestCase(unittest.TestCase):
    def testHeadings(self):
        """
        Test the parsing of all heading levels
        """
        text = "=heading1="
        self.assertEqual(parse(text), '<h1 id="w_heading1">heading1</h1>')

        text = "==heading2=="
        self.assertEqual(parse(text), '<h2 id="w_heading2">heading2</h2>')

        text = """=heading1=\n==heading2==\n===heading3===\n====heading4====\n=====heading5=====\n======heading6======"""
        assumed = """<div id="toc"><h2>Table of Contents</h2><ul><li class="toclevel-1"><a href="#w_heading1"><span class="tocnumber">1</span> <span class="toctext">heading1</span></a><ul><li class="toclevel-2"><a href="#w_heading2"><span class="tocnumber">1.1</span> <span class="toctext">heading2</span></a><ul><li class="toclevel-3"><a href="#w_heading3"><span class="tocnumber">1.1.1</span> <span class="toctext">heading3</span></a><ul><li class="toclevel-4"><a href="#w_heading4"><span class="tocnumber">1.1.1.1</span> <span class="toctext">heading4</span></a></li><li class="toclevel-5"><a href="#w_heading5"><span class="tocnumber">1.1.1.1.1</span> <span class="toctext">heading5</span></a></li><li class="toclevel-6"><a href="#w_heading6"><span class="tocnumber">1.1.1.1.1.1</span> <span class="toctext">heading6</span></a></li></ul></li></ul></li></ul></li></ul></div><h1 id="w_heading1">heading1</h1>\n<h2 id="w_heading2">heading2</h2>\n<h3 id="w_heading3">heading3</h3>\n<h4 id="w_heading4">heading4</h4>\n<h5 id="w_heading5">heading5</h5>\n<h6 id="w_heading6">heading6</h6>"""
        self.assertEqual(parse(text), assumed)

    def testLinks(self):
        """
        Test the parsing of all link formats
        """
        text = "[http://mydomain.com/ mydomain.com]"
        self.assertEqual(parse(text), '<p><a href="http://mydomain.com/">mydomain.com</a>\n</p>')

        text = "[http://mydomain.com/]"
        self.assertEqual(parse(text), '<p><a href="http://mydomain.com/">http://mydomain.com/</a>\n</p>')

        text = "[mydomain.com/]"
        self.assertEqual(
            parse(text),
            '<p>[<a href="http://mydomain.com/">mydomain.com/</a>]\n</p>')

        text = "[/hello/world]"
        self.assertEqual(parse(text), '<p><a href="/hello/world">/hello/world</a>\n</p>')

    def testNofollowLinks(self):
        """
        Test the parsing with nofollow set to True.
        """
        text = 'http://mydomain.com/test'
        expected = '<p><a href="http://mydomain.com/test" rel="nofollow">http://mydomain.com/test</a>\n</p>'
        parsed = parse(text, nofollow=True)
        try:
            self.assertEqual(parsed, expected)
        except AssertionError:
            expected = ('<p><a rel="nofollow" href="http://mydomain.com/test">'
                        'http://mydomain.com/test</a>\n</p>')
            self.assertEqual(parsed, expected)

    def testStyles(self):
        """
        Test the parsing of all styles, including italic and bold
        """
        text = "'''hey''' dude"
        self.assertEqual(parse(text), '<p><strong>hey</strong> dude\n</p>')

        text = "'''hey''' ''dude''"
        self.assertEqual(parse(text), '<p><strong>hey</strong> <em>dude</em>\n</p>')

        text = "''hey'' dude"
        self.assertEqual(parse(text), '<p><em>hey</em> dude\n</p>')

        text = "'''''hey dude'''''"
        self.assertEqual(parse(text), '<p><em><strong>hey dude</strong></em>\n</p>')

        text = "'''''hey'' dude'''"
        self.assertEqual(parse(text), '<p><strong><em>hey</em> dude</strong>\n</p>')

    def testParagraphs(self):
        """
        Test the parsing of newlines into paragraphs and linebreaks
        """
        text = "hello\nhow are you\n\ngoodbye"
        self.assertEqual(parse(text), '<p>hello\nhow are you\n</p><p>goodbye\n</p>')

        text = "hello<br />how are you\n\ngoodbye"
        self.assertEqual(parse(text), '<p>hello<br>how are you\n</p><p>goodbye\n</p>')

    def testSafeHTML(self):
        """
        Test the stripping of unsafe HTML code
        """
        text = "<script>alert('hi');</script>"
        self.assertEqual(parse(text), '<p>&lt;script&gt;alert(\'hi\');&lt;/script&gt;\n</p>')

        text = '<form method="post">Hi</form>'
        self.assertEqual(parse(text), '<p>&lt;form method="post"&gt;Hi&lt;/form&gt;\n</p>')

    def testLists(self):
        """
        Test formatting ordered and unordered lists
        """
        text = "* hello\n* world\n* list"
        self.assertEqual(parse(text), '<ul><li> hello\n</li><li> world\n</li><li> list\n</li></ul>')

        text = "# hello\n# world\n# list"
        self.assertEqual(parse(text), '<ol><li> hello\n</li><li> world\n</li><li> list\n</li></ol>')

        text = "* hello\n* world\n# list\n* fun\n** isnt it\n*# yep"
        self.assertEqual(parse(text), '<ul><li> hello\n</li><li> world\n</li></ul>\n<ol><li> list\n</li></ol>\n<ul><li> fun\n<ul><li> isnt it\n</li></ul>\n<ol><li> yep\n</li></ol>\n</li></ul>')

    def testMixed(self):
        """
        Test many formatting methods together
        """
        text = """=My Heading=\n* here\n* is\n* a\n* [http://mydomain.com list]\n==Subheading==\n==show me a toc==\n===pretty please==="""
        assumed = '<div id="toc"><h2>Table of Contents</h2><ul><li class="toclevel-1"><a href="#w_my-heading"><span class="tocnumber">1</span> <span class="toctext">My Heading</span></a><ul><li class="toclevel-2"><a href="#w_subheading"><span class="tocnumber">1.1</span> <span class="toctext">Subheading</span></a></li><li class="toclevel-2"><a href="#w_show-me-a-toc"><span class="tocnumber">1.2</span> <span class="toctext">show me a toc</span></a><ul><li class="toclevel-3"><a href="#w_pretty-please"><span class="tocnumber">1.2.1</span> <span class="toctext">pretty please</span></a></li></ul></li></ul></li></ul></div><h1 id="w_my-heading">My Heading</h1>\n<ul><li> here\n</li><li> is\n</li><li> a\n</li><li> <a href="http://mydomain.com">list</a>\n</li></ul>\n<h2 id="w_subheading">Subheading</h2>\n<h2 id="w_show-me-a-toc">show me a toc</h2>\n<h3 id="w_pretty-please">pretty please</h3>'
        self.assertEqual(parse(text), assumed)

    def testCommentsNotRemoved(self):
        """
        Comments are removed.
        """
        text = '<!-- This is a comment. -->'
        assumed = '<p><!-- This is a comment. -->\n</p>'
        self.assertEqual(parse(text), assumed)

        text = ('<!-- Comment\n\n\n= Heading =\n'
                'Firefox has <em>hidden</em> <!-- <strong>settings</strong>\n'
                'more \n-->\n\n# follow\n# by\n\n= Another heading =')
        assumed =  ('<p><!-- Comment\n</p><p><br />\n</p>\n'
                    '<h1 id="w_heading">Heading</h1>\n<p>Firefox has '
                    '<em>hidden</em> <!-- <strong>settings</strong>\nmore \n'
                    '--&gt;\n</p>\n<ol><li> follow\n</li><li> by\n</li></ol>'
                    '\n<h1 id="w_another-heading">Another heading</h1>--></p>')
        self.assertEqual(parse(text), assumed)

    def testLessThanBracket(self):
        """
        Make sure strings like "<- test" aren't removed
        """
        text = '<- test'
        assumed = '<p>&lt;- test\n</p>'
        self.assertEqual(parse(text), assumed)

        text = '<- <span>some text</span>'
        assumed = '<p>&lt;- <span>some text</span>\n</p>'
        self.assertEqual(parse(text), assumed)

        text = '<- <span>some text</span> ->'
        assumed = '<p>&lt;- <span>some text</span> -&gt;\n</p>'
        self.assertEqual(parse(text), assumed)

        text = '<- <->'
        assumed = '<p>&lt;- &lt;-&gt;\n</p>'
        self.assertEqual(parse(text), assumed)

        text = '< <script type="text/javascript">alert("evil")</script>'
        assumed = '<p>&lt; &lt;script type="text/javascript"&gt;alert("evil")&lt;/script&gt;\n</p>'
        self.assertEqual(parse(text), assumed)

        text = '<> <a href="javascript:alert(\'boo!\')">click here</a>'
        assumed = '<p>&lt;&gt; &lt;a href="javascript:alert(\'boo!\')"&gt;click here&lt;/a&gt;\n</p>'
        self.assertEqual(parse(text), assumed)

        text = '<- <IMG SRC=javascript:alert(\'XSS\')>'
        assumed = '<p>&lt;- <img>\n</p>'
        self.assertEqual(parse(text), assumed)

        text= '<<< <img src="#" onerror=alert(1) />'
        assumed = '<p>&lt;&lt;&lt; <img>\n</p>'
        self.assertEqual(parse(text), assumed)

        text= '<<div id="woot">010</div>'
        assumed = '&lt;<div id="woot">010</div>'
        self.assertEqual(parse(text), assumed)

        text= '<-script --><!-- foo-->>alert("hi")</script>'
        assumed = '<p>&lt;-script --&gt;<!-- foo-->&gt;alert("hi")&lt;/script&gt;\n</p>'
        self.assertEqual(parse(text), assumed)

        text='<script <->alert("foo");</script>'
        assumed = '<p>&lt;script &lt;-=""&gt;alert("foo");&lt;/script&gt;\n&lt;/p&gt;&lt;/script&gt;</p>'
        self.assertEqual(parse(text), assumed)

    def test_internal_link_hook_simple(self):
        p = Parser()
        """Internal link simple hook works"""
        def testHook(parser, space, name):
            return '<a href="%s">%s' % (name.replace(' ', '+'), name)
        p.registerInternalLinkHook(None, testHook)
        text = '[[Some link]]'
        assumed = '<p><a href="Some+link">Some link\n</a></p>'
        self.assertEqual(p.parse(text), assumed)

    def test_internal_link_hook_namespace(self):
        p = Parser()
        """Internal link namespace works"""
        def testHook(parser, space, name):
            return 'space:%s,name:%s' % (space, name)
        p.registerInternalLinkHook('Space', testHook)
        text = '[[Space:Name]]'
        assumed = '<p>space:Space,name:Name\n</p>'
        self.assertEqual(p.parse(text), assumed)

    def test_nowiki(self):
        """<nowiki> escapes formatting"""
        p = Parser()
        text = "<nowiki>\n\n# item '''1'''\nitem ''2''\n\n</nowiki>"
        assumed = u"<p>\n\n# item '''1'''\nitem ''2''\n\n\n</p>"

        self.assertEqual(p.parse(text), assumed)

    def testToc(self):
        """
        Test that the table of contents can be configured.
        """
        text = """=My Heading=\n* here\n* is\n* a\n* [http://mydomain.com list]\n==Subheading==\n==show me a toc==\n===pretty please==="""
        assumed = '<div id="toc"><h2>TOC</h2><ul><li class="toclevel-1"><a href="#w_my-heading"><span class="tocnumber">1</span> <span class="toctext">My Heading</span></a><ul><li class="toclevel-2"><a href="#w_subheading"><span class="tocnumber">1.1</span> <span class="toctext">Subheading</span></a></li><li class="toclevel-2"><a href="#w_show-me-a-toc"><span class="tocnumber">1.2</span> <span class="toctext">show me a toc</span></a><ul><li class="toclevel-3"><a href="#w_pretty-please"><span class="tocnumber">1.2.1</span> <span class="toctext">pretty please</span></a></li></ul></li></ul></li></ul></div><h1 id="w_my-heading">My Heading</h1>\n<ul><li> here\n</li><li> is\n</li><li> a\n</li><li> <a href="http://mydomain.com">list</a>\n</li></ul>\n<h2 id="w_subheading">Subheading</h2>\n<h2 id="w_show-me-a-toc">show me a toc</h2>\n<h3 id="w_pretty-please">pretty please</h3>'
        self.assertEqual(parse(text, toc_string='TOC'), assumed)

