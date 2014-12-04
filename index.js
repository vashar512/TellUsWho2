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
