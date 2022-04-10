const ArchieveCategory = require("../models/ArchieveCategory");
const { createValidate, updateValidate } = require("../validator/categories");
const url = require('url');
const { capitalize } = require("../custom");
const Archieve = require("../models/Archieve");
const { authInfo } = require("./users");
const User = require("../models/Users");

module.exports = {
    create: async (req, res) => {
        const user = await authInfo(req, res);
        if (!user.length) {
            return res.status(401).json({ error: 'Unauthorized request' });
        }
        const userId = (req.body.userId === undefined || req.body.userId ==='') ? (user.length === 1 && user[0].user_id) : req.body.userId
        
        const { category, description } = req.body;
        const createCategory = createValidate(category, description, async () => {
            await ArchieveCategory.find({category: capitalize(category)}, async (err, found) => {
                if (!err) {
                    const saveCategory = async () => {
                        const categoryInstance = new ArchieveCategory({ category: capitalize(category), description, user_id: userId });
                        await categoryInstance.save(async (error, result) => {
                            if (!error) {
                                const userRel = await User.findById(userId, ['_id', 'firstname', 'lastname', 'title']).clone().catch(err => console.warn(err));
                                return res.status(201).json({ message: 'Category created successfully', results: result, user_collection: userRel });
                            }
                            return res.status(500).json({error: 'Whoops! Something went wrong'});
                        });
                        return;
                    }

                    if (found.length > 0) {
                        const ifUserOwnsIt = found.filter( item => item.user_id === userId);
                        if (ifUserOwnsIt.length > 0) {
                            return res.status(412).json({error: 'The category exists already in your folder'});
                        }
                        return saveCategory();
                    }
                    return saveCategory();
                }
                return res.status(500).json({error: 'Whoops! Something went wrong'});
            }).clone().catch(err => console.warn(err));
            return
        });
        if (createCategory.error !== undefined) {
            return res.status(202).json({ error: createCategory.error });
        }

        return createCategory;
    },
    copies: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        if (!params.get('u_identifier')) {
            return res.status(404).json({error: 'Resource not found'});
        }
        if (params.get('u_identifier').length < 12) {
            return res.status(404).json({error: 'Resource not found'});
        }
        const user = params.get('u_identifier');
        await ArchieveCategory.find({user_id: user}, async (err, result) => {
            if (!err) {
                return res.status(200).json({result: result.filter(output => output.status === 2)});
            }
            return res.status(500).json({error: 'Something went wrong'});
        }).clone().catch(err => console.warn(err))
    },
    view: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        const limit = !params.get('limit') ? 10 : params.get('limit');
        const query_type = !params.get('query_type') ? null : params.get('query_type');
        const user = !params.get('query_type') ? null : (!params.get('user') ? null : params.get('user'));
        const conditionalQuery = async (filter) => {
            let count = 0;
            await ArchieveCategory.find(filter, async (err, result) => {
                if (!err) {
                    count = result.length;
                }
            }).clone().catch(err => console.warn(err));

            return count;
        }
        
        const fetchCategories = async (filter) => {
            const totalCategories = !filter.user_id ? await ArchieveCategory.estimatedDocumentCount() : await conditionalQuery(filter);
            const hasmore = totalCategories > limit ? true : false;
            const user_collection = !filter.user_id ? await User.find(filter, ['_id', 'firstname', 'lastname', 'title']).clone().catch(err => console.error(err)) : [];
            await ArchieveCategory.find(filter, (err, results) => {
                if (err) {
                    return res.status(500).json({error: 'Whoops! Something went wrong'});
                }
    
                return res.status(200).json({results, hasmore, user_collection});
            }).limit(limit).sort({'category': 1}).clone().catch(err => console.error(err));
            return;
        }
        if (!query_type) {
            return res.status(404).json({ error: 'Could not find the resource you sought for' });
        } else{
            if (query_type === 'all') {
                return fetchCategories({});
            }
            if (query_type === 'sort') {
                if (!user) {
                    return res.status(404).json({ error: 'Could not find the resource you sought for' });
                }
                if (user.length < 12) {
                    return res.status(404).json({ error: 'Could not find the resource you sought for' });
                }
                return fetchCategories({user_id: user});
            }
        }
    },
    search: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        const query_type = !params.get('query_type') ? null : params.get('query_type');
        const user = !params.get('query_type') ? null : (!params.get('user') ? null : params.get('user'));
        if (!params.get('q')) {
            return res.status(404).json({error: 'Could not find the resource you sought for'});
        }
        const searchParam = params.get('q').trim();
        if (searchParam.length ===0) {
            return res.status(404).json({error: 'Search query is missing in request'});
        }
        if (!query_type) {
            return res.status(404).json({ error: 'Could not find the resource you sought for' });
        } else{
            const fetchCategories = async (filter) => {
                const user_collection = !filter.user_id ? await User.find(filter, ['_id', 'firstname', 'lastname', 'title']).clone().catch(err => console.error(err)) : [];
                await ArchieveCategory.find(filter, (err, results) => {
                    if (err) {
                        return res.status(500).json({error: 'Whoops! Something went wrong'});
                    }
                    const searchResult = results.filter((obj) => JSON.stringify(obj).toLowerCase().includes(searchParam.toLowerCase()))
        
                    return res.status(200).json({results: searchResult, user_collection});
                }).clone().catch(err => console.error(err));
                return;
            }
            if (query_type === 'all') {
                return fetchCategories({});
            }
            if (query_type === 'sort') {
                if (!user) {
                    return res.status(404).json({ error: 'Could not find the resource you sought for' });
                }
                if (user.length < 12) {
                    return res.status(404).json({ error: 'Could not find the resource you sought for' });
                }
                return fetchCategories({user_id: user});
            }
        }
    },
    getCategory: async (req, res) => {
        const id = req.params.id;
        if (id.length < 12) {
            return res.status(404).json({error: 'No resource could be found in records'});
        }

        await ArchieveCategory.findById(id, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({error: 'No resource could be found in records'});
                }

                const userViewables = ['_id', 'firstname', 'lastname', 'title'];
                const user_collection = await User.find({},userViewables).clone().catch(err => console.warn(err));
                return res.status(200).json({category: found, user_collection});
            }
            return res.status(500).json({error: 'Error: Fatal incidence occured internally'});
        }).clone().catch(err => console.warn(err));
        return 

    },
    update: async (req, res) => {
        const { id, category, description, status, userId } = req.body;
        if (!userId || userId.length <12) {
            return res.status(412).json({error: 'User instance is missing in request'});
        }
        const updateCategory = updateValidate(category, description, status, async () => {
            await ArchieveCategory.findById(id, async (err, found) => {
                if (!err) {
                    if (!found) {
                        return res.status(404).json({ error: 'No records found for the category' });
                    }
                    await ArchieveCategory.find({category: capitalize(category)}, async (error, result) => {
                        if (!error) {
                            const executeUpdate = async () => {
                                await ArchieveCategory.findByIdAndUpdate(id, { category: capitalize(category) || result.category, description: description || result.description, status: status || result.status, user_id: userId || result.user_id }, async (updateError, success) => {
                                    if (!updateError) {
                                        return res.status(200).json({message: 'Category update was successful. Thank you'});
                                    }
                                    return res.status(500).json({error: 'Whoops! Something went wrong'});
                                }).clone().catch(err => console.warn(err));
                                return
                            }
                            if (result.length) {
                                const selectThoseBelongingToUser = result.filter(item => item.user_id === userId);
                                if (!selectThoseBelongingToUser.length) {
                                    return executeUpdate();
                                }
                                const uniqueness = selectThoseBelongingToUser.filter( item => item._id.toString() === id );
                                if (uniqueness.length ===1) {
                                    return executeUpdate();
                                }
                                return res.status(202).json({error: 'Category already exists in your folder'});
                            }
                            return executeUpdate();
                        }
                        return res.status(500).json({error: 'Whoops! Something went wrong'});
                    }).clone().catch(err => console.warn(err));
                    return;
                }
                return res.status(500).json({error: 'Whoops! Something went wrong'});
            }).clone().catch(err => console.warn(err));
            return;
        });
        if (updateCategory.error !== undefined) {
            return res.status(202).json({ error: updateCategory.error });
        }

        return updateCategory;
    },
    clear: async (req, res) => {
        const id = req.params.id;
        if (id.length < 12) {
            return res.status(412).json({error: 'Server rejected the Url parameters'});
        }
        await ArchieveCategory.findById(id, async (err, result) => {
            if (!err) {
                if (!result) {
                    return res.status(404).json({error: 'No records found for the category'});
                }
                //delete algorithm
                const trash = async () => await ArchieveCategory.findByIdAndDelete(id, async (error, successDoc) => {
                    if (!error) {
                        return res.status(200).json({status: 2, message: 'Category was deleted successfully'});
                    }
                    return res.status(500).json({error: 'Whoops! Something went wrong'});
                }).clone().catch(err => console.warn(err));
                const draft = async () => await ArchieveCategory.findByIdAndUpdate(id, {status: 1}, async (updateError, successObj) => {
                    if (!updateError) {
                        return res.status(200).json({status: 1, message: 'Category was assigned to archieves, hence the server rather inactivated it', successObj});
                    }
                    return res.status(500).json({error: 'Whoops! Something went wrong'});
                }).clone().catch(err => console.warn(err));
                //check if there are archieves under the category
                await Archieve.find({category_id: id}, async (error, outcome) => {
                    if (!error) {
                        if (!outcome.length) {
                            return trash();
                        }
                        return draft();
                    }
                }).clone().catch(err => console.warn(err));
                return
            }
            return res.status(500).json({error: 'Whoops! Something went wrong'});
        }).clone().catch(err => console.warn(err));
        return
    }
}