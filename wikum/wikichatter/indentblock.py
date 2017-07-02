from . import indentutils as wiu
from . import signatureutils as su
import mwparserfromhell as mwp
import re

_FILE_PAT = re.compile(ur'\[\[File:.*?\]\]')

# Unclean code
def generate_indentblock_list(wcode):
    text_blocks = []
    wcode_lines = _divide_wikicode_into_lines(wcode)
    continuation_indent = 0
    indent = 0
    old_indent = indent
    old_continuation = False
    old_contains_sig = False
    for line in wcode_lines:
        if str(line) != '\n':
            local_indent = wiu.find_line_indent(line)
            continues = wiu.has_continuation_indent(line)
            if (local_indent == 0 or local_indent == 1) and not continues:
                if old_continuation and not old_contains_sig:
                    continuation_indent = old_indent
                    continues = True
                else:
                    if local_indent == 1 and str(line)[0] == ':' and old_continuation:
                        continuation_indent = old_indent
                        continues = True
                    elif re.search(_FILE_PAT, str(line)):
                        local_indent = old_indent
                        continues = True
                    else:
                        continuation_indent = 0
            elif continues:
                if old_continuation:
                    continuation_indent = old_indent
                else:
                    continuation_indent = old_indent + 1
            if local_indent is not None:
                indent = local_indent + continuation_indent
            text_blocks.append(IndentBlock(line, indent))
            old_indent = indent
            old_continuation = continues
            old_contains_sig = _contains_user_sig(line) and _contains_timestamp(line)

    return text_blocks

def _contains_timestamp(str):
    return _matches_regex(str, su.TIMESTAMP_RE)

def _contains_user_sig(str):
    if (_is_usertalk(str) or _is_userpage(str) or _is_usercontribs(str)):
        return True
    return False


def _is_usertalk(str):
    return _matches_regex(str, su.USER_TALK_RE)


def _is_userpage(str):
    return _matches_regex(str, su.USER_RE)


def _is_usercontribs(str):
    return _matches_regex(str, su.USER_CONTRIBS_RE)


def _matches_regex(node, regex):
    text = str(node)
    return re.search(regex, text) is not None


def _divide_wikicode_into_lines(wcode):
    lines = []
    line = []
    for node in wcode.nodes:
        line.append(node)
        if type(node) is mwp.nodes.text.Text and '\n' in node:
            lines.append(mwp.wikicode.Wikicode(line))
            line = []
    if len(line) > 0:
        lines.append(mwp.wikicode.Wikicode(line))
    return lines


class IndentBlock(object):
    def __init__(self, text, indent):
        self.text = text
        self.indent = indent

    def __str__(self):
        return self.text

    def simplify(self):
        return str(self.text)
