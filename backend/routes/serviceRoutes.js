const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/roleMiddleware');

// Protected Routes (Provider only)
router.get('/my-services', authMiddleware, authorizeRole('provider'), serviceController.getMyServices);

// Public Routes
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);
router.post('/', authMiddleware, authorizeRole('provider'), serviceController.createService);
router.put('/:id', authMiddleware, authorizeRole('provider'), serviceController.updateService);
router.delete('/:id', authMiddleware, authorizeRole('provider'), serviceController.deleteService);

module.exports = router;
