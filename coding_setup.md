

This project uses [Django](https://docs.djangoproject.com/en/1.11/topics/install/) as backend as well as [python](https://www.python.org/downloads/), [MySQL](https://www.mysql.com/downloads/), [pip](https://pip.pypa.io/en/stable/installing/) and [virtualenv](https://virtualenv.pypa.io/en/stable/installation/). Go check them out if you don't have them locally installed.

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

```sh

$ sudo easy_install pip,
$ sudo pip install virtualenv
$ pip install mysql-python
$ pip install -r requirements.txt

```

Create a virtualenv for this project: 
```sh
virtualenv wikum
```

Make sure your virtualenv is activated: 
```sh
source wikum/bin/activate
```


#### Configuration
* Edit database details in a new file called **private.py**, also in this private.py file, add your security settings:

```sh
$ echo "MYSQL_PROD = {
        'NAME' : 'wikum',
        'USER' : 'myUser',
        'PASSWORD' : 'myPassword',
        'HOST' : 'localhost',  
    }

    SECRET_KEY = ''
    DISQUS_API_KEY = ''

    " > private.py
```
*Note that you should replace 'myUser' and 'myPassword' with the ones you've choosen. Also In order to follow the correct Django configuration you should create a strong secret key (assign a long string to the SECRET_KEY variable).*


#### Setup the database 

```sh
$ sudo mysql
> CREATE USER 'myUser'@'localhost' IDENTIFIED BY 'myPassword';
> CREATE DATABASE wikum;
> USE wikum;
> GRANT ALL PRIVILEGES ON wikum.* TO 'myUser'@'localhost';

```


#### Install schema

```sh
$ python manage.py syncdb
```


#### Run the server
```sh
python manage.py runserver
```

Then visit [http://localhost:8000/](http://localhost:8000/)
