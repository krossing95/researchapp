const mongoose = require('mongoose');

const ReasonSchema = new mongoose.Schema({
    reason: {
        type: String,
        required: true
    },
    suggestion: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Reason = mongoose.model('user_reasons', ReasonSchema);
module.exports = Reason;