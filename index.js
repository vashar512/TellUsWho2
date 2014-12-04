var express = require('express');
var app = express();
// dependencies
var fs = require('fs');
var OAuth = require('oauth');
var http = require('http');
var https = require('https');
var express = require('express');
var routes = require('./routes');
var path = require('path');
var mongoose = require('mongoose');
var mongodb = require('mongodb');
//var config = require('./oauth.js');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LinkedinStrategy = require('passport-linkedin-oauth2').Strategy;

var fbFriendsList;
var twitterFriendsList;
var googlePlusFriendsList;
var linkedinFriendsList;
var primaryAccountName;
var primaryAccountId;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

mongoose.connect(process.env.MONGOLAB_URI);

//create user model
var User = mongoose.model('User', {
  oauthID: Number,
  name: String
});

var Friend = mongoose.model('Friends', {
  name: String,
  primaryPicture: String,
  fbUniqueID: String,
  fbPicture: String,
  twitterUniqueID: String,
  twitterPicture: String,
  googleUniqueID: String,
  googlePicture: String,
  linkedinUniqueID: String,
  connectionName: String,
  connectionOauthID: String
});

passport.use(new FacebookStrategy({
  //clientID: config.facebook.clientID,
  //clientSecret: config.facebook.clientSecret,
  //callbackURL: config.facebook.callbackURL
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL
},
function(accessToken, refreshToken, profile, done) {
  console.log("Facebook Profile: " + JSON.stringify(profile));
  //Getting Friends List for User
  var fbReq = https.request({
    hostname: 'graph.facebook.com',
    method: 'GET',
    path: '/v2.0/me/taggable_friends?access_token=' + accessToken
  }, function(fbRes) {
    var output = '';
    fbRes.setEncoding('utf8');
    fbRes.on('data', function(chunk) {
      output += chunk;
    });

    fbRes.on('end', function() {
      fbFriendsList = JSON.parse(output);
      for(friend in fbFriendsList.data) {
             addFriends(fbFriendsList, friend, profile, "Facebook");
      }
    });
  });

  fbReq.on('error', function(err) {
    console.log(">>Error: " + err);
  });

  fbReq.end();
  //End Request to get Friends

  checkUser(profile, done);
  process.nextTick(function() {
    return done(null, profile);
  });
}
));

passport.use(new TwitterStrategy({
        //oauth_token: config.twitter.oauth_token,
        //oauth_token_secret: config.twitter.oauth_token_secret,
        //consumerKey: config.twitter.consumerKey,
        //consumerSecret: config.twitter.consumerSecret,
        //callbackURL: config.twitter.callbackURL
  oauth_token: process.env.TWITTER_OAUTH_KEY,
  oauth_token_secret: process.env.TWITTER_OAUTH_SECRET,
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK_URL
},
function(accessToken, refreshToken, profile, done) {
        var oauth = new OAuth.OAuth(
                'https://api.twitter.com/oauth/request_token',
                'https://api.twitter.com/oauth/access_token',
                process.env.TWITTER_CONSUMER_KEY,
                process.env.TWITTER_CONSUMER_SECRET,
                '1.0A',
                null,
                'HMAC-SHA1'
        );
        oauth.get(
              'https://api.twitter.com//1.1/friends/list.json',
              process.env.TWITTER_OAUTH_KEY, //test user token
              process.env.TWITTER_OAUTH_SECRET, //test user secret
              function (e, data, res, done){
                if (e) console.error(e);
    var twitterFriendsList = JSON.parse(data);
    for(friend in twitterFriendsList.users) {
      addFriends(twitterFriendsList, friend, profile, "Twitter");
    }
        });

  checkUser(profile, done);
        process.nextTick(function() {
                return done(null, profile);
        });
}
));

passport.use(new GoogleStrategy({
        //clientID: config.google.clientID,
        //clientSecret: config.google.clientSecret,
        //callbackURL: config.google.callbackURL
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
function(token, refreshToken, profile, done) {
  var googleReq = https.request({
    hostname: 'www.googleapis.com',
    method: 'GET',
    path: '/plus/v1/people/me/people/visible?access_token=' + token
  }, function(googleRes) {
    var output = '';
    googleRes.setEncoding('utf8');
    googleRes.on('data', function(chunk) {
      output += chunk;
    });

    googleRes.on('end', function() {
      googlePlusFriendsList = JSON.parse(output);
      for(friend in googlePlusFriendsList.items) {
        if(googlePlusFriendsList.items[friend].objectType == "person") {
          console.log(googlePlusFriendsList.items[friend].displayName + " " + friend);
          addFriends(googlePlusFriendsList, friend, profile, "GooglePlus");
        }
      }

    });
  });

  googleReq.on('error', function(err) {
    console.log(">>Error: " + err);
  });

  googleReq.end();

        process.nextTick(function() {
                return done(null, profile);
        });
}));

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(app.router);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger());
app.use(express.favicon());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret:'dog'}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(request, response) {
  response.render('index2', { title: "Start Bootstrap"});
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
