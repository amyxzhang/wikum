from . import indentblock
from . import comment


def linear_extractor(text):
    text_blocks = indentblock.generate_indentblock_list(text)
    comments = comment.identify_comments_linear_merge(text_blocks)
    return comments
