from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def shorten(value, l):
    if len(value) < l:
        return value
    return value[0:l] + '...'