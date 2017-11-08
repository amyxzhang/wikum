breadability - another readability Python (v2.6-v3.3) port
===========================================================
.. image:: https://api.travis-ci.org/bookieio/breadability.png?branch=master
   :target: https://travis-ci.org/bookieio/breadability.py

I've tried to work with the various forks of some ancient codebase that ported
`readability`_ to Python. The lack of tests, unused regex's, and commented out
sections of code in other Python ports just drove me nuts.

I put forth an effort to bring in several of the better forks into one
code base, but they've diverged so much that I just can't work with it.

So what's any sane person to do? Re-port it with my own repo, add some tests,
infrastructure, and try to make this port better. OSS FTW (and yea, NIH FML,
but oh well I did try)

This is a pretty straight port of the JS here:

- http://code.google.com/p/arc90labs-readability/source/browse/trunk/js/readability.js#82
- http://www.minvolai.com/blog/decruft-arc90s-readability-in-python/


Alternatives
------------

- https://github.com/codelucas/newspaper
- https://github.com/grangier/python-goose
- https://github.com/aidanf/BTE
- http://www.unixuser.org/~euske/python/webstemmer/#extract
- https://github.com/al3xandru/readability.py
- https://github.com/rcarmo/soup-strainer
- https://github.com/bcampbell/decruft
- https://github.com/gfxmonk/python-readability
- https://github.com/srid/readability
- https://github.com/dcramer/decruft
- https://github.com/reorx/readability
- https://github.com/mote/python-readability
- https://github.com/predatell/python-readability-lxml
- https://github.com/Harshavardhana/boilerpipy
- https://github.com/raptium/hitomi
- https://github.com/kingwkb/readability


Installation
------------
This does depend on lxml so you'll need some C headers in order to install
things from pip so that it can compile.

.. code-block:: bash

    $ [sudo] apt-get install libxml2-dev libxslt-dev
    $ [sudo] pip install git+git://github.com/bookieio/breadability.git

Tests
-----
.. code-block:: bash

    $ nosetests-2.6 tests && nosetests-3.2 tests && nosetests-2.7 tests && nosetests-3.3 tests


Usage
-----
Command line
~~~~~~~~~~~~

.. code-block:: bash

    $ breadability http://wiki.python.org/moin/BeginnersGuide

Options
```````

- **b** will write out the parsed content to a temp file and open it in a
  browser for viewing.
- **d** will write out debug scoring statements to help track why a node was
  chosen as the document and why some nodes were removed from the final
  product.
- **f** will override the default behaviour of getting an html fragment (<div>)
  and give you back a full <html> document.
- **v** will output in verbose debug mode and help let you know why it parsed
  how it did.


Python API
~~~~~~~~~~
.. code-block:: python

    from __future__ import print_function

    from breadability.readable import Article


    if __name__ == "__main__":
        document = Article(html_as_text, url=source_url)
        print(document.readable)


Work to be done
---------------
Yep, I've got some catching up to do. I don't do pagination, I've got a lot of
custom tweaks I need to get going, there are some articles that fail to parse.
I also have more tests to write on a lot of the cleaning helpers, but
hopefully things are setup in a way that those can/will be added.

Fortunately, I need this library for my tools:

- https://bmark.us
- http://r.bmark.us

so I really need this to be an active and improving project.


Off the top of my heads TODO list:

- Support metadata from parsed article [url, confidence scores, all
  candidates we thought about?]
- More tests, more thorough tests
- More sample articles we need to test against in the test_articles
- Tests that run through and check for regressions of the test_articles
- Tidy'ing the HTML that comes out, might help with regression tests ^^
- Multiple page articles
- Performance tuning, we do a lot of looping and re-drop some nodes that
  should be skipped. We should have a set of regression tests for this so
  that if we implement a change that blows up performance we know it right
  away.
- More docs for things, but sphinx docs and in code comments to help
  understand wtf we're doing and why. That's the biggest hurdle to some of
  this stuff.


Inspiration
~~~~~~~~~~~

- `python-readability`_
- `decruft`_
- `readability`_



.. _readability: http://code.google.com/p/arc90labs-readability/
.. _TravisCI: http://travis-ci.org/
.. _decruft: https://github.com/dcramer/decruft
.. _python-readability: https://github.com/buriy/python-readability


.. :changelog:

Changelog for breadability
==========================

0.1.20 (April 13th 2014)
-------------------------
- Don't include tests in sdist builds.

0.1.19 (April 13th 2014)
--------------------------
- Replace charade with chardet for easier packaging.

0.1.18 (April 6th 2014)
------------------------
- Improved decoding of the page into Unicode.

0.1.17 (Jan 22nd 2014)
----------------------
- More log quieting down to INFO vs WARN

0.1.16 (Jan 22nd 2014)
----------------------
- Clean up logging output at warning when it's not a true warning

0.1.15 (Nov 29th 2013)
----------------------
- Merge changes from 0.1.14 of breadability with the fork https://github.com/miso-belica/readability.py and tweaking to return to the name breadability.
- Fork: Added property ``Article.main_text`` for getting text annotated with
  semantic HTML tags (<em>, <strong>, ...).
- Fork: Join node with 1 child of the same type. From
  ``<div><div>...</div></div>`` we get ``<div>...</div>``.
- Fork: Don't change <div> to <p> if it contains <p> elements.
- Fork: Renamed test generation helper 'readability_newtest' -> 'readability_test'.
- Fork: Renamed package to readability. (Renamed back)
- Fork: Added support for Python >= 3.2.
- Fork: Py3k compatible package 'charade' is used instead of 'chardet'.

0.1.14 (Nov 7th 2013)
---------------------
- Update sibling append to only happen when sibling doesn't already exist.

0.1.13 (Aug 31st 2013)
----------------------
- Give images in content boy a better chance of survival
- Add tests

0.1.12 (July 28th 2013)
-----------------------
- Add a user agent to requests.

0.1.11 (Dec 12th 2012)
----------------------
- Add argparse to the install requires for python < 2.7

0.1.10 (Sept 13th 2012)
-----------------------
- Updated scoring bonus and penalty with , and " characters.

0.1.9 (Aug 27nd 2012)
---------------------
- In case of an issue dealing with candidates we need to act like we didn't
  find any candidates for the article content. #10

0.1.8 (Aug 27nd 2012)
---------------------
- Add code/tests for an empty document.
- Fixes #9 to handle xml parsing issues.

0.1.7 (July 21nd 2012)
----------------------
- Change the encode 'replace' kwarg into a normal arg for older python
  version.

0.1.6 (June 17th 2012)
----------------------
- Fix the link removal, add tests and a place to process other bad links.

0.1.5 (June 16th 2012)
----------------------
- Start to look at removing bad links from content in the conditional cleaning
  state. This was really used for the scripting.com site's garbage.

0.1.4 (June 16th 2012)
----------------------
- Add a test generation helper readability_newtest script.
- Add tests and fixes for the scripting news parse failure.

0.1.3 (June 15th 2012)
----------------------
- Add actual testing of full articles for regression tests.
- Update parser to properly clean after winner doc node is chosen.

0.1.2 (May 28th 2012)
---------------------
- Bugfix: #4 issue with logic of the 100char bonus points in scoring
- Garden with PyLint/PEP8
- Add a bunch of tests to readable/scoring code.

0.1.1 (May 11th 2012)
---------------------
- Fix bugs in scoring to help in getting right content
- Add concept of -d which shows scoring/decisions on nodes
- Update command line client to be able to pipe output to other tools

0.1.0 (May 6th 2012)
--------------------
- Initial release and upload to PyPi


