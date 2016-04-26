import email
import re
from dateutil import parser
from wikum.website.models import Article, Source, Comment, CommentAuthor

f = open('2013-January.txt', 'r')

s = Source.objects.get_or_create(source_name="csail-related")

a = Article.objects.get_or_create(url="https://lists.csail.mit.edu/mailman/private/csail-related/2013-January.txt",
                          title="[msgs] Holiday Greetings from MIT",
                          source=s)

lines = f.readlines()

email_text = ''

emails = []

for line in lines:
    if line.startswith('From '):
        emails.append(email_text)
        email_text = ''
    else:
        email_text +=  line
        

for e in emails:
    msg = email.message_from_string(e)
    if msg['subject']:
        if 'Holiday Greeting' in msg['subject'] or 'PACER' in msg['subject'] or 'Swartz' in msg['subject']:
            subject = msg['subject']
            
            
            reply_to = msg['In-Reply-To']
            message_id = msg['Message-ID']
            from_user = msg['From']
            
            author = CommentAuthor.objects.get_or_create(username=from_user)
            
            date = msg['Date']
            date = parser.parse(date) 
            
            body = msg.get_payload()
            
            body_str = '<p>'
            is_p = True
            
            for str in body.split('\n'):
                if str.strip() == '':
                    if not is_p:
                        body_str += '</p><p>'
                        is_p = True
                    continue
                 
                 
                if not (str.startswith('>') or str.startswith('   ')):
                    if not (' wrote:' in str or ' wrote at ' in str or ' wrote on ' in str or 'Sent from my ' in str or '* Neil ' in str or str.startswith('On ')
                            or str.startswith('at 1') or str.startswith('Quoting J') or str.endswith('>:')):
                        
                        if str.startswith('____') or str == '-- ':
                            break
                        
                        
                        body_str += str + '\n'
                        is_p = False
            
            body_str += '</p>'
            if body_str.endswith('<p></p>'):
                body_str = body_str[:-7]
            
            c = Comment.objects.get_or_create(created_at=date,
                                              reply_to_disqus=reply_to,
                                              disqus_id=message_id,
                                              text=body_str,
                                              author=author,
                                              article=a)
            
            
            
            
            
    