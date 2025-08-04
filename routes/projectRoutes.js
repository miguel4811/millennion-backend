// millennion/backend/routes/projectRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const { exportMvpAsZip } = require('../controllers/projectController');

// @desc    Exportar un MVP de ejemplo como archivo ZIP
// @route   GET /api/projects/export-mvp
// @access  Private (requiere autenticación)
router.get('/export-mvp', protect, exportMvpAsZip);

module.exports = router;
