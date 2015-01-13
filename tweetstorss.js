//The MIT License (MIT)
	
	//Copyright (c) 2015 Dave Winer
	
	//Permission is hereby granted, free of charge, to any person obtaining a copy
	//of this software and associated documentation files (the "Software"), to deal
	//in the Software without restriction, including without limitation the rights
	//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	//copies of the Software, and to permit persons to whom the Software is
	//furnished to do so, subject to the following conditions:
	
	//The above copyright notice and this permission notice shall be included in all
	//copies or substantial portions of the Software.
	
	//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	//SOFTWARE.

var myVersion = "0.44", myProductName = "tweetsToRss", myProductUrl = "https://github.com/scripting/tweetsToRss";

var fs = require ("fs");
var twitterAPI = require ("node-twitter-api");

var twitterConsumerKey = process.env.twitterConsumerKey;
var twitterConsumerSecret = process.env.twitterConsumerSecret;
var accessToken = process.env.twitterAccessToken;
var accessTokenSecret = process.env.twitterAccessTokenSecret;
var twitterScreenName = process.env.twitterScreenName;
var pathRssFile = process.env.pathRssFile;

var defaultRssFilePath = "rss.xml";
var flSkipReplies = true;

function twTwitterDateToGMT (twitterDate) { //7/16/14 by DW
	return (new Date (twitterDate).toGMTString ());
	}
function stringLower (s) { //1/13/15 by DW
	return (s.toLowerCase ());
	}
function filledString (ch, ct) { //6/4/14 by DW
	var s = "";
	for (var i = 0; i < ct; i++) {
		s += ch;
		}
	return (s);
	}
function encodeXml (s) { //7/15/14 by DW
	if (s === undefined) {
		return ("");
		}
	else {
		var charMap = {
			'<': '&lt;',
			'>': '&gt;',
			'&': '&amp;',
			'"': '&'+'quot;'
			};
		s = s.toString();
		s = s.replace(/\u00A0/g, " ");
		var escaped = s.replace(/[<>&"]/g, function(ch) {
			return charMap [ch];
			});
		return escaped;
		}
	}
function trimWhitespace (s) { //rewrite -- 5/30/14 by DW
	function isWhite (ch) {
		switch (ch) {
			case " ": case "\r": case "\n": case "\t":
				return (true);
			}
		return (false);
		}
	if (s === undefined) { //9/10/14 by DW
		return ("");
		}
	while (isWhite (s.charAt (0))) {
		s = s.substr (1);
		}
	while (s.length > 0) {
		if (!isWhite (s.charAt (0))) {
			break;
			}
		s = s.substr (1);
		}
	while (s.length > 0) {
		if (!isWhite (s.charAt (s.length - 1))) {
			break;
			}
		s = s.substr (0, s.length - 1);
		}
	return (s);
	}
function beginsWith (s, possibleBeginning, flUnicase) { 
	if (s.length == 0) { //1/1/14 by DW
		return (false);
		}
	if (flUnicase === undefined) {
		flUnicase = true;
		}
	if (flUnicase) {
		for (var i = 0; i < possibleBeginning.length; i++) {
			if (s [i].toLowerCase () != possibleBeginning [i].toLowerCase ()) {
				return (false);
				}
			}
		}
	else {
		for (var i = 0; i < possibleBeginning.length; i++) {
			if (s [i] != possibleBeginning [i]) {
				return (false);
				}
			}
		}
	return (true);
	}
function endsWith (s, possibleEnding, flUnicase) {
	if ((s === undefined) || (s.length == 0)) { 
		return (false);
		}
	var ixstring = s.length - 1;
	if (flUnicase === undefined) {
		flUnicase = true;
		}
	if (flUnicase) {
		for (var i = possibleEnding.length - 1; i >= 0; i--) {
			if (stringLower (s [ixstring--]) != stringLower (possibleEnding [i])) {
				return (false);
				}
			}
		}
	else {
		for (var i = possibleEnding.length - 1; i >= 0; i--) {
			if (s [ixstring--] != possibleEnding [i]) {
				return (false);
				}
			}
		}
	return (true);
	}
function getBoolean (val) {  
	switch (typeof (val)) {
		case "string":
			if (val.toLowerCase () == "true") {
				return (true);
				}
			break;
		case "boolean":
			return (val);
			break;
		case "number":
			if (val != 0) {
				return (true);
				}
			break;
		}
	return (false);
	}

