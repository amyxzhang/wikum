import mwparserfromhell as mwp
from .error import Error


class MWParserModError(Error):
    pass


class NotWikicodeError(MWParserModError):
    pass


def parse(wikitext):
    wikicode = mwp.parse(wikitext, skip_style_tags=True)
    _split_wikicode_on_endlines(wikicode)
    return wikicode


def seperate_wikicode_nodes_on_newlines(wikicode):
    if type(wikicode) is not mwp.wikicode.Wikicode:
        raise NotWikicodeError(type(wikicode))
    _split_wikicode_on_endlines(wikicode)


def _split_wikicode_on_endlines(wikicode):
    divided = []
    cur = []
    for node in wikicode.nodes:
        if type(node) is mwp.nodes.text.Text:
            split_nodes = _split_text_node_on_endline(node)
            if len(split_nodes) > 1:
                wikicode.replace(node, split_nodes[0])
                for i in range(1, len(split_nodes)):
                    wikicode.insert_after(split_nodes[i - 1], split_nodes[i])


def _split_text_node_on_endline(text_node):
    text = text_node.value
    lines = _split_text_and_leave_delimiter(text, "\n")
    results = []
    for line in lines:
        if line != "":
            results.append(mwp.nodes.text.Text(line))
    return results


def _split_text_and_leave_delimiter(text, delimiter):
    result = []
    lines = text.split(delimiter)
    for i, line in enumerate(lines):
        if i == (len(lines) - 1):
            break
        result.append(line + delimiter)
    result.append(lines[i])
    return result
