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
var SchemaObject = require('node-schema-object');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var LinkedinStrategy = require('passport-linkedin-oauth2').Strategy;
var linkedinFriendsList;
var twitterFriendsList;
var fbFriendsList;
var googleFriendsList;
var currProfile;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

mongoose.connect(process.env.MONGOLAB_URI);

var Friend = mongoose.model('Friend', {
  name: String,
  primaryPicture: String,
  fbUniqueID: String,
  fbPicture: String,
  twitterUniqueID: String,
  twitterPicture: String,
  googleUniqueID: String,
  googlePicture: String,
  linkedinUniqueID: String,
  linkedinPicture: String
});

//create user model
var User = mongoose.model('User', {
  name: String,
  username: String,
  googleDisplayName: String,
  googleOauthID: String,
  fbDisplayName: String,
  fbOauthID: Number,
  twitterDisplayName: String,
  twitterOauthID: String,
  linkedinDisplayName: String,
  linkedinOauthID: String,
  friends: []
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
function(token, refreshToken, profile, done) {
  currProfile = profile;
  checkUser(profile);
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
      googleFriendsList = JSON.parse(output);
      console.log(googleFriendsList.items[0].image.url);
      for(friend in googleFriendsList.items) {
        if(googleFriendsList.items[friend].objectType == "person") {
          addFriends(googleFriendsList, profile, friend, "Google");
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

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL
},
function(accessToken, refreshToken, profile, done) {
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
             addFriends(fbFriendsList, profile, friend, "Facebook");
      }
    });
  });

  fbReq.on('error', function(err) {
    console.log(">>Error: " + err);
  });

  fbReq.end();
  //End Request to get Friends

  process.nextTick(function() {
    return done(null, profile);
  });
}));

passport.use(new TwitterStrategy({
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
        addFriends(twitterFriendsList, profile, friend, "Twitter");
      }
    }
  );

  process.nextTick(function() {
    return done(null, profile);
  });
}));

passport.use(new LinkedinStrategy({
  clientID: process.env.LINKEDIN_CONSUMER_KEY,
  clientSecret: process.env.LINKEDIN_CONSUMER_SECRET,
  callbackURL: process.env.LINKEDIN_CALLBACK_URL,
  state: true
},
function(accessToken, refreshToken, profile, done) {
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
        addFriends(linkedinFriendsList, profile, friend, "LinkedIn");
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
}));

app.set('port', (process.env.PORT || 1337));
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
app.use(app.router);
app.use(express.static(__dirname + '/public'));

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
app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('account2', { user: req.user });
});
app.get('/:id/friends', ensureAuthenticated, function(req, res) 
{
  User.findOne({name: currProfile.displayName, username: currProfile.emails[0].value}, function(err, existingUser) 
  {
    if(err) { console.log(err); }
    if(!err && existingUser != null) 
    {
      res.render('friends2', 
      {
        title: 'Your Friends',
        friends: existingUser.friends
      })
    }
  });
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/plus.login'] }), function(req, res){});
app.get('/auth/google/callback', passport.authenticate('google',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['user_friends']}), function(req, res){});
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), function(req, res){
  res.redirect('/account');
});
app.get('/auth/twitter', passport.authenticate('twitter'), function(req, res){});
app.get('/auth/twitter/callback', passport.authenticate('twitter',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { scope: ['r_fullprofile', 'r_emailaddress', 'r_contactinfo', 'r_network'] }), function(req, res){});
app.get('/auth/linkedin/callback', passport.authenticate('linkedin',{ failureRedirect: '/' }), function(req, res){
        res.redirect('/account');
});
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

