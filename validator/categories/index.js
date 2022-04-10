module.exports = {
    createValidate: (category, description, next) => {
        if (!category.length || !description.length) {
            return { status: true, error: 'Both fields are required' }
        } else if (category.length < 3 || category.length >30) {
            return { status: true, error: 'Category must be at least 3 chars and at most 30 chars' }
        } else if (description.length < 10) {
            return { status: true, error: 'Description must be at least 10 chars.' }
        } else{
            const alphaRegex = /^[a-zA-Z ]*$/;
            if (!category.match(alphaRegex)) {
                return { status: true, error: 'Category must contain only alphabets and whitespaces' }
            }
            return next();
        }
    },
    updateValidate: (category, description, status, next) => {
        if (!category.length || !description.length) {
            return { status: true, error: 'Category and description fields are required' }
        } else if (category.length < 3 || category.length >30) {
            return { status: true, error: 'Category must be at least 3 chars and at most 30 chars' }
        } else if (description.length < 10) {
            return { status: true, error: 'Description must be at least 10 chars.' }
        } else{
            const allowed = [1, 2];
            if (!allowed.includes(status)) {
                return { status: true, error: 'Chosen status was rejected' }
            }
            const alphaRegex = /^[a-zA-Z ]*$/;
            if (!category.match(alphaRegex)) {
                return { status: true, error: 'Category must contain only alphabets and whitespaces' }
            }
            return next();
        }
    }
}