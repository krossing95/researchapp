const mongoose = require('mongoose');
const uniqueness = require('mongoose-unique-validator');

const ArchieveCategorySchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    category: {
        type: String,
        maxlength: 30,
        minlength: 3,
        required: 'Category is required',
    },
    description: {
        type: String,
        required: true,
        minlength: 10
    },
    status: {
        type: Number,
        enum: [1, 2],
        default: 1
    }
},{ timestamp: true });

ArchieveCategorySchema.plugin(uniqueness, { error: 'Archieve category exists already' });

const ArchieveCategory = mongoose.model('archieve_categories', ArchieveCategorySchema);

module.exports = ArchieveCategory;