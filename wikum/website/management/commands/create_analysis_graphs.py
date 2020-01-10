from website.models import Article, Comment, CommentAuthor, History
import csv
import seaborn as sns
import pandas as pd
import re
from datetime import datetime

from django.core.management.base import BaseCommand

sns.set(style="white")
class Command(BaseCommand):
	help = 'Generates a csv from article: comment id, is_replacement, word count, percent summarized'
	def __init__(self):
		self.orig_sum_node_id = None
		self.counted = {}
		self.new_counted = {}
		self.uncounted = [75803, 75823, 75839, 75846, 75847, 75848, 75850, 75852, 75853, 75854, 75855, 75858, 75859, 75860, 75861, 75863, 75872, 75873, 75886, 75889, 75890, 75892, 75895, 75896, 75897, 75898]
		self.unsummarized = [75863, 75872, 75890, 75873, 75892, 75889, 75895, 75896, 75897]
		self.sum_children_wc = 0
		self.sum_children_and_sum_wc = 0
		self.root_is_sum = False
		self.cleanr = re.compile('<.*?>') 

	def add_arguments(self, parser):
		parser.add_argument('article_id', type=int)

	def count_words_of_summary_children(self, node, article_id):
	    children = Comment.objects.filter(reply_to_disqus=node.disqus_id, article=article_id, hidden=False)
	    for child in children:
	    	if child.text and (child.id < self.orig_sum_node_id) and (child.id not in self.counted):
	    		self.counted[child.id] = len(child.text.strip().split())
	    		self.sum_children_wc += len(child.text.strip().split())
	    		self.count_words_of_summary_children(child, article_id)

	def count_words_of_summary_children_all(self, node, article_id):
	    children = Comment.objects.filter(reply_to_disqus=node.disqus_id, article=article_id, hidden=False)
	    for child in children:
	    	if (child.id < self.orig_sum_node_id) and (child.id not in self.new_counted):
	    		if (child.id not in self.unsummarized):
		    		if not child.is_replacement:
		    			self.new_counted[child.id] = len(child.text.strip().split())
		    			self.sum_children_and_sum_wc += len(child.text.strip().split())
		    		else:
		    			summary_text = re.sub(self.cleanr, ' ', child.summary)
		    			summary_text = summary_text.replace('\n', '')
		    			self.new_counted[child.id] = len(summary_text.strip().split())
		    			self.sum_children_and_sum_wc += len(summary_text.strip().split())
	    		self.count_words_of_summary_children_all(child, article_id)


	def handle(self, *args, **options):
		article_id = options['article_id']
		article_comments = Comment.objects.filter(article=article_id, hidden=False)

		print(len(article_comments))
		filename = 'comment_data_' + str(article_id) + '.csv'
		num_words_all = 0
		num_words_still = 0
		num_words_still_and_sum = 0
		first_datetime = History.objects.filter(article=article_id, action__in=['new_node', 'reply_comment']).filter(comments=Comment.objects.get(id=75791))[0].datetime

		with open(filename, mode='w') as comment_data:
			data_writer = csv.writer(comment_data, delimiter=',')
			data_writer.writerow(['Seconds','comment_id','Is Summary Node','Word Count', 'Words Shown', 'Percent Summarized'])
			for comment in article_comments:
				word_count = 0
				datetime = None
				if comment.text:
					word_count = len(comment.text.strip().split())
				if not comment.is_replacement:
					num_words_all += word_count
					num_words_still += word_count
					num_words_still_and_sum += word_count
					# if comment.id in self.uncounted:
					# 	num_words_still -= word_count
					# 	num_words_still_and_sum -= word_count
					h = History.objects.filter(article=article_id, action__in=['new_node', 'reply_comment']).filter(comments=comment)
					if h.count() > 0:
						datetime = (h[0].datetime - first_datetime).total_seconds()
				else:
					self.sum_children_wc = 0
					self.sum_children_and_sum_wc = 0
					self.orig_sum_node_id = comment.id
					self.count_words_of_summary_children(comment, article_id)
					num_words_still -= self.sum_children_wc
					h = History.objects.filter(article=article_id, action__in=['sum_nodes', 'sum_selected']).filter(comments=comment)
					if h.count() > 0:
						datetime = (h[0].datetime - first_datetime).total_seconds()
					summary_text = re.sub(self.cleanr, ' ', comment.summary)
					summary_text = summary_text.replace('\n', '')
					word_count = len(summary_text.strip().split())
					num_words_still_and_sum += word_count
					self.count_words_of_summary_children_all(comment, article_id)
					num_words_still_and_sum -= self.sum_children_and_sum_wc
					print("all words: ", num_words_all)
					print("still words: ", num_words_still)
					print("wordcount: ", word_count)
					print("still and sum words: ", num_words_still_and_sum)
				percent_sum = round(((1.0 - float(float(num_words_still)/float(num_words_all))) * 100.0))
				if percent_sum > 100:
					percent_sum = 100
				if percent_sum < 0:
					percent_sum = 0
				data_writer.writerow([datetime, comment.id, comment.is_replacement, word_count, num_words_still_and_sum, percent_sum])
		# uncounted = []
		# for c in article_comments:
		# 	self.root_is_sum = False
		# 	if c.id not in self.counted:
		# 		self.is_thread_root_prev_summary(c, article_id)
		# 		if self.root_is_sum:
		# 			uncounted.append(c.id)
		# print(uncounted)
		comment_data.close()

