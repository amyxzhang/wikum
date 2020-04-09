

This project uses [Django](https://www.djangoproject.com/download/) as backend as well as [python](https://www.python.org/downloads/), [MySQL](https://www.mysql.com/downloads/), [pip](https://pip.pypa.io/en/stable/installing/) and [virtualenv](https://virtualenv.pypa.io/en/stable/installation/). Go check them out if you don't have them locally installed.

### Installation Instructions



#### Clone this repository

```sh
git clone https://github.com/amyxzhang/wikum.git
```

#### Install required linux packages if on linux
```sh
sudo apt-get install build-essential python-dev python-mysqldb libmysqlclient-dev python-mysqldb
```

#### Install virtualenv and python packages

Please install Python 3.7. [Here](https://tecadmin.net/install-python-3-7-on-ubuntu-linuxmint/) are the instructions for Ubuntu and Linux machines. For MacOS, you can use Homebrew. Then, create a virtualenv using Python 3.7 (here I am calling it wikum-env3), activate it, and install requirements:
```sh

$ sudo python3.7 -m venv wikum-env3
$ source wikum-env3/bin/activate
$ pip install -r requirements.txt

```

Wikitools is a Python 2 dependency that has a Python 3 branch. Install that separately:
```sh

$ pip install git+https://github.com/alexz-enwp/wikitools.git@py3

```

If you are using Django 3.0, you will need to install `six` and replace `django.utils.encoding` and `django.utils.six` with just `six` in the imports. Then, change all instances of `{% load staticfiles %}` to `{% load static %}`. If you are deploying, don't forget to run `collectstatic`.

#### Setup the database

```sh
$ sudo mysql
> CREATE USER 'myUser'@'localhost' IDENTIFIED BY 'myPassword';
> CREATE DATABASE wikum;
> USE wikum;
> GRANT ALL PRIVILEGES ON wikum.* TO 'myUser'@'localhost';

```


#### Configuration
* Edit database details inside the file called **private_config.py** to add the security settings of your so created database:

* Also, you should change the file name to **private.py**

```sh
"MYSQL_PROD = {
        'NAME' : 'wikum',
        'USER' : 'myUser',
        'PASSWORD' : 'myPassword',
        'HOST' : 'localhost',
    }

SECRET_KEY = ''
DISQUS_API_KEY = ''
```
*Note that you should replace 'myUser' and 'myPassword' with the ones you've choosen. Also In order to follow the correct Django configuration you should create a strong secret key (assign a long string to the SECRET_KEY variable).*


In settings.py, change <NAME>, <USER>, and <PASSWORD> to the same values as in **private.py**. 



#### Install schema

```sh
$ python manage.py migrate
```

#### Load data fixtures

```sh
$ python manage.py loaddata initial
```


#### Run the server
```sh
python manage.py runserver
```

Then visit [http://localhost:8000/](http://localhost:8000/)

#### Setup Celery result store

```sh
$ sudo mysql
> CREATE USER 'celery'@'localhost' IDENTIFIED BY 'koob';
> CREATE DATABASE celery;
> USE celery;
> GRANT ALL PRIVILEGES ON celery.* TO 'celery'@'localhost';
```

Then in `wikum/settings.py`:

```
CELERY_RESULT_BACKEND = "db+mysql://celery:koob@localhost/celery"
```

#### Start Celery

```sh
$ rabbitmq-server
$ celery -A wikum.celery worker
```
