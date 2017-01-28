// polls.js

var express = require('express');
var router = express.Router();

var Hashids = require('hashids');
var hashids = new Hashids('pizza rat');

var d3 = require('d3');
var jsdom = require('jsdom');

var Poll = require('../models/poll');
var User = require('../models/user');

router.get('/create_poll', ensureAuthenticated, function(request, response) {
  response.render('create_poll');
});

router.get('/my_polls', ensureAuthenticated, function(request, response) {

  Poll.find({}).then(function(usersPolls) {

    var codeTitlePairs = {};

    for (var i = 0; i < usersPolls.length; i++) {
      var code = hashids.encodeHex(usersPolls[i]._id.toString());

      codeTitlePairs[code] = usersPolls[i].question;
    }

    console.log(codeTitlePairs);

    response.render('my_polls', { codeTitlePairs: codeTitlePairs });
  });
});

router.get('/(*)/', function(request, response) {

  Poll.findOne({ _id:  hashids.decodeHex(request.params[0]) }, function(error, poll) {

    var htmlForJsdom = '<!DOCTYPE html><html><body><div id="pie-chart-container"></div></body></html>';
    var document = jsdom.jsdom(htmlForJsdom);

    // var data = [{ answer: 'Yes', numberOfVotes: 7 }, { answer: 'No', numberOfVotes: 5 }];

    var data = poll.answerChoices;

    var noVotes = false;

    for (var i = 0; i < data.length; i++) {
      if (data[i].numberOfVotes > 0) {
        break;
      }

      if (i === data.length - 1) {
        noVotes = true;
      }
    }

    if (!noVotes) {

      var width = 500,
      height = 500,
      radius = Math.min(width, height) / 2,
      color = d3.scaleOrdinal().range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

      var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

      var labelArc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

      var pie = d3.pie()
        .sort(null)
        .value(function(datum) {
          return datum.numberOfVotes;
        });

      var svg = d3.select(document.getElementById('pie-chart-container'))
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('id', 'pie-chart-svg')
      .append('g')
        .attr('transform', 'translate(' + width / 2 + ', ' + height /2 + ')');

      var g = svg.selectAll('.arc')
        .data(pie(data));
      
      g.enter().append('g')
        .attr('class', 'arc')
      .append('path')
        .attr('d', arc)
        .style('fill', function(arcObject) {
          return color(arcObject.data.numberOfVotes);
        });

      svg.selectAll('.arc').append('text')
        .attr('transform', function(datum) { return 'translate(' + labelArc.centroid(datum) + ')'; })
        .attr('dy', '.35em')
        .text(function(datum) {
          if (datum.data.numberOfVotes === 0) {
            return "";
          } else {
            return datum.data.answerChoice;
          } 
        });

    }

    var sumOfAllVotes = poll.answerChoices.reduce(function(previous, current) {
      return previous + current.numberOfVotes;
    }, 0);

    var votingTableInfo = poll.answerChoices.map(function(datum) {
      return {
        answerChoice: datum.answerChoice,
        numberOfVotes: datum.numberOfVotes,
        percentageOfVotes: Math.round(datum.numberOfVotes / sumOfAllVotes * 100)
      };
    });

    var chartHTML;

    if (noVotes) {
      chartHTML = '<div style="height: 500px; padding-top: 100px; text-align: center; padding-bottom: 250px;"><h1>No one has voted in this poll.</h1></div>';
    } else {
      chartHTML = document.getElementById('pie-chart-container').outerHTML;
    }

    response.render('individual_poll', { 
      title: poll.question, 
      chart: chartHTML,
      votingInfo: votingTableInfo
    });

  });
});

router.post('/create_poll', function(request, response) {
  var question = request.body.title;
  var choices = request.body.choices.split(/\r?\n/);

  request.checkBody('title', 'Poll title is required.').notEmpty();
  request.checkBody('choices', 'Poll choices are required').notEmpty();

  var errors = request.validationErrors();

  if (errors) {
    response.render('create_poll', {
      errors: errors.map(function(datum) { return datum.msg;  })
    });
  } else {

    User.findOne({ name: request.user.name }, '_id', function(error, user) {
      if (error) throw error;

      var answerChoices = [];

      choices.forEach(function(choice) {
        answerChoices.push({
          answerChoice: choice,
          numberOfVotes: 0
        });
      });

      var newPoll = new Poll({
        author: user._id.toString(),
        question: question,
        answerChoices: answerChoices,
        answers: [],
        dateCreated: new Date(),
      });

      Poll.createPoll(newPoll, function(error, poll) {
        if (error) throw error;
      });

      request.flash('success_msg', "Poll successfully created!");

      response.redirect('/');

    });
  }
});

router.post('/delete_poll', function(request, response) {

  console.log(request.body.deleteThis);

  Poll.remove({ _id: hashids.decodeHex(request.body.deleteThis) }, function(error) {
    if (error) throw error;

    request.flash('error_msg', "You deleted your poll.")

    response.redirect('/polls/my_polls'); 
  });

});

router.post('/user_vote', function(request, response) {

  var referrerUrl = request.headers['referer'].split('/');

  Poll.findOne({ _id: hashids.decodeHex(referrerUrl[referrerUrl.length - 1]) }, function(error, poll) {

    var ipQueryResult = poll.answers.find(function(datum) {
      return datum.ipAddress === request.headers['x-forwarded-for'];
    });

    if (ipQueryResult) {

      request.flash('error_msg', "You already voted in this poll!");

      response.redirect('/polls/' + referrerUrl[referrerUrl.length - 1]);

    } else {
   
      var userVote;

      if (request.body.hasOwnProperty('customOption')) {

        userVote = request.body.customOption;

        // check to see if there is already a voting choice in there with that custom option.
          // if there is, then run the code to add that.

        var customOptionExistsAlready = false;

        for (var i = 0; i < poll.answerChoices.length; i++) {
          if (poll.answerChoices[i].answerChoice === request.body.customOption) {
            customOptionExistsAlready = true;
          }
        }

        if (!customOptionExistsAlready) {
          poll.answerChoices = poll.answerChoices = poll.answerChoices.concat([{ answerChoice: userVote, numberOfVotes: 0 }]);
        }

      } else {

        userVote = request.body.votingSelect;

      }

      for (var i = 0; i < poll.answerChoices.length; i++) {
        if (poll.answerChoices[i].answerChoice === userVote) {
          poll.answerChoices[i].numberOfVotes = poll.answerChoices[i].numberOfVotes + 1;
        }
      }

      poll.answers = poll.answers.concat([{ choice: userVote, ipAddress: request.headers['x-forwarded-for'] }]);

      poll.save();

      request.flash('success_msg', "You voted in the poll! Yay!")

      response.redirect('/polls/' + referrerUrl[referrerUrl.length - 1]);   
      
    }
  });

  //     if there's a match, reject
  //     if there's not a match, then increment the number of votes. also save the vote and ip address to the list of votes.

});

function ensureAuthenticated(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        request.flash('error_msg', 'You are not logged in.');
        response.redirect('/users/login');
    }
}

module.exports = router;