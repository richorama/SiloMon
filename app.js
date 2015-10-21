var express = require('express');
var http = require('http');
var path = require('path');
var app = express();
var accountStorage = require('./common/accountTableStorage');

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var WindowsLiveStrategy = require('passport-windowslive');

// all environments
app.set('port', process.env.PORT || 3000);
//app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: process.env.SESSION_SECRET }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

//http://prestonpham.com/posts/google-oauth2/
// AUTH
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK,
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(accessToken);
    console.log(profile);
    accountStorage.queryUser(profile.id, function(err, accounts){
        var user = {
            identifier : accessToken,
            profile: profile,
            accounts: accounts
        };
        done(err, user);
    });
  }
));

passport.use(new WindowsLiveStrategy({
    clientID: process.env.WINDOWS_CLIENT_ID,
    clientSecret: process.env.WINDOWS_CLIENT_SECRET,
    callbackURL: process.env.WINDOWS_CALLBACK
  },
  function(accessToken, refreshToken, profile, done) {
    accountStorage.queryUser(profile.id, function(err, accounts){
        var user = {
            identifier : accessToken,
            profile: profile,
            accounts: accounts
        };
        done(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Redirect the user to Google for authentication.  When complete, Google
// will redirect the user back to the application at
//     /auth/google/return
app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/windowslive', passport.authenticate('windowslive', { scope: ['wl.signin', 'wl.basic'] }));

// Google will redirect the user to this URL after authentication.  Finish
// the process by verifying the assertion.  If valid, the user will be
// logged in.  Otherwise, authentication has failed.
app.get('/auth/google/callback', 
  passport.authenticate('google', { successRedirect: '/',
                                    failureRedirect: '/login' }));

app.get('/auth/windowslive/callback', passport.authenticate('windowslive', { failureRedirect: '/login' }), function(req, res) {
    res.redirect('/');
});

var auth = function(req, res, next){
    if (req.isAuthenticated()){
        return next();
    } else {
        res.json({error:"NotAuthenticated"});
    }
}

require('./controllers/api')(app, auth);
require('./controllers/account')(app, auth);

app.get('/', function(req, res){
    res.sendfile("public/index.html");
});

app.get('/ping', auth, function(req, res){
    res.json({ok:true, displayName:req.user.profile.displayName});    
    try{
        accountStorage.logUserAccess(req.user.profile.id, req.user.profile.displayName)
    } catch (e){
        console.log(e);
    }
});

app.get("/user", auth, function(req, res){
    res.json(req.user);
});

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express is listening on port ' + app.get('port'));
});
