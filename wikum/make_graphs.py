import csv
import seaborn as sns
import pandas as pd
import matplotlib.pyplot as plt

sns.set(style="white", font_scale=1.5)

# dataset = pd.read_csv('comment_data_520_long.csv')
# g = sns.relplot(x="Minutes", y="Words Shown", hue="Is Summary Node", size="Word Count",
#             sizes=(40, 400), size_norm=(0, 240), alpha=.5, palette="muted",
#             height=6, data=dataset).set(ylim=(0,1000), xlim=(-1000,5500), xticks=range(50,5050,1500))

#g.set(xlim=(5600,16000), xticks=range(5600,16000,5000))

# g._legend.texts[0].set_text("")
# g._legend.texts[1].set_text("Comment")
# g._legend.texts[2].set_text("Summary")

# palette = {"FALSE": "#3498db", "Messenger": "purple", "TRUE": "orange"}
palette = {True: "orange"}
dataset = pd.read_csv('doc_data_long.csv')
g = sns.relplot(x="Minutes", y="Words In Interface of Proposal", hue="Edit to Summary", size="Word Count",
            sizes=(40, 400), size_norm=(0, 240), alpha=.5, palette=palette,
            height=6, data=dataset).set(ylim=(0,1800), xlim=(-1000,6000))
# g._legend.texts[0].set_text("")
# g._legend.texts[1].set_text("Messenger")
# g._legend.texts[2].set_text("Comment")
# g._legend.texts[3].set_text("Summary")

plt.show()
