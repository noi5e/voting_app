// old server.js

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
mongoose.connect(process.env['MONGODB_URI'])
var db = mongoose.connection;

var routes = require('./routes/index');
var users = require('./routes/users');
var polls = require('./routes/polls');

// initiate app
var app = express();

// authenticated user can keep their polls and come back later to access them.
// authenticated user can share polls with friends.
// authenticated user can see the aggregate results of polls.
// authenticated user can delete polls they decide they don't want anymore.
// authenticated user can create poll with any number of possible items.
// authenticated user can create a new option on a poll, if they don't like any of the current options.

// even unauthenticated users can see and vote on everyone's polls.
// even unauthenticated users can see the results of polls in chart form (chart.js or google charts).

// set view engine
app.set('views', path.join(__dirname, 'views'));
// app.engine('handlebars', exphbs({ defaultLayout: 'layout' }));
app.set('view engine', 'pug');

// bodyparser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// set static folder
app.use(express.static(path.join(__dirname, 'public')));

// express session
app.use(session({
	secret: 'pizza rat',
	saveUninitialized: true,
	resave: true
}));

// passport initialization
app.use(passport.initialize());
app.use(passport.session());

// express validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// connect flash
app.use(flash());

// global vars
app.use(function(request, response, next) {
	response.locals.success_msg = request.flash('success_msg');
	response.locals.error_msg = request.flash('error_msg');
	response.locals.error = request.flash('error');
	response.locals.user = request.user || null;
	next();
});

app.use('/', routes);
app.use('/users', users);
app.use('/polls', polls);

// set port
app.listen(process.env['PORT'] || 8080, function() {
	console.log('App listening on port 8080!');
});