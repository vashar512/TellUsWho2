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

passport.use(new LinkedinStrategy({
        //clientID: config.linkedIn.consumerKey,
        //clientSecret: config.linkedIn.consumerSecret,
        //callbackURL: config.linkedIn.callbackURL,
  clientID: process.env.LINKEDIN_CONSUMER_KEY,
  clientSecret: process.env.LINKEDIN_CONSUMER_SECRET,
  callbackURL: process.env.LINKEDIN_CALLBACK_URL,
  state: true
},
function(accessToken, refreshToken, profile, done) {
  /*var oauth = new OAuth.OAuth(
    'https://api.linkedin.com/uas/oauth/requestToken?token=' + accessToken + '&timestamp=' + Math.round(+new Date()/1000 + 600),
                'https://api.linkedin.com/uas/oauth/accessToken',
                config.linkedIn.consumerKey,
                config.linkedIn.consumerSecret,
                '1.0A',
                null,
                'HMAC-SHA1'
        );
        oauth.get(
              'https://api.linkedin.com/v1/people/~',
              config.linkedIn.oauth_token, //test user token
              config.linkedIn.oauth_token_secret, //test user secret
              function (e, data, res, done){
                if (e) console.error(e);
    console.log(data);
        }
  );*/

  var linkedinReq = https.request({
    hostname: 'api.linkedin.com',
    method: 'GET',
    path: '/v1/people/~/connections:(first-name,last-name,id,picture-url)?oauth2_access_token=' + accessToken + '&format=json'
  }, function(linkedinRes) {
    var output = '';
    linkedinRes.setEncoding('utf8');
    linkedinRes.on('data', function(chunk) {
      output += chunk;
    });

    linkedinRes.on('end', function() {
      linkedinFriendsList = JSON.parse(output);
      console.log(linkedinFriendsList);
      for(friend in linkedinFriendsList.values) {
        addFriends(linkedinFriendsList, friend, profile, "LinkedIn");
      }

    });
  });

  linkedinReq.on('error', function(err) {
    console.log(">>Error: " + err);
  });

  linkedinReq.end();

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

// env config
app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// routes
app.get('/', routes.index);
app.get('/ping', routes.ping);
app.get('/signup', function(req, res) {signup(req, res);})
app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('account2', { user: req.user });
});
app.get('/:id/friends', ensureAuthenticated, function(req, res) {
   Friend.find({connectionOauthID: primaryAccountId/*req.params.id*/}, function(err, friends) {
    res.render('friends2', {
    title: 'Your Friends',
    friends: friends
    });
  });
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['user_friends']}), function(req, res){});
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), function(req, res){
  res.redirect('/account');
});
app.get('/auth/twitter', passport.authenticate('twitter'), function(req, res){});
app.get('/auth/twitter/callback', passport.authenticate('twitter',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/plus.login'] }), function(req, res){});
app.get('/auth/google/callback', passport.authenticate('google',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { scope: ['r_fullprofile', 'r_emailaddress', 'r_contactinfo', 'r_network'] }), function(req, res){});
app.get('/auth/linkedin/callback', passport.authenticate('linkedin',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
/*
app.get('/auth/yahoo', passport.authenticate('yahoo'), function(req, res){
  getYahooOauthVerifier(req, res);
});
app.get('/auth/yahoo/callback', passport.authenticate('yahoo',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
*/
app.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy( function (){ res.redirect('/'); });
});

//test authentication
function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    next();
  }
  else { res.redirect('/'); }
}

function addFriends(FriendsList, index, profile, socialNetwork) {
        if(socialNetwork == "Facebook") {
                addFacebookFriends(FriendsList, profile, index);
        }
        if(socialNetwork == "Twitter") {
                addTwitterFriends(FriendsList, profile, index);
        }
  if(socialNetwork == "GooglePlus") {
    addGooglePlusFriends(FriendsList, profile, index);
  }
  if(socialNetwork == "LinkedIn") {
    addLinkedInFriends(FriendsList, profile, index);
  }
}

