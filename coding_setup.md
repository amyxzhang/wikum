Squadbox uses Django with a MySQL backend (you can replace with any other backend Django supports). For email, we use postfix along with the python lamson library.

### Installation Instructions
  
#### Install MySQL Server

#### Install Git and clone this repository
* `git clone https://github.com/amyxzhang/wikum.git`

#### install required linux packages if on linux
* `sudo apt-get install build-essential python-dev python-mysqldb libmysqlclient-dev python-mysqldb`

#### install virtualenv and python packages
* `/usr/bin/python2.7`
* pip: `sudo easy_install pip`
* `sudo pip install virtualenv `
* create a virtualenv for this project: `virtualenv wikum`
* make sure your virtualenv is activated: `source wikum/bin/activate`

#### install required python packages
* `pip install mysql-python`
* `pip install -r requirements.txt`

#### configuration
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


#### setup the database 

```sh
$ sudo mysql
> CREATE USER 'myUser'@'localhost' IDENTIFIED BY 'myPassword';
> CREATE DATABASE wikum;
> USE wikum;
> GRANT ALL PRIVILEGES ON wikum.* TO 'myUser'@'localhost';

```


#### install schema

```sh
$ python manage.py syncdb
```


#### run the server
* Webserver: `python manage.py runserver`

Then visit [http://localhost:8000/](http://localhost:8000/)
