from . import indentutils as wiu
from . import signatureutils as su
import mwparserfromhell as mwp


# Unclean code
def generate_indentblock_list(wcode):
    text_blocks = []
    wcode_lines = _divide_wikicode_into_lines(wcode)
    continuation_indent = 0
    indent = 0
    old_indent = indent
    for line in wcode_lines:
        local_indent = wiu.find_line_indent(line)
        continues = wiu.has_continuation_indent(line)
        if local_indent == 0 and not continues:
            continuation_indent = 0
        elif continues:
            continuation_indent = old_indent + 1
        if local_indent is not None:
            indent = local_indent + continuation_indent
        text_blocks.append(IndentBlock(line, indent))
        old_indent = indent
    return text_blocks


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
