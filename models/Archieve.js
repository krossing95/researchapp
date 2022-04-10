const mongoose = require('mongoose');
const uniqueness = require('mongoose-unique-validator');

const ArchieveSchema = new mongoose.Schema({
    user_id: {
        type: String,
        default: ''
    },
    category_id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        minlength: 10,
        maxlength: 150
    },
    slug: {
        type: String,
        required: true
    },
    local_name: {
        type: String,
        required: true
    },
    biological_name: {
        type: String,
        required: true
    },
    classification: [{}],
    literature: [{}],
    pharmacological_props: {
        type:[String],
        default: []
    },
    region: {
        type: String,
        default: ''
    },
    photos: [{}],
    effective_parts: {
        type:[String],
        default: []
    },
    links: {
        type:[String],
        default: []
    },
    status: {
        type: Number,
        enum: [1, 2],
        default: 1
    },
    reviewed_by: {
        type:[String],
        default: []
    },
    comments: [{}],
    likes: {
        type:[String],                            
        default: []
    },
    saves: {
        type:[String],                            
        default: []
    }
}, { timestamps: true });

ArchieveSchema.plugin(uniqueness, { error: 'Same title exists already' });

const Archieve = mongoose.model('archieves', ArchieveSchema);

module.exports = Archieve;