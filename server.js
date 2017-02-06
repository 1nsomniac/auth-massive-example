const express = require('express'),
      bodyParser = require('body-parser'),
      massive = require('massive'),
      passport = require('passport'),
      Auth0Strategy = require('passport-auth0'),
      config = require('./config.js'),
      cors = require('cors'),
      jwt = require('jsonwebtoken'),
      cookieParser = require('cookie-parser'),
      session = require('express-session');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
  secret: config.secret,
  saveUninitialized: false,
  resave: true
}))

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('./public'));



/////////////
// DATABASE //
/////////////
const massiveInstance = massive.connectSync({connectionString: 'postgres://localhost/Brett'})

app.set('db', massiveInstance);
const db = app.get('db');

// db.create_user(function(err, user) {
//   if (err) console.log(err);
//   else console.log('CREATED USER');
//   console.log(user);
// })


passport.use(new Auth0Strategy({
   domain:       config.auth0.domain,
   clientID:     config.auth0.clientID,
   clientSecret: config.auth0.clientSecret,
   callbackURL:  '/auth/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    //Find user in database
    db.getUserByAuthId([profile.id], function(err, user) {
      user = user[0];
      if (!user) { //if there isn't one, we'll create one!
        console.log('CREATING USER');
        db.createUserByAuth([profile.displayName, profile.id], function(err, user) {
          console.log('USER CREATED', user);
          return done(err, user[0]);
        })
      } else { //when we find the user, return it
        console.log('FOUND USER', user);
        return done(err, user);
      }
    })
  }
));

passport.serializeUser(function(user, done) {
  console.log('serializing', user);
  done(null, user);
})

passport.deserializeUser(function(user, done) {
  done(null, user);
})



app.get('/auth', passport.authenticate('auth0'))

app.get('/auth/callback',
  passport.authenticate('auth0', {successRedirect: '/'}), function(req, res) {
    res.status(200).send(req.user);
  })

app.get('/auth/me', function(req, res) {
  if (req.user) {
    console.log(req.user);
    res.status(200).send(req.user);
  } else {
    console.log('NO user!')
    res.status(200).send();
  }
})

app.get('/auth/logout', function(req, res) {
  req.logout();
  res.redirect('/');
})

app.listen(3000, function() {
  console.log('Connected on 3000')
})


app.get('/auth/facebook', passport.authenticate('facebook'))

app.get('/auth/facebook/callback',
  passport.authenticate('facebook'), function(req, res) {
    res.status(200).redirect('/#/');
  })