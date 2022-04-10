const { create, view, update, clear, search, getCategory, copies } = require('../controllers/categories');
const { user_middleware } = require('../controllers/users');

const router = require('express').Router();

router.post('/', user_middleware, create);
router.get('/', view);
router.get('/search', search);
router.get('/copy', copies);
router.get('/:id', getCategory);
router.patch('/', user_middleware, update);
router.delete('/:id', user_middleware, clear);

module.exports = router;