#!/bin/sh

WORKON_HOME=/wikum-env3
PROJECT_ROOT=/wikum/wikum/wikum

# activate virtual env
. $WORKON_HOME/bin/activate

cd $PROJECT_ROOT
sudo /wikum-env3/bin/python manage.py retry_deferred >> /var/log/cron_mail.log 2>&1

