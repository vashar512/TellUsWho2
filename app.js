// dependencies
var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var routes = require('./routes');
var path = require('path');
var mongoose = require('mongoose');
var config = require('./oauth.js');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var fbFriendsList; //Save fbFriendsList into here

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});


//mongodb conig
mongoose.connect('mongodb://localhost/passport-example');

//create user model
var User = mongoose.model('User', {
	oauthID: Number,
	name: String
});

var Friend = mongoose.model('Friends', {
	fbUniqueID: String,
	name: String,
	picture: String,
	userOauthID: Number,
	userName: String
});

passport.use(new FacebookStrategy({
	clientID: config.facebook.clientID,
	clientSecret: config.facebook.clientSecret,
	callbackURL: config.facebook.callbackURL
},
function(accessToken, refreshToken, profile, done) {
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
				addFriends(fbFriendsList, friend);    
			}
		});
	});

	fbReq.on('error', function(err) {
		//console.log(">>Error: " + err);
	});

	fbReq.end();
	//End Request to get Friends

	//Save user and friends in db
	User.findOne({oauthID:profile.id}, function(err, existingUser) {
		if(err) { //console.log(err); 
		}		
		if(!err && existingUser != null){
			done(null, existingUser);
		} else {
			var newUser = new User({ 
				oauthID : profile.id,
				name : profile.displayName
			}).save(function(err){
				if(err) {
					//console.log(">>Error saving new user to DB " + err);
				} else {
					//console.log(">>Successfully added new user");
					//done(null, newUser);
				}
			});
		}
	});
	
	function addFriends(fbFriendsList, index) {	
		Friend.findOne({name:fbFriendsList.data[index].name, picture:fbFriendsList.data[index].picture.data.url}, function(err, existingUser) {
			if(err) { //console.log(err); 
}
			if(!err && existingUser != null) {
				//console.log(">>>>>>>>>>>>>>>>>> Existing friend");
				//Deduping will happen here
				//done(null, existingUser);
			} else {
				var newFriend = new Friend({
				fbUniqueID : fbFriendsList.data[index].id,
				name : fbFriendsList.data[index].name,
	   			picture : fbFriendsList.data[index].picture.data.url,
				userOauthID : profile.id,
				userName : profile.displayName
				}).save(function(err) {
					if(err) {

					} else {
					
	 				}
				});
			}
		});
	}

	process.nextTick(function() {
		return done(null, profile);
	});
}
));


// global config
var app = express();
app.set('port', process.env.PORT || 1994);
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

/*
// mongo config
var MONGOLAB_URI= "add_your_mongolab_uri_here"
var mongo = process.env.MONGOLAB_URI || 'mongodb://localhost/node-bootstrap3-template'
mongoose.connect(mongo);

// mongo model
// var Model_Name = require('add_your_models_here');
*/

// routes
app.get('/', routes.index);
app.get('/ping', routes.ping);
app.get('/account', ensureAuthenticated, function(req, res) {
	res.render('account', { user: req.user});
});

app.get('/:id/friends', ensureAuthenticated, function(req, res) {
	 Friend.find({userOauthID: req.params.id}, function(err, friends) {
		res.render('friends', {
		title: 'Your Friends',
		friends: friends
		});
	});
});


/*app.get('/', function(req, res) {
	//res.render('login', { user: req.user });
});*/
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['user_friends']}), function(req, res){});
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), function(req, res){
	res.redirect('/account');
});
app.get('/logout', function(req, res) {
	req.logout();	
	//req.session.destroy( function (){ res.redirect('/'); });
	res.redirect('/');	
});

// run server
app.listen(app.get('port'), function(){
  console.log('\nExpress server listening on port ' + app.get('port'));
});


//test authentication
function ensureAuthenticated(req, res, next) {
	if(req.isAuthenticated()) { 
		next(); 
	}
	else { res.redirect('/'); }
}

//function userExists(req, res, next) {
//	Users.count({
//		username: req.body.username
//	}, function(err, count) {
//		if(count === 0) {
//			next();
//		} else {
//			res.redirect('/');
//		}
//	});
//}
