var express = require('express');
const { getReviews } = require('../controllers/reviews');
var router = express.Router();

/* GET home page. */
router.get('/reviews', getReviews);

module.exports = router;
