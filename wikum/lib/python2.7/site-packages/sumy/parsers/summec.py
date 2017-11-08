# -*- coding: utf8 -*-

from __future__ import absolute_import
from __future__ import division, print_function, unicode_literals

import xml.etree.ElementTree as etree

from .._compat import to_bytes
from ..utils import cached_property
from ..models.dom import Sentence, Paragraph, ObjectDocumentModel
from .parser import DocumentParser


class SummECXmlParser(DocumentParser):
    @classmethod
    def from_string(cls, string, tokenizer):
        return cls(string, tokenizer)

    @classmethod
    def from_file(cls, file_path, tokenizer):
        with open(file_path, "rb") as file:
            return cls(file.read(), tokenizer)

    def __init__(self, text, tokenizer):
        super(SummECXmlParser, self).__init__(tokenizer)

        text = to_bytes(text).strip()
        root = etree.fromstring(text)
        article = root.find("clanek")
        self._text = article.find("text").text
        self._title = article.find("nadpis").text

    @cached_property
    def significant_words(self):
        return self.tokenize_words(self._title)

    @cached_property
    def stigma_words(self):
        return self.STIGMA_WORDS

    @cached_property
    def document(self):
        sentences = [Sentence(self._title, self._tokenizer, is_heading=True)]
        for sentence in self.tokenize_sentences(self._text):
            sentences.append(Sentence(sentence, self._tokenizer))

        paragraphs = [Paragraph(sentences)]
        return ObjectDocumentModel(paragraphs)
