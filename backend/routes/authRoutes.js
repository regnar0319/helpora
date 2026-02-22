const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { check, validationResult } = require('express-validator');

// Validation middleware
const signupValidation = [
    check('email').isEmail().withMessage('Invalid email'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    check('role')
        .optional()
        .isIn(['customer', 'provider'])
        .withMessage('Invalid role. Allowed: customer, provider')
        .custom((value) => {
            if (value === 'admin') {
                throw new Error('Admin registration is not allowed');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// Multer setup for file uploads
const multer = require('multer');
const storage = multer.memoryStorage(); // Store in memory to upload to Supabase
const upload = multer({ storage: storage });

// --- Auth Rate Limiter ---
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/signup',
    authLimiter,
    upload.single('idDocument'),
    signupValidation,
    authController.signup
);
router.post('/login', authLimiter, authController.login);

module.exports = router;
