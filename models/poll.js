var mongoose = require('mongoose');

// Poll Schema
var PollSchema = mongoose.Schema({
    author: String,
    question: String,
    answerChoices: [{ answerChoice: String, numberOfVotes: Number }],
    answers: [{ choice: String, ipAddress: String }],
    dateCreated: Date
});

var Poll = module.exports = mongoose.model('Poll', PollSchema);

module.exports.createPoll = function(newPoll, callback) {
    newPoll.save(callback);
};

module.exports.getPollByAuthor = function(author, callback) {
    var query = { author: author };
    Poll.findOne(query, callback);
};

module.exports.getPollById = function(id, callback) {
    Poll.findById(id, callback);
};