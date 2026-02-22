const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const { check, validationResult } = require('express-validator');

const createBookingValidation = [
    check('serviceType').notEmpty().withMessage('Service type is required'),
    check('scheduledDate').isISO8601().withMessage('Invalid date format'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// All routes require authentication
router.use(authMiddleware);

router.post('/', createBookingValidation, bookingController.createBooking);
router.get('/', bookingController.getBookings);
router.put('/:id/assign', bookingController.assignProfessional);
router.put('/:id/status', bookingController.updateStatus);

module.exports = router;
