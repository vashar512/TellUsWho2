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
//var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});


//config
/*
var FacebookUserSchema = new mongoose.Schema({
	fbId: String,
	email: { type: String, lowercase: true },
	name: String
});
var FbUsers = mongoose.model('fbs', FacebookUserSchema);

passport.use(new LocalStrategy(function(username, password, done){
	Users.findOne({ username: username}, function(err, user){
		if(err) { return done(err); }
		if(!user) {
			return done(null, false, { message: 'Incorrect Username.' });
		}

		hash( password, user.salt, function(err, hash) {
			if(err) { return done(err); }
			if(hash == user.hash) return done(null, user);
			done(null, false, { message: 'Incorrect Password' });
		});
	});
}));
*/

passport.use(new FacebookStrategy({
	clientID: config.facebook.clientID,
	clientSecret: config.facebook.clientSecret,
	callbackURL: config.facebook.callbackURL
},
function(accessToken, refreshToken, profile, done) {
/*	FbUsers.findOne({fbId:profile.id}, function(err, olduser) {
		if(oldUser){
			done(null, oldUser);
		} else {
			var newUser = new FbUsers({ 
				fbId : profile.id,
				email: profile.emails[0].value,
				name : profile.displayName
			}).save(function(err,newUser){
				if(err) throw err;
				done(null, newUser);
			});
		}	
	});	*/
	var fbReq = https.request({
		hostname: 'graph.facebook.com',
		method: 'GET',
		path: '/v2.0/me/taggable_friends?access_token=' + accessToken
	}, function(fbRes) {
		var output = '';
		fbRes.setEncoding('utf8');
		fbRes.on('data', function(chunk) {
			//console.log(">>Length of data " + chunk.length);
			output += chunk;
			//console.log(">>Output " + output);
		});

		fbRes.on('end', function() {
		    console.log(">>Output: " + output);			
		    //return res.render('/account', {data: output});
		});
		//console.log(">>Output 2 " + output);
	});

	fbReq.on('error', function(err) {
		console.log(">>Error: " + err);
	});

	fbReq.end();

	process.nextTick(function() {
		return done(null, profile);
	});
}
));


// global config
var app = express();
app.set('port', process.env.PORT || 1337);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger());
app.use(express.favicon());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret:'dog', cookie:{maxAge:100000}}));
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
app.configure(function() {
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');
	//app.use(express.logger());
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({ secret: 'my_precious' }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(express.static(__dirname + '/public'));	
	//app.use(express.methodOverride());
	app.use(app.router);
	
});
*/

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
	res.render('account', { user: req.user });
});
app.get('/', function(req, res) {
	res.render('login', { user: req.user });
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['user_friends', ]}), function(req, res){});
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), function(req, res){
	res.redirect('/account');
});
app.get('/logout', function(req, res) {
	req.session.destroy( function (){ res.redirect('/'); });
	//req.session.save();
	//req.logout();
	//res.redirect('/');
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
