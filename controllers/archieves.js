const { v4 } = require('uuid');
const url = require('url');
const moment = require('moment');
const { slugger, capitalize, capitalizeArray, cloudinaryConfig } = require('../custom');
const Archieve = require('../models/Archieve');
const ArchieveCategory = require('../models/ArchieveCategory');
const { createValidate, updateValidate } = require('../validator/archieves');
const { authInfo } = require('./users');
const User = require('../models/Users');
const cloudinaryUploader = cloudinaryConfig();

module.exports = {
    authority: async (request, response, next) => {
        if (!request.body.archieve_id || request.body.archieve_id.length < 12) {
            return response.status(412).json({ error: 'Incorrect client information detected' });
        }
        const user = await authInfo(request, response);
        if (user.length === 1) {
            const userId = user[0].user_id;
            const usertype = user[0].usertype;
            await Archieve.findById(request.body.archieve_id, async (err, found) => {
                if (!err) {
                    if (!found) {
                        return response.status(404).json({ error: 'No records was found for the archieve' });
                    }
                    if (found.user_id === userId || usertype === process.env.IS_ADMIN || (user[0].extraDuty && found.reviewed_by.includes(userId))) {
                        return next(found);
                    }
                    return response.status(412).json({ error: 'Access to this archieve is denied. You only edit what is posted in your name' });
                }
            }).clone().catch(err => console.warn(err));
            return;
        }
    },
    viewOne: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        if (!params.get('id') || !params.get('doc')) {
            return res.status(404).json({ error: 'Resource could not be found on this server' });
        }

        if (params.get('id').length < 12) {
            return res.status(404).json({ error: 'Resource could not be found on this server' });
        }

        await Archieve.findById(params.get('id'), async (err, result) => {
            if (!err) {
                if (!result) {
                    return res.status(404).json({ error: 'Resource could not be found on this server' });
                }
                if (params.get('doc') !== result.slug) {
                    return res.status(404).json({ error: 'Resource could not be found on this server' });
                }
                const user = await User.findById(result.user_id, ['title', 'gender', 'firstname', 'lastname', 'photo']).clone().catch(err => console.warn(err));
                return res.status(200).json({ document: result, user });
            }
            return res.status(500).json({ error: 'Whoops! Fatal error occured internally!' })
        }).clone().catch(err => console.warn(err));
        return;
    },
    create: async (req, res) => {
        const { user_id, category_id, title, local_name, biological_name } = req.body;
        const createArchieve = createValidate(user_id, category_id, title, local_name, biological_name, async () => {
            const saveArchieve = (slugValue) => {
                return new Archieve({
                    user_id, category_id, title: capitalize(title), local_name: capitalize(local_name), biological_name, slug: slugValue
                })
            }
            const validateCategory = await ArchieveCategory.findById(category_id, async (err, found) => {
                if (!err) {
                    if (!found) {
                        return false;
                    }
                    return true;
                }
            }).clone().catch(err => console.warn(err));
            if (!validateCategory) {
                return res.status(404).json({ error: 'Category does not exist, hence request was rejected' });
            } else if (validateCategory) {
                await Archieve.find({ slug: slugger(title) }, async (error, result) => {
                    if (!error) {
                        const user_collection = await User.findById(user_id, ['title', 'gender', 'firstname', 'lastname', 'photo']).clone().catch(err => console.warn(err));
                        if (!result.length) {
                            const save = saveArchieve(slugger(title));
                            await save.save(async (err, thisDoc) => {
                                if (!err) {
                                    return res.status(201).json({ message: 'Successfully created an archieve!', user_collection, results: thisDoc });
                                }
                            });
                            return;
                        }
                        const save = saveArchieve(`${slugger(title)}-${v4()}`);
                        await save.save(async (err, thisDoc) => {
                            if (!err) {
                                return res.status(201).json({ message: 'Successfully created an archieve!', user_collection, results: thisDoc });
                            }
                        });
                        return;
                    }
                    return res.status(500).json({ error: 'Whoops! Something went wrong, please' });
                }).clone().catch(err => console.warn(err));
                return
            }
        });

        if (createArchieve.error !== undefined) {
            return res.status(412).json({ error: createArchieve.error });
        }
        return createArchieve;
    },
    view: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        const limit = !params.get('limit') ? 10 : params.get('limit');
        const totalDocs = await Archieve.estimatedDocumentCount();
        const hasmore = totalDocs > limit ? true : false;
        await Archieve.find({}, async (err, results) => {
            if (!err) {
                if (!results.length) {
                    return res.status(412).json({ error: 'No records found' });
                }
                const viewables = ['title', 'gender', 'firstname', 'lastname', 'photo'];
                const users = await User.find({}, viewables).clone().catch(err => console.warn(err));
                return res.status(200).json({ results, hasmore, users });
            }
            return res.status(500).json({ error: 'Whoops! Something went wrong' });
        }).limit(limit).sort({ 'createdAt': -1 }).clone().catch(err => console.error(err));
        return;
    },
    update: async (req, res) => {
        await module.exports.authority(req, res, async (found) => {
            const { archieve_id, user_id, category_id, title, local_name, biological_name, classification, literature, region, pharmacological_props, effective_parts, links, status, reviewed_by } = req.body;
            if (archieve_id.length < 12) {
                return res.status(412).json({ error: 'Incorrect ID for the selected archieve' });
            }
            const updateArchieve = updateValidate(user_id, category_id, title, local_name, biological_name, classification, literature, region, pharmacological_props, effective_parts, links, status, reviewed_by, async () => {
                const validateCategory = await ArchieveCategory.findById(category_id, async (err, found) => {
                    if (!err) {
                        if (!found) {
                            return false;
                        }
                        return true;
                    }
                }).clone().catch(err => console.warn(err));
                if (!validateCategory) {
                    return res.status(404).json({ error: 'Category does not exist, hence request was rejected' });
                } else if (validateCategory) {
                    const updateObj = () => {
                        return {
                            user_id, category_id, title: capitalize(title), local_name: capitalize(local_name), biological_name, literature, region: capitalize(region), pharmacological_props: capitalizeArray(pharmacological_props), effective_parts: capitalizeArray(effective_parts),
                            links, status, reviewed_by, classification: [classification]
                        }
                    }
                    await Archieve.findOne({ slug: slugger(title) }, async (error, result) => {
                        if (!error) {
                            const execUpdate = async (object) => {
                                await Archieve.findByIdAndUpdate(archieve_id, object, async (updateError, successDoc) => {
                                    if (!updateError) {
                                        return res.status(200).json({ message: 'Successful document update', document: successDoc })
                                    }
                                    return res.status(500).json({ error: 'Whoops! Something fatal occured' });
                                }).clone().catch(err => console.warn(err));
                            }
                            if (!result) {
                                const slug = slugger(title);
                                return execUpdate({ ...updateObj(), slug });
                            }
                            if (archieve_id === result._id.toString() && slugger(title) === result.slug) {
                                const slug = slugger(title);
                                return execUpdate({ ...updateObj(), slug });
                            } else if (archieve_id !== result._id.toString() && slugger(title) === result.slug) {
                                const slug = `${slugger(title)}-${v4()}`;
                                return execUpdate({ ...updateObj(), slug });
                            }
                        }
                        return res.status(500).json({ error: 'Whoops! Something went wrong, please' });
                    }).clone().catch(err => console.warn(err));
                    return
                }
            })
            if (updateArchieve.error !== undefined) {
                return res.status(412).json({ error: updateArchieve.error });
            }
            return updateArchieve;
        });
        return;
    },
    makeGallery: async (req, res) => {
        await module.exports.authority(req, res, async () => {
            const { archieve_id } = req.body;
            if (archieve_id.length < 12) {
                return res.status(412).json({ error: 'Error: Incorrect client information' });
            }
            let sizeChecker = true;
            if (!req.files.length) {
                return res.status(412).json({ error: 'No files selected' });
            }
            req.files.map(file => {
                if (file.size > 2000000) {
                    sizeChecker = false;
                }
                return;
            });
            if (!sizeChecker) {
                return res.status(412).json({ error: 'One or more of the selected files is/ are too large. Please select file not larger than 2MB' });
            }
            await Archieve.findById(archieve_id, async (err, found) => {
                if (!err) {
                    if (!found) {
                        return res.status(404).json({ error: 'No records could be found for the archieve' });
                    }
                    if (req.files.length + found.photos.length > 20) {
                        return res.status(412).json({ error: 'Photo album for this archieve is full' });
                    }
                    const uploadAttachments = req.files.map(async file => new Promise((resolve, reject) => {
                        const uploadPhoto = cloudinaryUploader.uploader.upload(file.path, { folder: 'sciensta/attachment_gallery' }, async (uploadError, uploadedResult) => {
                            if (uploadError) reject(uploadError)
                            else resolve(uploadedResult)
                        });
                        return uploadPhoto;
                    }));
                    let photoArray = [...found.photos];
                    const cloudinaryResponses = await Promise.all(uploadAttachments).then(response => {
                        return response;
                    }).catch(err => { return res.status(412).json({error: 'Sorry, photos could not be uploaded to gallery.', error_obj: err}) })
                    cloudinaryResponses.map(cloudinaryRes => {
                        photoArray = [...photoArray, { photoObj_id: v4(), photo_id: cloudinaryRes.public_id, secure_url: cloudinaryRes.secure_url }]
                    })

                    if (photoArray.length === [...found.photos].length) {
                        return res.status(412).json({ error: 'Sorry, photo gallery was not created for the archieve' });
                    }
                    await Archieve.findByIdAndUpdate(archieve_id, { photos: photoArray }, async (updateError, successDoc) => {
                        if (!updateError) {
                            return res.status(200).json({ message: 'Photo gallery was created for the archieve', photos: photoArray });
                        }
                        return res.status(500).json({ error: 'Whoops! Something fatal happened internally.' });
                    }).clone().catch(err => console.warn(err));
                    return;
                }
                return res.status(500).json({ error: 'Whoops! Something fatal happened internally.' });
            }).clone().catch(err => console.warn(err));
            return;
        });
        return
    },
    updateGallery: async (req, res) => {
        if (req.body.archieve_id.length < 12) {
            return res.status(412).json({ error: 'Error: Incorrect client information' });
        }
        let sizeChecker = true;
        if (!req.file) {
            return res.status(412).json({ error: 'No files selected' });
        }
        if (req.file.size > 2000000) {
            sizeChecker = false;
        }
        if (!sizeChecker) {
            return res.status(412).json({ error: 'Selected file is too large. Please select file not larger than 2MB' });
        }
        await module.exports.authority(req, res, async (found) => {
            const { archieve_id, photo_id, photoObj_id } = req.body;
            const photoArray = [...found.photos];
            const uploadPhoto = await cloudinaryUploader.uploader.upload(req.file.path, { folder: 'sciensta/attachment_gallery' });
            if (!uploadPhoto.public_id || !uploadPhoto.secure_url) {
                return res.status(412).json({ error: 'Sorry, gallery could not be updated' });
            }
            const photoIndex = photoArray.findIndex((obj => obj.photoObj_id === photoObj_id));
            if (photoIndex !== -1) {
                photoArray[photoIndex].photo_id = uploadPhoto.public_id;
                photoArray[photoIndex].secure_url = uploadPhoto.secure_url;
            }
            await Archieve.findByIdAndUpdate(archieve_id, { photos: photoArray }, async (updateError, successDoc) => {
                if (!updateError) {
                    await cloudinaryUploader.uploader.destroy(photo_id);
                    return res.status(200).json({ message: 'Successful photo gallery update', photos: photoArray });
                }
                await cloudinaryUploader.uploader.destroy(uploadPhoto.public_id);
                return res.status(500).json({ error: 'Whoops! Fatal issue was encountered on the server' });
            }).clone().catch(err => console.warn(err));
            return
        })
        return
    },
    removePhoto: async (req, res) => {
        await module.exports.authority(req, res, async (found) => {
            const { archieve_id, photo_id, photoObj_id } = req.body;
            if (!photo_id || !photoObj_id) {
                return res.status(412).json({ error: 'Incorrect client information detected' });
            }
            const photoArray = [...found.photos];
            const newCollection = photoArray.filter(photo => photo.photoObj_id !== photoObj_id);
            if (newCollection.length === photoArray.length) {
                return res.status(412).json({ error: 'Query failed. Photo not found in gallery' });
            }
            await cloudinaryUploader.uploader.destroy(photo_id);
            await Archieve.findByIdAndUpdate(archieve_id, { photos: newCollection }, async (err, success) => {
                if (!err) {
                    return res.status(200).json({ message: 'Gallery was successfully altered' });
                }
                return res.status(500).json({ error: 'Whoops! Fatal issue was encountered on the server' });
            }).clone().catch(err => console.warn(err));
            return
        });
        return
    },
    viewAll: async (req, res) => {
        await Archieve.find({}, (err, results) => {
            if (!err) {
                if (!results.length) {
                    return res.status(200).json({ results: [] });
                }
                return res.json({ results });
            }
            return res.status(500).json({ error: 'Whoops! Something went wrong' });
        }).clone().catch(err => console.error(err));
        return;
    },
    searchDocument: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        if (!params.get('q')) {
            return res.status(400).json({ error: 'Bad request detected' });
        }
        const searchParam = params.get('q').trim();
        if (searchParam.length === 0) {
            return res.status(412).json({ error: 'Search parameter is strictly required' });
        }
        await Archieve.find({}, async (error, results) => {
            if (!error) {
                if (!results.length) {
                    return res.status(412).json({ error: 'No documents found on this server' });
                }
                const viewables = ['title', 'gender', 'firstname', 'lastname', 'photo'];
                const users_collection = await User.find({}, viewables).clone().catch(err => console.warn(err));
                const searchResult = results.filter((obj) => JSON.stringify(obj).toLowerCase().includes(searchParam.toLowerCase()))
                return res.status(200).json({ results: searchResult, users_collection });
            }
            return res.status(500).json({ error: 'Unexpected error encounted internally!' });
        }).clone().catch(err => console.warn(err));
    },
    saveAsFavourite: async (req, res) => {
        const { document_id, user_id } = req.body;
        if (document_id.length < 12 || user_id.length < 12) {
            return;
        }
        await Archieve.findById(document_id, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({ error: 'Document could not found on this server' });
                }
                const pushSavers = async (newSavers, status) => {
                    await Archieve.findByIdAndUpdate(document_id, { saves: newSavers }, async (error, successDoc) => {
                        if (!error) {
                            return res.status(status ? 201 : 200).json({ save: status });
                        }
                        return res.status(500).json({ error: 'Ouch, something went wrong!' });
                    }).clone().catch(err => console.warn(err))
                    return;
                }
                if (found.saves.includes(user_id)) {
                    return pushSavers([...found.saves.filter(save => save !== user_id)], false);
                }
                return pushSavers([...found.saves, user_id], true);
            }
            return res.status(500).json({ error: 'Ouch, something went wrong!' });
        }).clone().catch(err => console.warn(err));
        return;
    },
    likeDocument: async (req, res) => {
        const { document_id, user_id } = req.body;
        if (document_id.length < 12 || user_id.length < 12) {
            return;
        }
        await Archieve.findById(document_id, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({ error: 'Document could not found on this server' });
                }
                const pushLikers = async (newLikers, status) => {
                    await Archieve.findByIdAndUpdate(document_id, { likes: newLikers }, async (error, successDoc) => {
                        if (!error) {
                            return res.status(status ? 201 : 200).json({ liked: status });
                        }
                        return res.status(500).json({ error: 'Ouch, something went wrong!' });
                    }).clone().catch(err => console.warn(err))
                    return;
                }
                if (found.likes.includes(user_id)) {
                    return pushLikers([...found.likes.filter(like => like !== user_id)], false);
                }
                return pushLikers([...found.likes, user_id], true);
            }
            return res.status(500).json({ error: 'Ouch, something went wrong!' });
        }).clone().catch(err => console.warn(err));
        return;
    },
    postComment: async (req, res) => {
        const { document_id, user_id, comment } = req.body;
        if (document_id.length < 12 || user_id.length < 12) {
            return;
        }
        if (!comment.length) {
            return;
        }
        await Archieve.findById(document_id, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({ error: 'Document could not be found on this server' });
                }
                const pushedCommented = [...found.comments, { id: v4(), user_id, comment, date: moment().format('YYYY-MM-DD H:mm:ss') }];
                await Archieve.findByIdAndUpdate(document_id, { comments: pushedCommented }, async (error, successDoc) => {
                    if (!error) {
                        return res.status(201).json({ message: '' });
                    }
                    return res.status(500).json({ error: 'Ouch, something went wrong!' });
                }).clone().catch(err => console.warn(err))
                return;
            }
        }).clone().catch(err => console.warn(err));
        return
    },
    removeComment: async (req, res) => {
        const { archieve_id, comments, user_id } = req.body;
        if (archieve_id.length < 12 || user_id.length < 12) {
            return;
        }
        if (!comments) {
            return;
        }
        await Archieve.findById(archieve_id, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({ error: 'Document could not be found on this server' });
                }
                await Archieve.findByIdAndUpdate(archieve_id, { comments }, async (error, successDoc) => {
                    if (!error) {
                        return res.status(200).json({ message: '' });
                    }
                    return res.status(500).json({ error: 'Ouch, something went wrong!' });
                }).clone().catch(err => console.warn(err))
                return;
            }
        }).clone().catch(err => console.warn(err));
        return
    },
    deleteDocument: async (req, res) => {
        await module.exports.authority(req, res, async (found) => {
            const { archieve_id } = req.body;
            [...found.photos].map(async list => {
                await cloudinaryUploader.uploader.destroy(list.photo_id);
                return null;
            });
            await Archieve.findByIdAndDelete(archieve_id, async (err, success) => {
                if (!err) {
                    return res.status(200).json({ message: 'Document was successfully deleted' });
                }
                return res.status(500).json({ error: 'Whoops! Fatal issue was encountered on the server' });
            }).clone().catch(err => console.warn(err));
            return
        })
        return;
    }
}