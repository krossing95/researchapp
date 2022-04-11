const mongoose = require('mongoose');

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
        required: true
    }
},
    {
        timestamps: true
    }
);

const Verification = mongoose.model('verification', VerificationSchema);

module.exports = Verification;