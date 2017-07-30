
# coding: utf-8

# In[1]:

get_ipython().magic(u'matplotlib inline')
import MySQLdb
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt

plt.rcParams["figure.figsize"] = [20,12]


# In[2]:

conn = MySQLdb.connect(host='localhost', user='root', passwd='Scott605', db='wikumnewdb')
cursor = conn.cursor()


# In[3]:

cursor.execute("select text, username, website_comment.created_at, url from website_opencomment INNER JOIN website_article on website_opencomment.article_id = website_article.id INNER JOIN website_commentauthor on website_opencomment.author_id = website_commentauthor.id INNER JOIN website_comment on website_opencomment.comment_id = website_comment.id")
rows = cursor.fetchall()


# In[9]:

# How many RfCs are opened per month?
open_dates = [data[2] for data in rows]
df = pd.DataFrame(index=open_dates)
df['count'] = [1]*len(open_dates)
resampled_df = df.resample('1M', label='right').sum()


# In[5]:

fig, ax = plt.subplots()

ax.plot(resampled_df.index, resampled_df['count'])
fig.suptitle('RfCs initiated', fontsize=20, fontweight='bold',y=0.05)
years = plt.matplotlib.dates.YearLocator()
months = plt.matplotlib.dates.MonthLocator(interval=3)
yearsFmt = plt.matplotlib.dates.DateFormatter('%Y')
monthsFmt = plt.matplotlib.dates.DateFormatter('%b')

ax.xaxis.set_major_locator(years)
ax.xaxis.set_major_formatter(yearsFmt)
ax.xaxis.set_minor_locator(months)
ax.xaxis.set_minor_formatter(monthsFmt)

ax.set_xlabel("Date")
ax.set_ylabel("Number of RfCs initiated")
ax.xaxis.grid(True)
ax.yaxis.grid(True)

labels = ax.get_xticklabels() #"both" gives ugly formatting
plt.setp(labels, rotation=30, fontsize=15)

for xy in zip(resampled_df.index, resampled_df['count']):
    ax.annotate(xy[1], xy=xy, textcoords='data')

plt.show()


# In[6]:

# Maximum RfCs initiated in a month
resampled_df.idxmax()
resampled_df.max()

print int(resampled_df.max())


# In[7]:

# Top openers
df = pd.DataFrame( [[ij for ij in i] for i in rows] )
df.rename(columns={0:'text', 1:'user name', 2:'date', 3:'url'}, inplace=True)
opening_counts = pd.DataFrame(df.groupby('user name').size().rename('total openings'))
opening_counts.sort_values(by='total openings', ascending=False, inplace=True)
opening_counts.iloc[0:30]


# In[ ]:



