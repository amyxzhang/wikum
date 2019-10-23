from . import section
from . import mwparsermod as mwpm


class Page(object):
    def __init__(self, text, title):
        self.title = title
        wcode = mwpm.parse(text)
        self.sections = section.generate_sections_from_wikicode(wcode)

    def extract_comments(self, extractor):
        for s in self.sections:
            s.extract_comments(extractor)

    def simplify(self):
        basic = {"sections": [s.simplify() for s in self.sections]}
        if self.title is not None:
            basic["title"] = self.title
        return basic
