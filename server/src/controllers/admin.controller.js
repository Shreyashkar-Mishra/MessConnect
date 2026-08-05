import User from '../models/user.model.js';
import { sendEmail } from '../utils/sendEmail.js';

import Staff from '../models/staff.model.js';

export const getPendingUsers = async (req, res) => {
    try {
        // Only fetch pending users for the college_admin's specific college
        const pendingUsers = await User.find({
            role: { $in: ['vendor', 'mess_committee'] },
            isApprovedByAdmin: false,
            collegeId: req.collegeId
        }).populate('messAssigned', 'name').select('-password');
        
        res.status(200).json({ status: 'success', data: pendingUsers });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the user to get details and verify collegeId
        const user = await User.findOne({ _id: id, collegeId: req.collegeId });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found or does not belong to your college' });
        }

        // If approving a vendor, ensure no other vendor is already approved for the same mess in this college
        if (user.role === 'vendor') {
            const existingApprovedVendor = await User.findOne({
                role: 'vendor',
                collegeId: req.collegeId,
                messAssigned: user.messAssigned,
                isApprovedByAdmin: true,
                _id: { $ne: id }
            });
            if (existingApprovedVendor) {
                return res.status(400).json({ status: 'error', message: 'A vendor is already approved for this mess.' });
            }
        }

        user.isApprovedByAdmin = true;
        await user.save();

        // Retrieve user without password to send back
        const updatedUser = await User.findById(id).select('-password');
        
        res.status(200).json({ status: 'success', data: updatedUser });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const denyUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'Rejection reason is required' });
        }

        // Find the user to get details (email, name, role) and check if collegeId matches
        const user = await User.findOne({ _id: id, collegeId: req.collegeId });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found or does not belong to your college' });
        }

        // Send email notification to user
        await sendEmail({
            email: user.email,
            subject: 'MessConnect Registration Rejected',
            message: `Dear ${user.name},\n\nWe regret to inform you that your registration request for MessConnect has been denied by the college administrator.\n\nReason for denial:\n${reason}\n\nIf you have any questions, please reach out to the college admin.\n\nBest regards,\nMessConnect Team`
        });

        // Delete the user from the database
        await User.deleteOne({ _id: id });

        res.status(200).json({ status: 'success', message: 'User registration request denied and email sent' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getPendingStaff = async (req, res) => {
    try {
        const pendingStaff = await Staff.find({
            collegeId: req.collegeId,
            isApprovedByAdmin: false
        })
        .populate('vendor', 'name email companyName')
        .populate('mess', 'name');

        res.status(200).json({ status: 'success', data: pendingStaff });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const approveStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await Staff.findOne({ _id: id, collegeId: req.collegeId });

        if (!staff) {
            return res.status(404).json({ status: 'error', message: 'Staff member not found or does not belong to your college' });
        }

        staff.isApprovedByAdmin = true;
        await staff.save();

        res.status(200).json({ status: 'success', data: staff });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const denyStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await Staff.findOne({ _id: id, collegeId: req.collegeId });

        if (!staff) {
            return res.status(404).json({ status: 'error', message: 'Staff member not found or does not belong to your college' });
        }

        await staff.deleteOne();
        res.status(200).json({ status: 'success', message: 'Staff member registration rejected and removed' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

