var express = require('express');
var router = express.Router();

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

// Register
router.get('/register', function(request, response) {
    response.render('register'); 
});

// Login
router.get('/login', function(request, response) {
   response.render('login');
});

router.post('/register', function(request, response) {
    var name = request.body.name;
    var email = request.body.email;
    var username = request.body.username;
    var password = request.body.password;
    var password2 = request.body.password2;
    
    request.checkBody('name', 'Name is required.').notEmpty();
    request.checkBody('email', 'E-mail is required').notEmpty();
    request.checkBody('email', 'E-mail is not valid.').isEmail();
    request.checkBody('username', 'Username is required.').notEmpty();
    request.checkBody('password', 'Password is required.').notEmpty();
    request.checkBody('password2', 'Passwords do not match.').equals(request.body.password);
    
    var errors = request.validationErrors();
    
    if (errors) {
        console.log(errors);
        
        response.render('register', {
            errors: errors.map(function(datum) { return datum.msg })
        });
    } else {
        var newUser = new User({
            name: name,
            email: email,
            username: username,
            password: password
        });
        
        User.createUser(newUser, function(error, user) {
            if (error) throw error;
            
            console.log(user);
        });
        
        request.flash('success_msg', "You are registered and can now login");
        
        response.redirect('login');
    }
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        User.getUserByUsername(username, function(error, user) {
            if (error) throw error;
            
            if (!user) {
                return done(null, false, {message: 'Unknown user.'});
            }
            
            User.comparePassword(password, user.password, function(error, isMatch) {
                if (error) throw error;
                
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Invalid password.' });
                }
            });
        });        
    }
));

passport.serializeUser(function(user, done) {
   done(null, user.id);
});

passport.deserializeUser(function(id, done) {
   User.getUserById(id, function(error, user) {
       done(error, user);
   }) ;
});

router.post('/login', passport.authenticate('local', 
    { successRedirect: '/', failureRedirect: '/users/login', failureFlash: true }), 
    function(request, response) {
    response.redirect('/');
});

router.get('/logout', function(request, response) {
    request.logout();
    
    request.flash('success_msg', 'You are logged out.');
    
    response.redirect('/users/login');
});

module.exports = router;