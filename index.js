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
