const { create, view, update, makeGallery, updateGallery, removePhoto, viewAll, viewOne, searchDocument, saveAsFavourite, likeDocument, postComment, removeComment, deleteDocument } = require('../controllers/archieves');
const { user_middleware } = require('../controllers/users');
const { multerConfig } = require('../custom');
const router = require('express').Router();

const upload = multerConfig();

router.post('/', user_middleware, create);
router.get('/', view);
router.get('/query_all', viewAll);
router.get('/archieve', viewOne);
router.get('/search', searchDocument);
router.patch('/', user_middleware, update);
router.patch('/save', user_middleware, saveAsFavourite);
router.patch('/like', user_middleware, likeDocument);
router.patch('/comment', user_middleware, postComment);
router.patch('/comment/remove', user_middleware, removeComment);
router.patch('/upload', user_middleware, upload.array("attachments", 10), makeGallery);
router.patch('/upload/alter', user_middleware, upload.single("attachments"), updateGallery);
router.patch('/upload/remove', user_middleware, removePhoto);
router.delete('/', user_middleware, deleteDocument);

module.exports = router;