function addFacebookFriends(fbFriendsList, profile, index) {
        Friend.findOne({name:fbFriendsList.data[index].name, connectionName:primaryAccountName, connectionOauthID: primaryAccountId}, function(err, existingUser) {
                if(err) { console.log(err); }
                if(!err && existingUser != null) {
                        console.log("Existing friend");
                        //Deduping will happen here
                } else {
      var newFriend = new Friend({
        name : fbFriendsList.data[index].name,
        primaryPicture: fbFriendsList.data[index].picture.data.url,
        fbUniqueID : fbFriendsList.data[index].id,
        fbPicture : fbFriendsList.data[index].picture.data.url,
        twitterUniqueID: "",
        twitterPicture: "",
        googleUniqueID: "",
        googlePicture: "",
        linkedinUniqueID: "",
        connectionName : primaryAccountName,
        connectionOauthID: primaryAccountId
        //connectionUsername : profile.displayName
      }).save(function(err) {
              if(err) {
          console.log("Error Saving to DB");
              } else{

        }
      });
    }
  });
}

function addTwitterFriends(twitterFriendsList, profile, index) {
  Friend.findOne({name:twitterFriendsList.users[index].name, connectionName:primaryAccountName, connectionOauthID: primaryAccountId}, function(err, existingUser) {
    if(err) { console.log(err); }
    if(!err && existingUser != null) {
      console.log("Existing Friend");
    } else {
      var newFriend = new Friend({
        name : twitterFriendsList.users[index].name,
        primaryPicture: twitterFriendsList.users[index].profile_background_image_url,
        fbUniqueID : "",
        fbPicture : "",
        twitterUniqueID : twitterFriendsList.users[index].id,
        twitterPicture: twitterFriendsList.users[index].profile_background_image_url,
        googleUniqueID: "",
        googlePicture: "",
        linkedinUniqueID: "",
        connectionName : primaryAccountName,
        connectionOauthID: primaryAccountId
        //connectionUsername : profile.displayName
      }).save(function(err) {
        if(err) {
          console.log("Error Saving to DB");
        }
      });
    }
  });
}

function addGooglePlusFriends(googlePlusFriendsList, profile, index) {
  console.log("Google Friends List: " + googlePlusFriendsList);
        Friend.findOne({name:googlePlusFriendsList.items[index].displayName, connectionName:primaryAccountName, connectionOauthID: primaryAccountId}, function(err, existingUser) {
                if(err) { console.log(err); }
                if(!err && existingUser != null) {
                        console.log("Existing friend");
                        //Deduping will happen here
                } else {
      var newFriend = new Friend({
        name : googlePlusFriendsList.items[index].displayName,
        primaryPicture: googlePlusFriendsList.items[index].url,
        fbUniqueID : "",
        fbPicture : "",
        twitterUniqueID: "",
        twitterPicture: "",
        googleUniqueID: googlePlusFriendsList.items[index].id,
        googlePicture: googlePlusFriendsList.items[index].url,
        linkedinUniqueID: "",
        connectionName : primaryAccountName,
        connectionOauthID: primaryAccountId
      }).save(function(err) {
              if(err) {
          console.log("Error Saving to DB");
              } else{

        }
      });
    }
  });
}

function addLinkedInFriends(linkedinFriendsList, profile, index) {
  var linkedinName = linkedinFriendsList.values[index].firstName + ' ' + linkedinFriendsList.values[index].lastName;
        Friend.findOne({name:linkedinName, connectionName:primaryAccountName, connectionOauthID: primaryAccountId}, function(err, existingUser) {
                if(err) { console.log(err); }
                if(!err && existingUser != null) {
                        console.log("Existing friend");
                        //Deduping will happen here
                } else {
      var newFriend = new Friend({
        name : linkedinName,
        fbUniqueID : "",
        fbPicture : "",
        twitterUniqueID: "",
        twitterPicture: "",
        googleUniqueID: "",
        googlePicture: "",
        linkedinUniqueID: linkedinFriendsList.values[index].id,
        //linkedinPicture: linkedinFriendsList.values[index].picture,
        connectionName : primaryAccountName,
        connectionOauthID: primaryAccountId
      }).save(function(err) {
              if(err) {
          console.log("Error Saving to DB" + err);
              } else{

        }
      });
    }
  });
}

function checkUser(profile, done) {
        //Save user and friends in db
        User.findOne({name:profile.displayName}, function(err, existingUser) {
                if(err) { console.log(err); }
                if(!err && existingUser != null){
      primaryAccountName = existingUser.name;
      primaryAccountId = existingUser._id;
                        done(null, existingUser);
                } else {
                        var newUser = new User({
                                oauthID : profile.id,
                                name : profile.displayName
                        }).save(function(err){
                                 if(err) {
                                        console.log(">>Error saving new user to DB " + err);
                                } else {
                                        console.log(">>Successfully added new user");
                                }
                        });
                }
        });
}

function signup(req, res) {
  console.log("SIGNING UP " + req.body.name, req.body.username, req.body.password);
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
