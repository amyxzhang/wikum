import unittest

from parser import parse

class WikimarkupTestCase(unittest.TestCase):
    def testHeadings(self):
        """
        Test the parsing of all heading levels
        """
        text = "=heading1="
        self.assertEquals(parse(text), '<h1 id="w_heading1">heading1</h1>')

        text = "==heading2=="
        self.assertEquals(parse(text), '<h2 id="w_heading2">heading2</h2>')

        text = """=heading1=\n==heading2==\n===heading3===\n====heading4====\n=====heading5=====\n======heading6======"""
        assumed = """<div id="toc"><h2>Table of Contents</h2>\n<ul>\n<li class="toclevel-1"><a href="#w_heading1"><span class="tocnumber">1</span> <span class="toctext">heading1</span></a>\n<ul>\n<li class="toclevel-2"><a href="#w_heading2"><span class="tocnumber">1.1</span> <span class="toctext">heading2</span></a>\n<ul>\n<li class="toclevel-3"><a href="#w_heading3"><span class="tocnumber">1.1.1</span> <span class="toctext">heading3</span></a>\n<ul>\n<li class="toclevel-4"><a href="#w_heading4"><span class="tocnumber">1.1.1.1</span> <span class="toctext">heading4</span></a>\n<li class="toclevel-5"><a href="#w_heading5"><span class="tocnumber">1.1.1.1.1</span> <span class="toctext">heading5</span></a>\n<li class="toclevel-6"><a href="#w_heading6"><span class="tocnumber">1.1.1.1.1.1</span> <span class="toctext">heading6</span></a></ul>\n</div><h1 id="w_heading1">heading1</h1>\n<h2 id="w_heading2">heading2</h2>\n<h3 id="w_heading3">heading3</h3>\n<h4 id="w_heading4">heading4</h4>\n<h5 id="w_heading5">heading5</h5>\n<h6 id="w_heading6">heading6</h6>"""
        self.assertEquals(parse(text), assumed)

    def testLinks(self):
        """
        Test the parsing of all link formats
        """
        text = "[http://mydomain.com/ mydomain.com]"
        self.assertEquals(parse(text), '<p><a href="http://mydomain.com/">mydomain.com</a>\n</p>')

        text = "[http://mydomain.com/]"
        self.assertEquals(parse(text), '<p><a href="http://mydomain.com/">http://mydomain.com/</a>\n</p>')

        text = "[mydomain.com/]"
        self.assertEquals(parse(text), '<p>[mydomain.com/]\n</p>')

        text = "[/hello/world]"
        self.assertEquals(parse(text), '<p><a href="/hello/world">/hello/world</a>\n</p>')

    def testStyles(self):
        """
        Test the parsing of all styles, including italic and bold
        """
        text = "'''hey''' dude"
        self.assertEquals(parse(text), '<p><strong>hey</strong> dude\n</p>')

        text = "'''hey''' ''dude''"
        self.assertEquals(parse(text), '<p><strong>hey</strong> <em>dude</em>\n</p>')

        text = "''hey'' dude"
        self.assertEquals(parse(text), '<p><em>hey</em> dude\n</p>')

        text = "'''''hey dude'''''"
        self.assertEquals(parse(text), '<p><em><strong>hey dude</strong></em>\n</p>')

        text = "'''''hey'' dude'''"
        self.assertEquals(parse(text), '<p><strong><em>hey</em> dude</strong>\n</p>')

    def testParagraphs(self):
        """
        Test the parsing of newlines into paragraphs and linebreaks
        """
        text = "hello\nhow are you\n\ngoodbye"
        self.assertEquals(parse(text), '<p>hello\nhow are you\n</p><p>goodbye\n</p>')

        text = "hello<br />how are you\n\ngoodbye"
        self.assertEquals(parse(text), '<p>hello<br />how are you\n</p><p>goodbye\n</p>')

    def testSafeHTML(self):
        """
        Test the stripping of unsafe HTML code
        """
        text = "<script>alert('hi');</script>"
        self.assertEquals(parse(text), '<p>&lt;script&gt;alert(\'hi\');&lt;/script&gt;\n</p>')

        text = '<form method="post">Hi</form>'
        self.assertEquals(parse(text), '<p>&lt;form method="post"&gt;Hi&lt;/form&gt;\n</p>')

    def testLists(self):
        """
        Test formatting ordered and unordered lists
        """
        text = "* hello\n* world\n* list"
        self.assertEquals(parse(text), '<ul><li> hello\n</li><li> world\n</li><li> list\n</li></ul>')

        text = "# hello\n# world\n# list"
        self.assertEquals(parse(text), '<ol><li> hello\n</li><li> world\n</li><li> list\n</li></ol>')

        text = "* hello\n* world\n# list\n* fun\n** isnt it\n*# yep"
        self.assertEquals(parse(text), '<ul><li> hello\n</li><li> world\n</li></ul>\n<ol><li> list\n</li></ol>\n<ul><li> fun\n<ul><li> isnt it\n</li></ul>\n<ol><li> yep\n</li></ol>\n</li></ul>')
    
    def testMixed(self):
        """
        Test many formatting methods together
        """
        text = """=My Heading=\n* here\n* is\n* a\n* [http://mydomain.com list]\n==Subheading==\n==show me a toc==\n===pretty please==="""
        assumed = '<div id="toc"><h2>Table of Contents</h2>\n<ul>\n<li class="toclevel-1"><a href="#w_my-heading"><span class="tocnumber">1</span> <span class="toctext">My Heading</span></a>\n<ul>\n<li class="toclevel-2"><a href="#w_subheading"><span class="tocnumber">1.1</span> <span class="toctext">Subheading</span></a></li>\n<li class="toclevel-2"><a href="#w_show-me-a-toc"><span class="tocnumber">1.2</span> <span class="toctext">show me a toc</span></a>\n<ul>\n<li class="toclevel-3"><a href="#w_pretty-please"><span class="tocnumber">1.2.1</span> <span class="toctext">pretty please</span></a></li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</div><h1 id="w_my-heading">My Heading</h1>\n<ul><li> here\n</li><li> is\n</li><li> a\n</li><li> <a href="http://mydomain.com">list</a>\n</li></ul>\n<h2 id="w_subheading">Subheading</h2>\n<h2 id="w_show-me-a-toc">show me a toc</h2>\n<h3 id="w_pretty-please">pretty please</h3>'
        self.assertEquals(parse(text), assumed)
        
if __name__ == '__main__':
    unittest.main()