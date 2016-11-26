from . import signatureutils as su
from . import indentutils as wiu
from .error import Error


def identify_comments_linear_merge(text_blocks):
    working_comment = Comment()
    comments = [working_comment]
    for block in text_blocks:
        if working_comment.author is not None:
            working_comment = Comment()
            comments.append(working_comment)
        working_comment.add_text_block(block)
    return _sort_into_hierarchy(comments)


def identify_comments_level_merge(text_blocks):
    pass


def _sort_into_hierarchy(comment_list):
    top_level_comments = []
    comment_stack = []
    for comment in comment_list:
        while len(comment_stack) > 0:
            cur_com = comment_stack[-1]
            if cur_com.level < comment.level:
                cur_com.add_subcomment(comment)
                comment_stack.append(comment)
                break
            comment_stack.pop()
        if len(comment_stack) is 0:
            top_level_comments.append(comment)
            comment_stack.append(comment)
    return top_level_comments


class CommentError(Error):
    pass


class MultiSignatureError(CommentError):
    pass


class Comment(object):

    def __init__(self):
        self.author = None
        self.cosigners = []
        self.time_stamp = None
        self._text_blocks = []
        self.comments = []

    def add_text_block(self, text_block):
        self._text_blocks.append(text_block)
        self.load_signature()

    def add_text_blocks(self, text_blocks):
        self._text_blocks.extend(text_blocks)
        self.load_signature()

    def add_subcomment(self, comment):
        self.comments.append(comment)

    def load_signature(self):
        signatures = self._find_signatures()
        if len(signatures) > 0:
            self.author = signatures[0]['user']
            self.time_stamp = signatures[0]['timestamp']
            self.cosigners = signatures[1:]

    def _find_signatures(self):
        sig_list = []
        for block in self._text_blocks:
            sig_list.extend(su.extract_signatures(block.text))
        return sig_list

    @property
    def level(self):
        levels = [b.indent for b in self._text_blocks if str(b.text).strip() != '']
        if len(levels) > 0:
            return min(levels)
        return 0

    @property
    def text(self):
        return "\n".join([str(b.text) for b in self._text_blocks])

    def simplify(self):
        basic = {}
        basic["text_blocks"] = [b.simplify() for b in self._text_blocks]
        basic["comments"] = [c.simplify() for c in self.comments]
        basic["cosigners"] = [{'author': s['user'], 'time_stamp': s['timestamp']} for s in self.cosigners]
        if self.author is not None:
            basic["author"] = self.author
        if self.time_stamp is not None:
            basic["time_stamp"] = self.time_stamp
        return basic

    def __repr__(self):
        return self.text
