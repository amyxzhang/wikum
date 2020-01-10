from website.models import Article, Comment

from django.core.management.base import BaseCommand

class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument('article_id', type=int)

	def handle(self, *args, **options):
		article_id = options['article_id']
		article_comments = Comment.objects.filter(article=article_id, hidden=False)
		author_wc = {}
		for comment in article_comments:
			if comment.author:
				key = str(comment.author.username) + '_' + str(comment.is_replacement)
				text = comment.text
				if comment.is_replacement:
					text = re.sub(self.cleanr, ' ', comment.summary)
					text = text.replace('\n', '')
				word_count = len(text.strip().split())
				if key in author_wc:
					author_wc[key] += word_count
				else:
					author_wc[key] = word_count
		for keys,values in author_wc.items():
			print(keys, values)
