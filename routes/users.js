const { fetchUsers, createUser, verifyUser, resendVerificationLink, forgotPassword, resetPassword, login, updateUser, profilePhotoUpdate, user_middleware, intentionalPasswordReset, admin_middleware, deleteAccount, destroySelf, fetchUser, fetchAllUsers, searchUser, fetchReviewers } = require('../controllers/users');
const { multerConfig } = require('../custom');

const router = require('express').Router();
const upload = multerConfig();

router.get('/', fetchUsers);
router.get('/:id', fetchUser);
router.get('/query/all', fetchAllUsers);
router.get('/search/user', searchUser);
router.get('/reviewers/list', fetchReviewers);
router.post('/', createUser);
router.post('/verify', verifyUser);
router.post('/verification/resend', resendVerificationLink);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', login);
router.post('/self-destroy', user_middleware, destroySelf);
router.patch('/', user_middleware, updateUser);
router.patch('/change-password', user_middleware, intentionalPasswordReset);
router.patch('/upload', user_middleware, upload.single("photo"), profilePhotoUpdate);
router.delete('/:id', admin_middleware, deleteAccount);

module.exports = router;