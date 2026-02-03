const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    scammerId: { type: String, required: true, unique: true },
    conversation: [{ role: String, part: String }],
    extractedInfo: {
        upiIds: [String],
        bankAccounts: [String],
        links: [String]
    }
});

module.exports = mongoose.model('Session', SessionSchema);
