const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// All payment generation routes inherently require strict authentication
router.use(authMiddleware);

// Create Stripe Payment Intent for a specific booking
router.post('/create-payment-intent', paymentController.createPaymentIntent);

// Confirm booking after payment success
router.post('/confirm-booking', paymentController.confirmBooking);

module.exports = router;
