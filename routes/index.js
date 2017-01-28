var express = require('express');
var router = express.Router();

var bcrypt = require('bcryptjs');

var Hashids = require('hashids');
var hashids = new Hashids('pizza rat');

var Poll = require('../models/poll');

// Get Homepage
router.get('/', function(req, res) {
	Poll.find({}, '_id question').then(function(allPolls) {
		var linkTitlePairs = {};

		for (var i = 0; i < allPolls.length; i++) {
			var link = '/polls/' + hashids.encodeHex(allPolls[i]._id.toString())

			linkTitlePairs[link] = allPolls[i].question;
		}

		res.render('index', { linkTitlePairs: linkTitlePairs });
	});
});

router.get('/', function(request, response) {
	response.render('index');
});

module.exports = router;