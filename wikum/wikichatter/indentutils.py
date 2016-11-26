import mwparserfromhell as mwp
import time


# Unclean code
def extract_indent_blocks(wikicode):
    old_indent = 0
    wc_block_list = []
    cur_block_wc_lines = []
    for wc_line in _split_wikicode_on_endlines(wikicode):
        line = str(wc_line)
        indent = _find_line_indent(line)
        if indent != old_indent and line.strip() != "":
            wc_block = _join_wikicode(cur_block_wc_lines)
            block = str(wc_block)
            if block.strip() != "":
                wc_block_list.append(wc_block)
            cur_block_wc_lines = []
            old_indent = indent
        cur_block_wc_lines.append(wc_line)
    wc_block = _join_wikicode(cur_block_wc_lines)
    block = str(wc_block)
    if block.strip() != "":
        wc_block_list.append(wc_block)
    return wc_block_list


# Unclean code
def _split_wikicode_on_endlines(wikicode):
    divided = []
    cur = []
    for node in wikicode.nodes:
        if type(node) is mwp.nodes.text.Text:
            split_nodes = _split_text_node_on_endline(node)
            for sn in split_nodes:
                cur.append(sn)
                if "\n" in sn.value:
                    divided.append(mwp.wikicode.Wikicode(cur))
                    cur = []
        else:
            cur.append(node)
    if len(cur) > 0:
        divided.append(mwp.wikicode.Wikicode(cur))
    return divided


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


def _join_wikicode(wikicode_list):
    nodes = []
    for wc in wikicode_list:
        nodes.extend(wc.nodes)
    return mwp.wikicode.Wikicode(nodes)


def find_min_indent(wikicode):
    text = str(wikicode)
    lines = text.split('\n')
    non_empty = [line for line in lines if line.strip() != ""]
    indents = [_find_line_indent(line) for line in non_empty]
    return min(indents)


def find_line_indent(wcode):
    text = str(wcode)
    if text.strip() != "":
        return _find_line_indent(text)
    return None


def _find_line_indent(line):
    return _count_indent_in_some_order(line)


def _count_indent_in_some_order(line):
    line = line.strip()
    count = 0
    indent_chars = [':', '*', '#']
    while len(indent_chars) > 0:
        if len(line) > count and line[count] in indent_chars:
            char = line[count]
            count += _count_leading_char(line[count:], line[count])
            indent_chars.remove(char)
        else:
            break
    return count


def _count_leading_char(line, char):
    line = line.strip()
    if len(line) == 0 or line[0] != char:
        return 0
    else:
        return 1 + _count_leading_char(line[1:], char)


def has_continuation_indent(wikicode):
    if len(wikicode.nodes) > 0:
        start_node = wikicode.nodes[0]
        if type(start_node) is mwp.nodes.template.Template:
            return "outdent" in str(start_node).lower()
    return False
