

A few additional steps should be taken to setup the deployment of Wikum.
This guide serves in particular for deploying on an older Linux server. 

### Python 3.7 Installation SSL Issue Associated with Linux
There is a known [SSL Issue](https://joshspicer.com/python37-ssl-issue) with installing Python 3.7 properly on Linux/Ubuntu servers.
Follow the linked guide to properly install. The most relevant part is uncommenting the socket module helper.

### Update Package Lists for Upgrade
Double check that `/etc/apt/sources.list` and `/etc/apt/sources.list.d` do not contain any duplicates.
Then run:
```sh

$ sudo apt-get update

```

### Follow The Same Instructions from the Local Coding Setup
* Set up dependencies
* Set up the database
* Set up configurations
* Set up schemas and fixtures
* Start the RabbitMQ server

The `requirements.txt` should have already given you [WhiteNoise](http://whitenoise.evans.io/en/stable/django.html), so now in order to [render static files](https://docs.djangoproject.com/en/2.2/howto/static-files/), run:
```sh
$ python manage.py collectstatic
```

### Setup and Run the Redis Server
Be sure to be running the lastest stable redis server. If you are using an older Linux server, here is a [guide for installation](https://medium.com/@jonbaldie/how-to-install-redis-4-x-manually-on-an-older-linux-kernel-b18133df0fd3).
Once you have installed properly, start the redis server. Here I have my redis in `redis_6379` and start it with:
```sh
$ redis-server /etc/redis/6379.conf
```

You can double check that it is running with `ps aux | grep redis`.
It is also a good idea to make sure the correct redis is running on startup (especially if you previously set an older version).
If you had a previous older redis on startup, remove it with:
```sh
$ sudo update-rc.d redis-server disable
```

Now update the new redis to autostart with:
```sh
$ sudo update-rc.d redis_6379 enable
```

### Using supervisor
We use supervisor to manage our server (Daphne) and worker (Celery) processes. The `wikum/wikum/supervisord.conf` stores configuration information for all the processes. Supervisor uses this conf file to run and log the processes. It will retry processes if they fail.
Note that to run supervisor, you will also need a `wikum/wikum/supervisor.sock` file.
Restart all processes currently supervised by supervisor with:
```sh
$ sudo supervisorctl restart all
```
If you've updated the configuration file at all, you need to reread, update, and start the processes again:
```sh
$ sudo supervisorctl reread
$ sudo supervisorctl update
$ sudo supervisorctl start <your_process>
```

### Setting up cron jobs
We use [pinax-notifications](https://github.com/pinax/pinax-notifications) for our notification system. Set up a log file (we have ours in /var/log/cron_mail.log). Make sure that the notification scripts are executable:
```sh
$ sudo chmod +x /wikum/wikum/wikum/cron/emit_notices.sh
$ sudo chmod +x /wikum/wikum/wikum/cron/retry_deferred.sh
```
To `emit_notices` every minute and `retry_deferred` every 20 minutes, set up a cron job using `crontab -e`:
```sh
$ * * * * * sudo /wikum/wikum/wikum/cron/emit_notices.sh
$ 0,20,40 * * * * sudo /wikum/wikum/wikum/cron/retry_deferred.sh
```
