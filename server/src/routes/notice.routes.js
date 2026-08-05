import express from 'express';
import { createNotice, getNotices, updateNotice, deleteNotice } from '../controllers/notice.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply protect middleware to all notice routes
router.use(protect);

router.route('/')
    .get(getNotices)
    .post(authorizeRoles('mess_committee', 'college_admin'), upload.single('image'), createNotice);

router.route('/:id')
    .patch(authorizeRoles('mess_committee', 'college_admin'), upload.single('image'), updateNotice)
    .delete(authorizeRoles('mess_committee', 'college_admin'), deleteNotice);

export default router;
