# WIKUM

> A tool for summarizing and exploring long comment threads.

Large-scale discussions between many participants abound on the internet today, on topics ranging from political arguments to group coordination. But as these discussions grow to tens of thousands of posts, they become ever more difficult for a reader to digest. In this repository, we document the [Wikum tool](http://wikum.csail.mit.edu) that enables a large population of readers or editors to produce a summary tree that enables a reader to explore distinct subtopics at multiple levels of detail based on their interests.




This repository contains:


1. The instructions for how locally install and run Wikum.



## Table of Contents

- [Background](#background)
- [Installation](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Background


## Install

This project uses [python2.7](https://www.python.org/downloads/), [MySQL](https://www.mysql.com/downloads/), [pip](https://pip.pypa.io/en/stable/installing/) and [virtualenv](https://virtualenv.pypa.io/en/stable/installation/). Go check them out if you don't have them locally installed.


Inside the project do:

```sh
$ cd wikum/
$ virtualenv wikum
$ mkdir /opt/wikum
$ echo "true" > /dev/wikum/debug
$ echo "dev" > /dev/wikum/env

```

Now, you should create a local database:

```sh
$ sudo mysql
> CREATE USER 'myUser'@'localhost' IDENTIFIED BY 'myPassword';
> CREATE DATABASE wikum;
> USE wikum;
> GRANT ALL PRIVILEGES ON wikum.* TO 'myUser'@'localhost';

```

Input this on-line command in order to create a file named **private.py**, this file will set the configuration for connecting your local database. 
*Note that you should replace 'myUser' and 'myPassword' with the ones you've just created*.

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

In order to follow the correct Django configuration you should create a strong secret key (assign a long string to the SECRET_KEY variable).

After this you should create the tables for the database:

```sh
$ python manage.py syncdb
```



## Usage

Once you have Wikum locally installed you can start developing. 
Follow this link to find a [video](#usage) description of the Wikum project.


## Maintainers

[@Amyxzhang](https://github.com/amyxzhang).

## Contribute

Before you get started, please review our [contributor guidelines](/CONTRIBUTING.md), after that feel free to dive in! [Open an issue](https://github.com/amyxzhang/wikum/issues/new) or submit PRs.


If you'll be working on a coding issue, follow the [coding setup](/coding_setup.md)instructions to get a local version of the project up and running.