function newTwitter (myCallback) {
	var twitter = new twitterAPI ({
		consumerKey: twitterConsumerKey,
		consumerSecret: twitterConsumerSecret,
		callback: myCallback
		});
	return (twitter);
	}
function getTwitterTimeline (username, callback) {
	var twitter = newTwitter ();
	var params = {screen_name: username, trim_user: "false"};
	twitter.getTimeline ("user", params, accessToken, accessTokenSecret, function (err, data, response) {
		if (err) {
			var errinfo = JSON.parse (err.data);
			console.log ("getTwitterTimeline: error == \"" + errinfo.errors [0].message + "\"");
			}
		else {
			if (callback != undefined) {
				callback (data);
				}
			}
		});
	}

function getFeed (username) {
	if (username != undefined) {
		var rssHeadElements, rssHistory = new Array ();
		function buildRssFeed (headElements, historyArray) {
			function encode (s) {
				if (s === undefined) {
					return ("");
					}
				var lines = encodeXml (s).split (String.fromCharCode (10));
				var returnedstring = "";
				for (var i = 0; i < lines.length; i++) {
					returnedstring += trimWhitespace (lines [i]);
					if (i < (lines.length - 1)) {
						returnedstring += "&#10;";
						}
					}
				return (returnedstring);
				}
			function whenMostRecentTweet () {
				if (historyArray.length > 0) {
					return (new Date (historyArray [0].when));
					}
				else {
					return (new Date (0));
					}
				}
			function buildOutlineXml (theOutline) {
				function addOutline (outline) {
					var s = "<source:outline";
					function hasSubs (outline) {
						return (outline.subs != undefined) && (outline.subs.length > 0);
						}
					function addAtt (name) {
						if (outline [name] != undefined) {
							s += " " + name + "=\"" + encode (outline [name]) + "\" ";
							}
						}
					addAtt ("text");
					addAtt ("type");
					addAtt ("created");
					addAtt ("name");
					
					if (hasSubs (outline)) {
						add (s + ">");
						indentlevel++;
						for (var i = 0; i < outline.subs.length; i++) {
							addOutline (outline.subs [i]);
							}
						add ("</source:outline>");
						indentlevel--;
						}
					else {
						add (s + "/>");
						}
					
					}
				addOutline (theOutline);
				return (xmltext);
				}
			var xmltext = "", indentlevel = 0, starttime = new Date (); nowstring = starttime.toGMTString ();
			var username = headElements.twitterScreenName, maxitems = headElements.maxFeedItems;
			function add (s) {
				xmltext += filledString ("\t", indentlevel) + s + "\n";
				}
			function addAccount (servicename, username) {
				if ((username != undefined) && (username.length > 0)) { 
					add ("<source:account service=\"" + encode (servicename) + "\">" + encode (username) + "</source:account>");
					}
				}
			add ("<?xml version=\"1.0\"?>")
			add ("<!-- RSS generated by " + myProductName + " on " + nowstring + " -->")
			add ("<rss version=\"2.0\" xmlns:source=\"http://source.smallpict.com/2014/07/12/theSourceNamespace.html\">"); indentlevel++
			add ("<channel>"); indentlevel++;
			//add header elements
				add ("<title>" + encode (headElements.title) + "</title>");
				add ("<link>" + encode (headElements.link) + "</link>");
				add ("<description>" + encode (headElements.description) + "</description>");
				add ("<pubDate>" + whenMostRecentTweet ().toUTCString () + "</pubDate>"); 
				add ("<lastBuildDate>" + nowstring + "</lastBuildDate>");
				add ("<language>" + encode (headElements.language) + "</language>");
				add ("<generator>" + headElements.generator + "</generator>");
				add ("<docs>" + headElements.docs + "</docs>");
				addAccount ("twitter", username); 
			//add items
				var ctitems = 0;
				for (var i = 0; (i < historyArray.length) && (ctitems < maxitems); i++) {
					var item = historyArray [i], itemcreated = twTwitterDateToGMT (item.when), itemtext = encode (item.text);
					var linktotweet = encode ("https://twitter.com/" + username + "/status/" + item.idTweet);
					add ("<item>"); indentlevel++;
					add ("<description>" + itemtext + "</description>"); 
					add ("<pubDate>" + itemcreated + "</pubDate>"); 
					//link -- 8/12/14 by DW
						if (item.link != undefined) {
							add ("<link>" + encode (item.link) + "</link>"); 
							}
						else {
							add ("<link>" + linktotweet + "</link>"); 
							}
					//source:linkShort -- 8/26/14 by DW
						if (item.linkShort != undefined) {
							add ("<source:linkShort>" + encode (item.linkShort) + "</source:linkShort>"); 
							}
					//guid -- 8/12/14 by DW
						if (item.guid != undefined) {
							if (getBoolean (item.guid.flPermalink)) {
								add ("<guid>" + encode (item.guid.value) + "</guid>"); 
								}
							else {
								add ("<guid isPermaLink=\"false\">" + encode (item.guid.value) + "</guid>"); 
								}
							}
						else {
							add ("<guid>" + linktotweet + "</guid>"); 
							}
					//enclosure -- 8/11/14 by DW
						if (item.enclosure != undefined) {
							var enc = item.enclosure;
							if ((enc.url != undefined) && (enc.type != undefined) && (enc.length != undefined)) {
								add ("<enclosure url=\"" + enc.url + "\" type=\"" + enc.type + "\" length=\"" + enc.length + "\"/>");
								}
							}
					//source:outline
						if (item.outline != undefined) { //10/15/14 by DW
							buildOutlineXml (item.outline);
							}
						else {
							if (item.idTweet != undefined) {
								add ("<source:outline text=\"" + itemtext + "\" created=\"" + itemcreated + "\" type=\"tweet\" tweetId=\"" + item.idTweet + "\" tweetUserName=\"" + encode (item.twitterScreenName) + "\"/>");
								}
							if (item.enclosure != undefined) { //9/23/14 by DW
								var enc = item.enclosure;
								if (enc.type != undefined) { //10/25/14 by DW
									if (beginsWith (enc.type.toLowerCase (), "image")) {
										add ("<source:outline text=\"" + itemtext + "\" created=\"" + itemcreated + "\" type=\"image\" url=\"" + enc.url + "\"/>");
										}
									}
								}
							}
					add ("</item>"); indentlevel--;
					ctitems++;
					}
			add ("</channel>"); indentlevel--;
			add ("</rss>"); indentlevel--;
			return (xmltext);
			}
		function addFeedItem (t) {
			var username = t.user.screen_name;
			var userbaseurl = "http://twitter.com/" + username + "/";
			rssHeadElements = {
				title: username + "'s RSS Feed",
				link: userbaseurl,
				description: "A feed generated from " + username + "'s tweets by " + myProductUrl,
				language: "en-us",
				generator: myProductName,
				docs: "http://cyber.law.harvard.edu/rss/rss.html",
				twitterScreenName: username,
				maxFeedItems: 25
				};
			//try to split the tweet text into text and a link
				var s = t.text, link = undefined;
				for (var i = s.length - 1; i >= 0; i--) {
					if (s [i] == " ") {
						var x = s.substr (i + 1);
						if (beginsWith (x, "http://")) {
							s = s.substr (0, i);
							link = x;
							}
						break;
						}
					}
			rssHistory [rssHistory.length] = {
				when: new Date (t.created_at),
				text: s,
				idTweet: t.id_str,
				link: link,
				guid: {
					flPermalink: true,
					value: userbaseurl + "status/" + t.id_str
					}
				};
			}
		getTwitterTimeline (username, function (theTweets) { 
			for (var i = 0; i < theTweets.length; i++) {
				var thisTweet = theTweets [i], s = thisTweet.text, flInclude = true;
				if (flSkipReplies) {
					if (thisTweet.in_reply_to_status_id != null) { //it's a reply
						flInclude = false;
						}
					}
				if (flInclude) {
					addFeedItem (thisTweet);
					}
				}
			var xmltext = buildRssFeed (rssHeadElements, rssHistory);
			fs.writeFile (pathRssFile, xmltext, function (err) {
				console.log ("getFeed: " + xmltext.length + " chars in " + pathRssFile);
				});
			});
		}
	}

function everyMinute () {
	getFeed (twitterScreenName)
	}
function startup () {
	console.log ();
	console.log (myProductName + " v" + myVersion + ".");
	console.log ();
	
	//check pathRssFile -- 1/12/15 by DW
		if (pathRssFile == undefined) {
			pathRssFile = defaultRssFilePath;
			}
		else {
			pathRssFile = trimWhitespace (pathRssFile);
			if (endsWith (pathRssFile, "/")) {
				pathRssFile += "rss.xml";
				}
			}
	
	everyMinute (); //call once at startup, then every minute
	setInterval (everyMinute, 60000); 
	}
startup ();