function checkUser(profile) {
  console.log(profile.id);
  console.log(profile.displayName);
  console.log(profile.emails[0].value);
  User.findOne({name: profile.displayName, username: profile.emails[0].value}, function(err, existingUser) {
    if(err) { console.log(err); }
    if(!err && existingUser != null) {
      console.log(">>>>>>>>>> " + existingUser.friends);
      return;
    } else {
      var newUser = new User({
        name: profile.displayName,
        username: profile.emails[0].value,
        googleDisplayName: profile.displayName,
        googleOauthID: profile.id,
        fbDisplayName: "",
        fbOauthID: "",
        twitterDisplayName: "",
        twitterOauthID: "",
        linkedinDisplayName: "",
        linkedinOauthID: "",
        friends: []
      }).save(function(err) {
        if(err) {
          console.log(">> Error saving new user to db " + err);
        } else {
          console.log(">> Successfully added new user to db");
        }
      });
    }
  });
}

function addFriends(FriendsList, profile, index, accountType) {
  if(accountType == "Google") {
    addGoogleFriends(FriendsList, profile, index);
  }
  if(accountType == "Facebook") {
    addFacebookFriends(FriendsList, profile, index);
  }
  if(accountType == "LinkedIn") {
    addLinkedinFriends(FriendsList, profile, index);
  }
  if(accountType == "Twitter") {
    addTwitterFriends(FriendsList, profile, index);
  }
}

function addGoogleFriends(googleFriendsList, profile, index) {
  User.findOne({name: profile.displayName, username: profile.emails[0].value}, function(err, existingUser) {
    if(err) { console.log(err); }
    if(!err && existingUser != null) {
      if(existingUser.friends != null) {
        for(friend in existingUser.friends) {
          if(existingUser.friends[friend].name != undefined) {
            if(existingUser.friends[friend].name == googleFriendsList.items[index].displayName && existingUser.friends[friend].googleUniqueID == googleFriendsList.items[index].id) {
              friendExists = true;
              return;
            } else {
              friendExists = false;
            }
          }
        }
      }
      if(friendExists == false) {
        var newFriend = new Friend({
          name: googleFriendsList.items[index].displayName,
          primaryPicture: googleFriendsList.items[index].image.url,
          fbUniqueID: "",
          fbPicture: "",
          twitterUniqueID: "",
          twitterPicture: "",
          googleUniqueID: googleFriendsList.items[index].id,
          googlePicture: googleFriendsList.items[index].image.url,
          linkedinUniqueID: "",
          linkedinPicture: ""
        });
        existingUser.friends.push(newFriend.toObject());
        existingUser.save();
      }      
    }
  });  
}

function addFacebookFriends(fbFriendsList, profile, index) {
  User.findOne({name:profile.displayName, username:currProfile.emails[0].value}, function(err, existingUser) {
    if(err) { console.log(err); }
    if(!err && existingUser != null) {
      if(existingUser.friends != null) {
        for(friend in existingUser.friends.toObject()) {
          if(existingUser.friends[friend].name) {
            if(existingUser.friends[friend].name == fbFriendsList.data[index].name) {
              if(existingUser.friends[friend].fbUniqueID == fbFriendsList.data[index].id) {
                friendExists = true;
                return;
              }
              else {
                existingUser.friends[friend].fbUniqueID = fbFriendsList.data[index].id;
                existingUser.friends[friend].fbPicture = fbFriendsList.data[index].picture.data.url;
                existingUser.friends.push(existingUser.friends[friend]);
                existingUser.save();
                for(duplicate in existingUser.friends.toObject()) {
                  if(existingUser.friends[duplicate].name == existingUser.friends[friend].name && existingUser.friends[duplicate].fbUniqueID == "") {
                    var indexOfDuplicate = existingUser.friends.indexOf(existingUser.friends[duplicate]);
                    console.log(">>>>" + indexOfDuplicate);
                    console.log(">>>>" + existingUser.friends[indexOfDuplicate]);
                    existingUser.friends.splice(indexOfDuplicate, 1);
                    existingUser.save();
                  }
                }
                friendExists = true;
                return;
              }
            } 
            else {
              friendExists = false;
            }
          }
        }
      }
    } 
    if(friendExists == false) {
      var newFriend = new Friend({
        name: fbFriendsList.data[index].name,
        primaryPicture: fbFriendsList.data[index].picture.data.url,
        fbUniqueID: fbFriendsList.data[index].id,
        fbPicture: fbFriendsList.data[index].picture.data.url,
        twitterUniqueID: "",
        twitterPicture: "",
        googleUniqueID: "",
        googlePicture: "",
        linkedinUniqueID: "",
        linkedinPicture: ""
      });
      existingUser.friends.push(newFriend.toObject());
      existingUser.save();
    }
  });
}

