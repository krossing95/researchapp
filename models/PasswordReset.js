const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    }
}, {
    timestamps: true
}
);

const PasswordReset = mongoose.model('password_reset', PasswordResetSchema);

module.exports = PasswordReset;