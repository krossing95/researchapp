const mongoose = require('mongoose');
const uniqueness = require('mongoose-unique-validator');


const UserSchema = new mongoose.Schema({
    title: {
        type: String,
        enum: ['Mr.', 'Mrs.', 'Miss', 'Dr.', 'Prof.'],
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    firstname: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 30
    },
    lastname: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 30
    },
    phone: {
        type: Number,
        required: 'Phone number is required',
        minlength: 10,
        maxlength: 10
    },
    email: {
        type: String,
        required: 'Email address is required',
        unique: true,
    },
    password: {
        type: String,
        minlength: 8,
        required: 'Password is required'
    },
    usertype: {
        type: String,
        enum: ['User', 'Administrator', 'Block'],
        default: 'User'
    },
    status: {
        type: Number,
        enum: [1, 2],
        default: 1
    },
    extraDuty: {
        type: Boolean,
        default: false
    },
    photo: {
        type: String,
        default: ''
    },
    photo_id: {
        type: String,
        default: ''
    },
    story: {
        type: String,
        default: ''
    }
},
    {
        timestamps: true
    }
);

UserSchema.plugin(uniqueness, { error: 'Email has been taken' });


const User = mongoose.model('users', UserSchema);

module.exports = User;