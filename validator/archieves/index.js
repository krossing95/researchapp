const alphaRegex = /^[a-zA-Z ]*$/;
const titleRegex = /^[\.a-zA-Z0-9,!? ]*$/;

module.exports = {
    createValidate: ( user_id, category_id, title, local_name, biological_name, next ) => {
        if (!user_id.length || !category_id.length || !title.length || !local_name.length || !biological_name.length) {
            return { status: true, error: 'All fields are required' }
        } if (user_id.length < 12 || category_id.length < 12) {
            return { status: true, error: 'Error: Some values are not accurate' }
        } if (title.length < 20 || title.length > 100) {
            return { status: true, error: 'Title must be at least 20 chars and at most 100 chars' }
        } if (local_name.length < 3 || local_name.length > 30) {
            return { status: true, error: 'Local name must be at least 3 chars and at most 30 chars' }
        } if (biological_name.length < 3 || biological_name.length > 30) {
            return { status: true, error: 'Biological name must be at least 3 chars and at most 30 chars' }
        } else {
            if (!local_name.match(alphaRegex) || !biological_name.match(alphaRegex)) {
                return { status: true, error: 'Local name and biological name must contain only alphabets and whitespaces' }
            }
            if (!title.match(titleRegex)) {
                return { status: true, error: 'Invalid expressions noticed in your title' }
            }
            return next();
        }
    },
    checkArrayElements: (array) => {
        let resultant;
        array.map(arr => {
            return resultant = arr.match(alphaRegex);
        })
        if (!resultant) {
            return false;
        }
        return true;
    },
    checkGroupedMongoObjectIds: (array) => {
        let resultant;
        array.map(arr => {
            return resultant = arr.match(titleRegex);
        })
        if (!resultant) {
            return false;
        }
        return true;
    },
    traverseLiterature: (literature) => {
        let result = true;
        literature.map( err => {
            if (!err.header || !err.description) {
                return result = false;
            }
            if (!err.header.length || !err.description.length) {
                result = false;
            }
        })
        return result;
    },
    traverseClassification: (object) => {
        let result = true;
        Object.keys(object).map(obj => {
            if (!object[obj].match(alphaRegex)) {
                console.log(object[obj]);
                result = false;
            }
            return null;
        })
        return result;
    },
    updateValidate: (user_id, category_id, title, local_name, biological_name, classification, literature, region, pharmacological_props, effective_parts, links, status, reviewed_by, next) => {
        const allowedStatus = [1, 2];
        const validate = module.exports.createValidate(user_id, category_id, title, local_name, biological_name, () => {
            if (region.length && !region.match(alphaRegex)) {
                return { status: true, error: 'Invalid expressions noticed in region' }
            } 
            if (pharmacological_props.length && !module.exports.checkArrayElements(pharmacological_props)) {
                return { status: true, error: 'Invalid expressions noticed in pharmacological properties' }
            }
            if (effective_parts.length && !module.exports.checkArrayElements(effective_parts)) {
                return { status: true, error: 'Invalid expressions noticed in effective parts' }
            }
            if (reviewed_by.length && !module.exports.checkGroupedMongoObjectIds(reviewed_by)) {
                return { status: true, error: 'Invalid expressions noticed in list of reviewers' }
            }
            if (links.length && !module.exports.checkArrayElements(links)) {
                return { status: true, error: 'Invalid expressions noticed in list of hyperlinks to related articles' }
            }
            if (status.length && !allowedStatus.includes(status)) {
                return { status: true, error: 'Chosen status was rejected' }
            }
            if (literature.length && !module.exports.traverseLiterature(literature)) {
                return { status: true, error: 'Something is apparently wrong with your literature review. Please fill the form appropriately.' }
            }
            if (!module.exports.traverseClassification(classification)) {
                return { status: true, error: 'Incorrect representation of biological classification' }
            }
            if (classification && module.exports.traverseClassification(classification)) {
                if (biological_name.toLowerCase() !== `${classification.genus.toLowerCase()} ${classification.species.toLowerCase()}`) {
                    return { status: true, error: 'Biological name does not match the classification' }
                }
            }
            return next();
        })
        return validate;
    }
}