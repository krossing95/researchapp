const mongoose = require('mongoose');
const { currentTime } = require('../custom');


const VerificationSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    verificationCode: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: currentTime()
    }
},
    {
        timestamps: true
    }
);

const Verification = mongoose.model('verification', VerificationSchema);

module.exports = Verification;