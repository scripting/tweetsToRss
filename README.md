#### What it is

A node.js app that periodically reads a Twitter account and generates an RSS feed from it.

Written by <a href="http://scripting.com/2015/01/12/goodRssFromTwitter.html">Dave Winer</a>. 

#### Overview

Once it's set up, every minute it gets the most recent tweets for one Twitter account, and writes an RSS file with the content of those tweets.

I've included an <a href="https://github.com/scripting/tweetsToRss/blob/master/exampleFeed.xml">example feed</a> in the repo to show you what one looks like.

#### Set up with Twitter

You need to set four environment variables, to connect this app with Twitter. 

To begin, create a new app at <a href="https://apps.twitter.com/">apps.twitter.com</a>. From there, you'll need to set environment variables with these four values.

1. <i>twitterConsumerKey</i>

2. <i>twitterConsumerSecret</i>

3. <i>twitterAccessToken</i>

4. <i>twitterAccessTokenSecret</i>

You can get these values by clicking on the <i>Test OAuth</i> button in apps.twitter.com, as shown in this <a href="http://scripting.com/2015/01/12/getKeys.png">screen shot</a>. 

All four values are <a href="http://scripting.com/2015/01/12/fourvalues.png">shown</a> on that page. Perfect. ;-)

#### Which Twitter account, where to save the feed

<i>twitterScreenName</i> -- the screen_name of the user whose timeline you want to convert to RSS. Examples of screen names: <a href="https://twitter.com/davewiner">davewiner</a>, <a href="twitter.com/nyt">nyt</a>, <a href="https://twitter.com/dsearls">dsearls</a>, <a href="https://twitter.com/nakedjen">nakedjen</a>.

<i>pathRssFile</i> -- this is the local filesystem path for the file we'll maintain. It's optional, if you don't specify it we write the file as rss.xml in the same folder as the app.

#### Managing multiple feeds

In version 0.45 I added a feature that allows you to watch more than one Twitter account, producing a separate RSS feed for each.

If there's a file called <i>config.json</i> in the same folder as tweetstorss.js, the app will read it every minute, and use the accounts listed in the file, instead of the twitterScreenName environment variable. 

Here's an <a href="https://gist.github.com/scripting/2c0c9faacdef884817d7">example</a> of the config.json file that's running on my system. 

1. The <i>folder</i> value says where to store the generated RSS feeds. It can be a relative path as shown in the example, or can be a path from the root of your filesystem. 

2. The <i>items</i> array is a set of objects, each of which specifies a Twitter username and the name of the RSS file created from the account. 

Because we read the file every time we do a scan, you can change the config.json without having to relaunch tweetstorss.js.

#### Questions, comments?

Please use the <a href="https://groups.google.com/forum/?fromgroups#!topic/server-snacks/KGAqhB3g3Ys">server-snacks</a> list for support.

