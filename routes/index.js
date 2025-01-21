var express = require('express');
var router = express.Router();

const checkoutController = require("../controllers/paidController");

/* GET home page. */
router.get('/', checkoutController.home);
router.post('/formToken', checkoutController.formToken);
router.post('/validate', checkoutController.apiValidate);
router.post('/ipn', checkoutController.ipn);

module.exports = router;