function addTwitterFriends(twitterFriendsList, profile, index) {
  User.findOne({name:profile.displayName, username:currProfile.emails[0].value}, function(err, existingUser) {
    if(err) { console.log(err); }
    if(!err && existingUser != null) {
      if(existingUser.friends != null) {
        for(friend in existingUser.friends.toObject()) {
          if(existingUser.friends[friend].name) {
            if(existingUser.friends[friend].name == twitterFriendsList.users[index].name) {
              if(existingUser.friends[friend].twitterUniqueID == twitterFriendsList.users[index].id) {
                friendExists = true;
                return;
              }
              else {
                existingUser.friends[friend].twitterUniqueID = twitterFriendsList.users[index].id;
                existingUser.friends[friend].twitterPicture = twitterFriendsList.users[index].profile_background_image_url;
                existingUser.friends.push(existingUser.friends[friend]);
                existingUser.save();
                friendExists = true;
                return;
              }
            } 
            else {
              friendExists = false;
            }
          }
        }
      }
    } 
    if(friendExists == false) {
      var newFriend = new Friend({
        name: twitterFriendsList.users[index].name,
        primaryPicture: twitterFriendsList.users[index].profile_background_image_url,
        fbUniqueID: "",
        fbPicture: "",
        twitterUniqueID: twitterFriendsList.users[index].id,
        twitterPicture: twitterFriendsList.users[index].profile_background_image_url,
        googleUniqueID: "",
        googlePicture: "",
        linkedinUniqueID: "",
        linkedinPicture: ""
      });
      existingUser.friends.push(newFriend.toObject());
      existingUser.save();
    }
  });
}

function addLinkedinFriends(linkedinFriendsList, profile, index) {
  var linkedinName = linkedinFriendsList.values[index].firstName + ' ' + linkedinFriendsList.values[index].lastName;
  User.findOne({name:profile.displayName, username:currProfile.emails[0].value}, function(err, existingUser) {
    if(err) { console.log(err); }
    if(!err && existingUser != null) {
      if(existingUser.friends != null) {
        for(friend in existingUser.friends.toObject()) {
          if(existingUser.friends[friend].name) {
            if(existingUser.friends[friend].name == linkedinName) {
              if(existingUser.friends[friend].twitterUniqueID == linkedinFriendsList.values[index].id) {
                friendExists = true;
                return;
              }
              else {
                existingUser.friends[friend].linkedinUniqueID = linkedinFriendsList.values[index].id;
                existingUser.friends[friend].linkedinPicture = linkedinFriendsList.values[index].picture;
                existingUser.friends.push(existingUser.friends[friend]);
                existingUser.save();
                friendExists = true;
                return;
              }
            } 
            else {
              friendExists = false;
            }
          }
        }
      }
    } 
    if(friendExists == false) {
      var newFriend = new Friend({
        name: linkedinName,
        primaryPicture: linkedinFriendsList.values[index].picture,
        fbUniqueID: "",
        fbPicture: "",
        twitterUniqueID: "",
        twitterPicture: "",
        googleUniqueID: "",
        googlePicture: "",
        linkedinUniqueID: linkedinFriendsList.values[index].id,
        linkedinPicture: linkedinFriendsList.values[index].picture
      });
      existingUser.friends.push(newFriend.toObject());
      existingUser.save();
    }
  });
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});

