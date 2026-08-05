import express from 'express';
import { getPendingUsers, approveUser, denyUser, getPendingStaff, approveStaff, denyStaff } from '../controllers/admin.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('college_admin'));

router.get('/pending-users', getPendingUsers);
router.patch('/approve-user/:id', approveUser);
router.post('/deny-user/:id', denyUser);

router.get('/pending-staff', getPendingStaff);
router.patch('/approve-staff/:id', approveStaff);
router.delete('/deny-staff/:id', denyStaff);

export default router;
