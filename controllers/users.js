const User = require('../models/Users');
const { create, passwordValidate, update } = require('../validator/users');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const { v4 } = require('uuid');
const { authVerifier, passwordResetLink, userUpdateInformer } = require('../mails');
const { capitalize, currentTime, cloudinaryConfig } = require('../custom');
const { sign, verify } = require('jsonwebtoken');
const Verification = require('../models/Verification');
const url = require('url');
const PasswordReset = require('../models/PasswordReset');
const Reason = require('../models/Reasons');
const { botChecker } = require('../middlewares');
const Archieve = require('../models/Archieve');
const ArchieveCategory = require('../models/ArchieveCategory');

const cloudinaryUploader = cloudinaryConfig();
const salt = genSaltSync(10);

module.exports = {
    fetchUsers: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        const limit = !params.get('limit') ? 10 : params.get('limit');
        const viewables = ['_id', 'title', 'gender', 'firstname', 'lastname', 'email', 'phone', 'photo', 'story', 'usertype', 'extraDuty'];
        const totalUsers = await User.estimatedDocumentCount();
        const hasmore = totalUsers > limit ? true : false;
        await User.find({}, viewables, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Whoops! Something went wrong' });
            }

            return res.status(200).json({ hasmore, results });
        }).limit(limit).sort({ 'createdAt': -1 }).clone().catch(err => console.error(err));
        return
    },
    searchUser: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        if (!params.get('q')) {
            return res.status(404).json({error: 'Could not find the resource you sought for'});
        }
        const searchParam = params.get('q').trim();
        if (searchParam.length ===0) {
            return res.status(404).json({error: 'Search query is missing in request'});
        }
        const viewables = ['_id', 'title', 'gender', 'firstname', 'lastname', 'email', 'phone', 'photo', 'story', 'usertype', 'extraDuty'];
        await User.find({}, viewables, async (err, results) => {
            if (err) {
                return res.status(500).json({error: 'Whoops! Something went wrong'});
            }
            const searchResult = results.filter((obj) => JSON.stringify(obj).toLowerCase().includes(searchParam.toLowerCase()))

            return res.status(200).json({results: searchResult});
        }).sort({ 'firstname': 1 }).clone().catch(err => console.error(err));
        return
    },
    fetchUser: async (req, res) => {
        const user = req.params.id;
        const viewables = ['_id', 'title', 'gender', 'firstname', 'lastname', 'email', 'phone', 'photo', 'story', 'usertype', 'status', 'createdAt', 'extraDuty'];
        if (!user) {
            return res.status(412).json({error: 'Incorrect URL identified '})
        }
        if (user.length < 12) {
            return res.status(412).json({error: 'Incorrect URL identified '})
        }
        await User.findById(user, viewables, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({ error: 'User could not be found in records' });
                }
                return res.status(200).json({ results: found });
            }
            return res.status(500).json({ error: 'Whoops! Something went wrong' });
        }).clone().catch(err => console.error(err));
        return
    },
    createUser: async (req, res) => {
        const user = req.body;
        if (!user.captchaCode) {
            return res.status(412).json({error: 'Please check the checkbox'});
        }
        await botChecker(req, user.captchaCode, async () => {
            const validate = create(user, async () => {
                user.password = hashSync(user.password, salt);
                await User.findOne({ email: user.email }, async (err, found) => {
                    if (!err) {
                        if (found) {
                            return res.status(412).json({ error: 'Email address is taken already' });
                        }
                        const verificationCode = v4();
                        user.firstname = capitalize(user.firstname);
                        user.lastname = capitalize(user.lastname);
                        user.captchaCode = undefined
                        user.password_confirmation = undefined
                        const userInstance = new User(user);
                        await userInstance.save(async (errors, result) => {
                            if (!errors) {
                                const newUser = { id: result._id.toString(), title: result.title, gender: result.gender, firstname: capitalize(result.firstname), lastname: capitalize(result.lastname), email: result.email, phone: result.phone }
                                const mailer = await authVerifier(user.email, `${process.env.CLIENT_URL}account/verify?code=${verificationCode}&user=${result._id}`);
                                if (mailer.status) {
                                    const hashedCode = await hashSync(verificationCode, salt);
                                    await Verification.deleteMany({ user_id: result._id });
                                    const putVerificationCode = new Verification({ user_id: result._id, verificationCode: hashedCode });
                                    await putVerificationCode.save();
                                    return res.status(201).json({ result: newUser, message: 'User created successfully, check your mail to verify' });
                                }
                                await User.findByIdAndDelete(result._id, (error, success) => {
                                    if (!error) {
                                        return res.status(412).json({ error: 'User registration was not successful' });
                                    }
                                    return res.status(500).json({ error: 'Something went wrong. Please contact the administrators' });
                                });
                                return
                            }
                            return res.status(500).json({ error: 'Ouch! Unexpected error encountered' })
                        })
                        return null
                    }
                    return res.status(500).json({ error: 'Ouch! Unexpected error encountered' })
                }).clone().catch(err => console.error(err));
                return null
            })

            if (validate.error !== undefined) {
                return res.status(412).json({ error: validate.error });
            }

            return validate;
        })
        return null

    },
    verifyUser: async (req, res) => {
        const params = new URLSearchParams(url.parse(req.url, true).query);
        const verificationCode = params.get('code');
        const userId = params.get('user');
        if (!verificationCode || verificationCode === '' || !userId || userId === '') {
            return res.status(412).json({ error: 'URL parameters are missing, please follow the exact link in your mail' });
        }
        await User.findById(userId, async (err, found) => {
            if (!err) {
                if (!found) {
                    return res.status(404).json({ error: 'Sorry, we could not find any records' });
                }
                if (found.status === 2) {
                    return res.status(412).json({ error: 'Account is already verified' });
                }
                await Verification.findOne({ user_id: userId }, async (error, result) => {
                    if (!error) {
                        if (!result) {
                            return res.status(404).json({ error: 'Verification code does not exist!' });
                        }
                        const compareCode = await compareSync(verificationCode, result.verificationCode);
                        if (!compareCode) {
                            return res.status(412).json({ error: 'Incorrect URL parameters, please follow the exact link in your mail' });
                        } else if (compareCode) {
                            const registrationDate = new Date(result.date).getTime();
                            const currTime = new Date().getTime();
                            const diffTime = (currTime - registrationDate) / 1000;
                            if (diffTime > 3600) {
                                const newVerificationCode = v4();
                                const hashedCode = await hashSync(newVerificationCode, salt);
                                const mailer = await authVerifier(result.email, `${process.env.CLIENT_URL}account/verify?code=${newVerificationCode}&user=${result._id}`);
                                if (mailer.status) {
                                    await Verification.deleteMany({ user_id: result._id });
                                    const putVerificationCode = new Verification({ user_id: result._id, verificationCode: hashedCode });
                                    await putVerificationCode.save();
                                    return res.status(200).json({ message: 'The verification code has expired, but we have sent a new verification link to you' });
                                }
                                return res.status(500).json({ error: 'The verification code has expired, please request for new one' });
                            } else {
                                await User.findByIdAndUpdate(userId, { status: 2 }, async (updateError, updateResponse) => {
                                    if (!updateError) {
                                        await Verification.deleteMany({ user_id: userId });
                                        return res.status(200).json({ message: 'Your account was verified successfully' });
                                    }
                                    return res.status(500).json({ error: 'Something went wrong and account verification has failed' });
                                }).clone().catch(err => console.warn(err));
                                return;
                            }
                        }

                    }
                    return res.status(500).json({ error: 'Fatal problem has happened internally' });
                }).clone().catch(err => console.warn(err));
                return
            }
            return res.status(500).json({ error: 'Fatal problem has happened on the server' });
        }).clone().catch(err => console.warn(err));
        return
    },
    resendVerificationLink: async (req, res) => {
        const { userId } = req.body;
        await User.findById(userId, async (error, result) => {
            if (!error) {
                if (!result) {
                    return res.status(404).json({ error: 'Account could not be found!' });
                }
                if (result.status === 2) {
                    return res.status(412).json({ error: 'This account has been verified already!' });
                }
                const verificationCode = v4();
                const hashedCode = await hashSync(verificationCode, salt);
                const mailer = await authVerifier(result.email, `${process.env.CLIENT_URL}account/verify?code=${verificationCode}&user=${result._id}`);
                if (mailer.status !== false) {
                    await Verification.deleteMany({ user_id: result._id });
                    const putVerificationCode = new Verification({ user_id: result._id, verificationCode: hashedCode });
                    await putVerificationCode.save();
                    return res.status(200).json({ message: 'Please check your mail for a new verification link' });
                }
                return res.status(500).json({ error: 'Something went wrong, hence link could not be sent!' });
            }
            return res.status(404).json({ error: 'Whoops! Account does not exist anymore!' });
        }).clone().catch(err => console.warn(err));
    },
    forgotPassword: async (req, res) => {
        const { email, captchaCode } = req.body;
        if (email.length === 0 || captchaCode.length === 0) {
            return res.status(412).json({ error: 'Fields are missing in request' });
        }
        await botChecker(req, captchaCode, async () => {
            await User.findOne({ email }, async (error, result) => {
                if (!error) {
                    if (!result) {
                        return res.status(404).json({ error: 'Email address does not exist' });
                    }
                    const uniqueCode = v4();
                    const hashedCode = await hashSync(uniqueCode, salt);
                    const mailer = await passwordResetLink(email, `${process.env.CLIENT_URL}account/reset_password?code=${uniqueCode}&user=${result._id}`);
                    if (mailer.status !== false) {
                        await PasswordReset.deleteMany({ user_id: result._id });
                        const storeUniqueCode = new PasswordReset({ user_id: result._id, code: hashedCode });
                        await storeUniqueCode.save();
                        return res.status(200).json({ message: 'Please check your mail for direction to reset your password' });
                    }
                    return res.status(500).json({ error: 'Something went wrong, hence link could not be sent!' });
                }
                return res.status(500).json({ error: 'Whoops! Something went wrong.' });
            }).clone().catch(err => console.warn(err));
            return;
        })
        return
    },
    resetPassword: async (req, res) => {
        const { userId, code, password, password_confirmation, captchaCode } = req.body;
        if (userId.length === 0 || code.length === 0 || password.length === 0 || password_confirmation.length === 0) {
            return res.status(412).json({ error: 'Some fields are missing in the request' });
        }
        await botChecker(req, captchaCode, async () => {
            const passwordReset = passwordValidate(password, password_confirmation, async () => {
                await PasswordReset.findOne({ user_id: userId }, async (err, result) => {
                    if (!err) {
                        if (!result) {
                            return res.status(404).json({ error: 'Sorry, we could not find any record for you. Retry sending the forgot password request.' });
                        }
                        const compareCode = await compareSync(code, result.code);
                        if (!compareCode) {
                            return res.status(412).json({ error: 'Incorrect URL parameters. Please follow the exact link in your mail' });
                        } else if (compareCode) {
                            const requestTime = new Date(result.date).getTime();
                            const currTime = new Date().getTime();
                            const diffTime = (currTime - requestTime) / 1000;
                            if (diffTime > 1800) {
                                await PasswordReset.deleteMany({ user_id: userId });
                                return res.status(412).json({ error: 'The link has expired. Please retry sending a new forgot password request to get new link' });
                            } else {
                                const hashedPassword = await hashSync(password, salt);
                                await User.findByIdAndUpdate(userId, { password: hashedPassword }, async (updateError, updateResponse) => {
                                    if (!updateError) {
                                        await PasswordReset.deleteMany({ user_id: userId });
                                        return res.status(200).json({ message: 'Your password was changed successfully' });
                                    }
                                    return res.status(500).json({ error: 'Something went wrong and account verification has failed' });
                                }).clone().catch(err => console.warn(err));
                                return;
                            }
                        }
                    }
                }).clone().catch(err => console.warn(err));
                return;
            });
            if (passwordReset.error !== undefined) {
                return res.status(202).json({ error: passwordReset.error });
            }

            return passwordReset;
        })
        return 
    },
    login: async (req, res) => {
        const { email, password } = req.body;
        if (email.length === 0 || password.length === 0) {
            return res.status(412).json({ error: 'Email and password fields are required' });
        }
        User.findOne({ email }, async (error, result) => {
            if (!error) {
                if (!result) {
                    return res.status(404).json({ error: 'Account does not exist. Please register first.' });
                }
                if (result.status !== 2) {
                    return res.status(412).json({ error: 'Account is not accessible because it is currently not verified' });
                } else {
                    const passwordComparison = await compareSync(password, result.password);
                    if (!passwordComparison) {
                        return res.status(412).json({ error: 'Incorrect credentials' });
                    } else if (passwordComparison) {
                        const userObj = { user_id: result._id.toString(), firstname: result.firstname, lastname: result.lastname, email: result.email, usertype: result.usertype, phone: result.phone, avatar: result.photo, extraDuty: result.extraDuty };
                        await sign({ userObj }, process.env.JWT_SECRET, { expiresIn: '2h' }, (err, token) => {
                            if (!err) {
                                const newObject = { ...userObj, token };
                                res.status(200).json({ user: newObject, message: 'Successful login! Page will redirect soon' });
                            }
                            return res.status(500).json({ error: 'Something went wrong and login has failed' });
                        });
                        return;
                    }
                }
            }
            return res.status(500).json({ error: 'Something went wrong and login has failed' });
        }).clone().catch(err => console.warn(err));
    },
    user_middleware: async (req, res, next) => {
        const header = req.headers['authorization'];
        if (typeof header !== 'undefined') {
            const bearer = header.split(' ');
            if (bearer[1] != undefined) {
                await verify(bearer[1], process.env.JWT_SECRET, (err, decoded) => {
                    if (err) {
                        return res.status(401).json({ error: 'Session expired. Please login once again' });
                    }
                    if (decoded.userObj.usertype === process.env.IS_USER || decoded.userObj.usertype === process.env.IS_ADMIN) {
                        return next();
                    }
                    return res.status(412).json({ error: 'Error: Action cannot be executed' });
                });
                return;
            }
        } else {
            return res.status(401).json({ error: 'Session expired. Please login once again' });
        }
    },
    admin_middleware: async (req, res, next) => {
        const header = req.headers['authorization'];
        if (typeof header !== 'undefined') {
            const bearer = header.split(' ');
            if (bearer[1] != undefined) {
                await verify(bearer[1], process.env.JWT_SECRET, (err, decoded) => {
                    if (err) {
                        return res.status(401).json({ error: 'Unauthorized request' });
                    }
                    if (decoded.userObj.usertype === process.env.IS_ADMIN) {
                        return next();
                    } else {
                        return res.status(412).json({ error: 'Error: Action cannot be executed' });
                    }
                });
                return;
            }
        } else {
            return res.status(401).json({ error: 'Unauthorized request' });
        }
    },
    authInfo: async (req, res) => {
        const header = req.headers['authorization'];
        if (typeof header !== 'undefined') {
            const bearer = header.split(' ');
            if (bearer[1] != undefined) {
                let user = [];
                await verify(bearer[1], process.env.JWT_SECRET, (err, decoded) => {
                    if (err) {
                        return res.status(401).json({ error: 'Unauthorized request' });
                    }
                    user.push(decoded.userObj);
                });
                return user;
            }
        } else {
            return res.status(401).json({ error: 'Unauthorized request' });
        }
    },
    updateUser: async (req, res) => {
        const body = req.body;
        const { userId, firstname, lastname, email, phone, usertype, gender, title, duty } = req.body;
        if (![true, false].includes(duty)) {
            return res.status(400).json({error: 'Bad request received'});
        }
        const story = !body.story ? '' : body.story;
        const userUpdate = update(firstname, lastname, email, phone, usertype, story, gender, title, async () => {
            await User.findById(userId, async (error, result) => {
                if (!error) {
                    if (!result) {
                        return res.status(404).json({ error: 'User could not be found in records' });
                    }
                    if (result.status ===1 && duty ===true) {
                        return res.status(412).json({ error: 'Cannot assigned special duty to unverified users' });
                    }
                    const ifStory = (!story || story.length === 0) ? result.story : story;
                    const dutyAssignment = duty === false ? false : (JSON.parse(duty) || result.extraDuty);
                    const executeUserUpdate = async () => {
                        await User.findByIdAndUpdate(userId, { firstname: capitalize(firstname) || result.firstname, lastname: capitalize(lastname) || result.lastname, email: email || result.email, phone : phone || result.phone, usertype: usertype || result.usertype, story: ifStory, gender: gender || result.gender, title: title || result.title, extraDuty: dutyAssignment }, async (err, response) => {
                            if (!err) {
                                const mailer = await userUpdateInformer(email, capitalize(firstname), capitalize(lastname), phone, ifStory, gender, title)
                                if (mailer.status !== false) {
                                    response.password = undefined;
                                    return res.status(200).json({ message: 'User update was successfully executed', user: response });
                                }
                                return;
                            }
                            return res.status(500).json({ error: 'Something went wrong, hence user update has failed!' });
                        }).clone().catch(err => console.warn(err));
                        return 
                    }

                    if (result.email !== email) {
                        await User.find({email}, async (foundErr, foundRes) => {
                            if (!foundErr) {
                                if (foundRes.length ===0) {
                                    return executeUserUpdate();
                                }
                                return res.status(202).json({ error: 'Email address has been taken already' });
                            }
                            return res.status(500).json({ error: 'Something went wrong, hence user update has failed!' });
                        }).clone().catch(err => console.warn(err));
                        return
                    }
                    return executeUserUpdate();
                }
                return res.status(500).json({ error: 'Something went wrong, hence user update has failed!' });
            }).clone().catch(err => console.warn(err));
            return 
        });

        if (userUpdate.error !== undefined) {
            return res.status(202).json({ error: userUpdate.error });
        }

        return userUpdate;
    },
    profilePhotoUpdate: async (req, res) => {
        const user = await module.exports.authInfo(req, res);
        if (user.length === 1) {
            const userId = user[0].user_id;
            let sizeChecker = true;
            if (!req.file) {
                return res.status(412).json({ error: 'No files selected' });
            }
            if (req.file.size > 2000000) {
                sizeChecker = false;
            }
            if (!sizeChecker) {
                return res.status(412).json({ error: 'Selected file is too large. Please choose file not larger than 2MB' });
            }
            await User.findById(userId, async (error, result) => {
                if (!error) {
                    if (!result) {
                        return res.status(404).json({ error: 'User was not found' });
                    }
                    const uploadPhoto = await cloudinaryUploader.uploader.upload(req.file.path, { folder: 'sciensta/profile_photos' });
                    if (!uploadPhoto.public_id || !uploadPhoto.secure_url) {
                        return res.status(412).json({ error: 'Sorry, profile photo was not uploaded' });
                    }
                    await User.findByIdAndUpdate(userId, { photo: uploadPhoto.secure_url || result.secure_url, photo_id: uploadPhoto.public_id || result.public_id }, async (err, response) => {
                        if (!err) {
                            return res.status(200).json({ message: 'Profile photo was successfully uploaded', photo_url: uploadPhoto.secure_url });
                        }
                        return res.status(500).json({ error: 'Something went wrong, hence profile photo was not uploaded!' });
                    }).clone().catch(err => console.warn(err));

                    if (uploadPhoto.secure_url && result.photo_id !== undefined) {
                        await cloudinaryUploader.uploader.destroy(result.photo_id);
                    }
                    return;
                }
            }).clone().catch(err => console.warn(err));
            return;
        }
    },
    intentionalPasswordReset: async (req, res) => {
        const user = await module.exports.authInfo(req, res);
        if (user.length === 1) {
            const userId = user[0].user_id;
            const { oldPassword, password, password_confirmation } = req.body;
            const changePassword = passwordValidate(password, password_confirmation, async () => {
                await User.findById(userId, async (err, result) => {
                    if (!err) {
                        if (!result) {
                            return res.status(404).json({ error: 'User could not be found' });
                        }
                        const verifyPassword = await compareSync(oldPassword, result.password);
                        if (!verifyPassword) {
                            return res.status(412).json({ error: 'Old password is wrong' });
                        }
                        const hashedPassword = await hashSync(password, salt);
                        await User.findByIdAndUpdate(userId, { password: hashedPassword }, async (updateError, updateResponse) => {
                            if (!updateError) {
                                return res.status(200).json({ message: 'Password has been changed successfully' });
                            }
                            return res.status(500).json({ error: 'Something went wrong and password update failed' });
                        }).clone().catch(err => console.warn(err));
                    }

                }).clone().catch(err => console.warn(err));
                return
            })

            if (changePassword.error !== undefined) {
                return res.status(412).json({ error: changePassword.error });
            }

            return changePassword;
        }
        return res.status(500).json({ error: 'Whoops! Something went wrong. Possible hack: Logout and retry login' });
    },
    deleteAccount: async (req, res) => {
        const id = req.params.id;
        if (id.length < 12) {
            return res.status(412).json({ error: 'Server rejected the Url parameters' });
        }
        await User.findById(id, async (err, result) => {
            if (!err) {
                if (!result) {
                    return res.status(404).json({ error: 'User does not exist on this platform' });
                }
                result.photo_id && await cloudinaryUploader.uploader.destroy(result.photo_id);
                await User.findByIdAndDelete(id, async (error, doc) => {
                    //render all of this user's archieves as anonymous && delete assoc categories
                    if (!error) {
                        await Archieve.find({ user_id: id }, async (newError, foundArray) => {
                            if (!newError) {
                                if (!foundArray.length) {
                                    return;
                                }
                                foundArray.map(async list => {
                                    await Archieve.findByIdAndUpdate(list._id, { user_id: 'Anonymous User' }).clone().catch(err => console.warn(err));
                                    return null;
                                })
                                await ArchieveCategory.find({user: id}, async (categoryError, categoryArray) => {
                                    if (!categoryError) {
                                        if (!categoryArray.length) {
                                            return;
                                        }
                                        categoryArray.map(async list => {
                                            await ArchieveCategory.findByIdAndDelete(list._id).clone().catch(err => console.warn(err));
                                            return null;
                                        })
                                    }
                                }).clone().catch(err => console.warn(err));
                                return
                            }
                        }).clone().catch(err => console.warn(err));
                        return res.status(200).json({ message: 'Account was deleted successfully' });
                    }
                    return res.status(500).json({ error: 'Whoops! Something went wrong' });
                }).clone().catch(err => console.warn(err));
                return
            }
            return res.status(500).json({ error: 'Whoops! Something went wrong' });
        }).clone().catch(err => console.warn(err));
        return
    },
    destroySelf: async (req, res) => {
        const user = await module.exports.authInfo(req, res);
        if (user.length === 1) {
            const userId = user[0].user_id;
            const body = req.body;
            body.suggestion = !body.suggestion ? '' : body.suggestion;
            if (!body.reason.length) {
                return res.status(412).json({ message: 'We strongly requested for your reason to leave the platform' });
            }
            await User.findById(userId, async (err, found) => {
                if (!err) {
                    if (!found) {
                        return res.status(404).json({ error: 'Server noticed a non-existing account' });
                    }
                    found.photo_id && await cloudinaryUploader.uploader.destroy(found.photo_id);
                    await User.findByIdAndDelete(userId, async (error, doc) => {
                        //render all your archieves as anonymous
                        if (!error) {
                            const reasonInstance = new Reason({ reason: body.reason, suggestion: body.suggestion });
                            await reasonInstance.save();
                            return res.status(200).json({ error: 'Account was deleted successfully' });
                        }
                        return res.status(500).json({ error: 'Whoops! Something went wrong' });
                    }).clone().catch(err => console.warn(err));
                    return
                }
                return res.status(500).json({ error: 'Whoops! Something went wrong.' });
            }).clone().catch(err => console.warn(err));
            return
        }
        return res.status(500).json({ error: 'Whoops! Something went wrong. Possible hack: Logout and retry login' });
    },
    fetchAllUsers: async (req, res) => {
        const viewables = ['_id', 'title', 'gender', 'firstname', 'lastname', 'email', 'phone', 'photo', 'story', 'usertype', 'extraDuty'];
        await User.find({}, viewables, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Whoops! Something went wrong' });
            }

            return res.status(200).json(results);
        }).clone().catch(err => console.error(err));
        return;
    },
    fetchReviewers: async (req, res) => {
        const viewables = ['_id', 'title', 'gender', 'firstname', 'lastname', 'email', 'phone', 'photo', 'story', 'usertype', 'extraDuty'];
        await User.find({extraDuty: true}, viewables, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Whoops! Something went wrong' });
            }

            return res.status(200).json(results);
        }).clone().catch(err => console.error(err));
        return;
    }
}