import csv

filename1 = 'comment_data_520.csv'
res=[]
with open(filename1) as f:
    content=csv.reader(f,delimiter=',')
    for row in content:
        row=row[1:]
        res.append(row)
    f.close()
with open(filename1,'w') as ff:
    sw=csv.writer(ff,delimiter=',')
    for row in res:
        sw.writerow(row)
    ff.close()
