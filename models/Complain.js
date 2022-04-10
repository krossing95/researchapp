const mongoose = require('mongoose');


const ComplainSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    
}, 
{ timestamps: true }
);