
# coding: utf-8

# In[1]:

get_ipython().magic(u'matplotlib inline')
import MySQLdb
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from scipy import stats, integrate
pd.set_option('display.max_colwidth',600)
plt.rcParams["figure.figsize"] = [20,12]
sns.set(color_codes=True)


# In[2]:

conn = MySQLdb.connect(host='localhost', user='root', passwd='Scott605', db='wikumnewdb')
cursor = conn.cursor()


# In[3]:

cursor.execute("select text,username, website_comment.created_at, website_article.id, url from website_closecomment INNER JOIN website_article on website_closecomment.article_id = website_article.id INNER JOIN website_commentauthor on website_closecomment.author_id = website_commentauthor.id INNER JOIN website_comment on website_closecomment.comment_id = website_comment.id ")
rows = cursor.fetchall()


# In[4]:

df = pd.DataFrame( [[ij for ij in i] for i in rows] )
df.rename(columns={0:'closing', 1:'user name', 2:'created_at', 3:'article id', 4:'url'}, inplace=True)


# In[5]:

################### list of top closers ###################
closing_counts = pd.DataFrame(df.groupby('user name').size().rename('total closings'))
closing_counts.sort_values(by='total closings', ascending=False, inplace=True)
closing_counts.iloc[0:30]


# In[6]:

##################### length of closing statements #####################
df['length of closing'] = df['closing'].apply(lambda x:len(x))
pd.DataFrame(df['length of closing']).describe()


# In[7]:

g = sns.distplot(df['length of closing'])
g.axes.set_xlim(0,)
g.set_title('Rough distribution of length of closing statements', fontsize=25, fontweight='bold')


# In[8]:


# Turned out Cunard wrote one really long closing statement
# What if we erase Cunard's closing?

sorted_closing = df.sort_values(by='length of closing')
sorted_closing.tail()

g = sns.distplot(sorted_closing[:-1]['length of closing'])
g.axes.set_xlim(0,)
g.set_title('Rough distribution of length of closing statements (without outlier)', fontsize=25, fontweight='bold')


# In[9]:

##################### The time it took to close RfCs #####################

cursor.execute("select opening.article_id, opening.created_at as open, closing.created_at as close "
    +"from (select t2.created_at, t1.article_id from website_opencomment t1 "
    +"inner join website_comment t2 on t1.comment_id = t2.id) opening "
    +"inner join (select t4.created_at, t3.article_id from website_closecomment t3 inner join "
    +"website_comment t4 on t3.comment_id=t4.id) closing on opening.article_id = closing.article_id")
rows = cursor.fetchall()


# In[16]:

df = pd.DataFrame( [[ij for ij in i] for i in rows] )
df.rename(columns={0:'article', 1:"open date", 2:"close date"}, inplace=True)
pd.DataFrame(df['close date'] - df['open date']).head()

