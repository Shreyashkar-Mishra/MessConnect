import express from 'express';
import { addStaff, getStaff, updateStaff, deleteStaff } from '../controllers/staff.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';

import { staffDocUpload } from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply protect middleware to all staff routes
router.use(protect);

router.route('/')
    .get(authorizeRoles('vendor', 'mess_committee', 'college_admin'), getStaff)
    .post(authorizeRoles('vendor'), staffDocUpload, addStaff);

router.route('/:id')
    .patch(authorizeRoles('vendor'), updateStaff)
    .delete(authorizeRoles('vendor'), deleteStaff);

export default router;
