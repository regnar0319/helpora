const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// All payment generation routes inherently require strict authentication
router.use(authMiddleware);

// Create Stripe Payment Intent for a specific booking
router.post('/create-intent', paymentController.createPaymentIntent);

module.exports = router;
