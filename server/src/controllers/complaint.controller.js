import Complaint from '../models/complaint.model.js';
import Mess from '../models/mess.model.js';
import { sendEmail } from '../utils/sendEmail.js';

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (Student/Mess Committee)
export const createComplaint = async (req, res) => {
    try {
        const { title, description, category, latitude, longitude, address, mess } = req.body;

        if (!mess) {
            return res.status(400).json({ status: 'error', message: 'Mess is required' });
        }

        // Check if the student is currently banned
        if (req.user.bannedUntil && new Date() < new Date(req.user.bannedUntil)) {
            return res.status(403).json({
                status: 'error',
                message: `Your complaint submission privileges are suspended until ${new Date(req.user.bannedUntil).toLocaleDateString()} due to a low trust score.`
            });
        }

        // Parse coverImage similar to course implementation 
        let image = "";
        if (req.file) {
            // Construct URL for the uploaded file
            image = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        } else if (req.body.image) {
            image = req.body.image;
        }

        const complaint = await Complaint.create({
            user_id: req.user._id,
            title,
            description,
            category,
            mess,
            image,
            location: (latitude && longitude) ? { latitude, longitude, address } : undefined,
            status: 'pending',
            collegeId: req.collegeId
        });

        res.status(201).json({
            status: 'success',
            data: complaint
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
export const getComplaints = async (req, res) => {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        let queryFilter = {
            $and: [
                {
                    $or: [
                        { status: { $nin: ['resolved', 'rejected'] } },
                        { resolvedAt: { $gte: twoDaysAgo } },
                        { resolvedAt: { $exists: false }, updatedAt: { $gte: twoDaysAgo } }
                    ]
                }
            ]
        };

        // Enforce tenant isolation for non-super-admins
        if (req.user.role !== 'super_admin') {
            queryFilter.collegeId = req.collegeId;
        }

        // Students, Mess Committee, Admins can filter via parameter if provided
        if (req.query.mess && req.user.role !== 'vendor') {
            queryFilter.mess = req.query.mess;
        }

        // Vendors are locked to their assigned mess
        if (req.user.role === 'vendor') {
            if (req.user.messAssigned && req.user.messAssigned !== 'None') {
                queryFilter.mess = req.user.messAssigned;
            }
        }

        let complaints;

        if (req.user.role === 'student') {
            // Students should not see any rejected complaints
            let studentFilter = { ...queryFilter, $and: [...queryFilter.$and, { status: { $ne: 'rejected' } }] };
            complaints = await Complaint.find(studentFilter)
                .populate('user_id', 'name email avatar trustMeter role')
                .populate('assignedTo', 'name email')
                .populate('mess', 'name')
                .sort({ createdAt: -1 });
        } else if (['mess_committee', 'college_admin', 'super_admin'].includes(req.user.role)) {
            // Committee, College Admins, and Super Admins see all complaints in their college (matching queryFilter)
            complaints = await Complaint.find(queryFilter)
                .populate('user_id', 'name email avatar trustMeter role')
                .populate('assignedTo', 'name email')
                .populate('mess', 'name')
                .sort({ createdAt: -1 });
        } else if (req.user.role === 'vendor') {
            // Vendors see assigned or completed complaints assigned specifically to them
            queryFilter.status = { $in: ['assigned', 'vendor_completed'] };
            queryFilter.assignedTo = req.user._id;
            complaints = await Complaint.find(queryFilter)
                .populate('user_id', 'name email avatar trustMeter role')
                .populate('assignedTo', 'name email')
                .populate('mess', 'name')
                .sort({ createdAt: -1 });
        }

        res.json({
            status: 'success',
            count: complaints?.length || 0,
            data: complaints || []
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};


// @desc    Update complaint status (committee can assign, reject, resolve)
// @route   PATCH /api/complaints/:id/status
// @access  Private (Mess Committee)
export const updateComplaintStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowed = ['assigned', 'rejected', 'resolved'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ status: 'error', message: `Invalid status. Allowed: ${allowed.join(', ')}` });
        }

        const penaltyMap = {
            duplicate: 0,
            wrong_category: -2,
            spam: -10,
            false_information: -15,
            inappropriate: -10
        };

        if (status === 'rejected') {
            const { rejectionReason } = req.body;
            if (!rejectionReason || !penaltyMap.hasOwnProperty(rejectionReason)) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: `A valid rejectionReason is required when status is rejected. Allowed: ${Object.keys(penaltyMap).join(', ')}` 
                });
            }
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ status: 'error', message: 'Complaint not found' });
        }

        const currentStatus = complaint.status;

        // Enforce state transition rules
        if (currentStatus === 'resolved' || currentStatus === 'rejected') {
            return res.status(400).json({ status: 'error', message: 'Resolved or Rejected complaints cannot be updated.' });
        }

        if (currentStatus === 'pending') {
            if (status !== 'assigned' && status !== 'rejected') {
                return res.status(400).json({ status: 'error', message: 'Pending complaints can only be assigned to a vendor or rejected.' });
            }
        }

        if (currentStatus === 'assigned') {
            if (status !== 'rejected') {
                return res.status(400).json({ status: 'error', message: 'Assigned complaints can only be rejected by the committee.' });
            }
        }

        if (currentStatus === 'vendor_completed') {
            if (status !== 'assigned' && status !== 'resolved') {
                return res.status(400).json({ status: 'error', message: 'Completed complaints can only be resolved or re-assigned.' });
            }
        }

        // Handle auto-assignment when changing to 'assigned'
        if (status === 'assigned') {
            const User = (await import('../models/user.model.js')).default;
            const vendor = await User.findOne({
                role: 'vendor',
                messAssigned: complaint.mess,
                collegeId: req.collegeId,
                isActive: true,
                isApprovedByAdmin: true
            });

            if (!vendor) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No active/approved vendor is currently associated with this mess.'
                });
            }
            complaint.assignedTo = vendor._id;
        }

        complaint.status = status;
        if (status === 'resolved' || status === 'rejected') {
            complaint.resolvedAt = Date.now();
            if (status === 'rejected') {
                complaint.rejectionReason = req.body.rejectionReason;
            } else {
                complaint.rejectionReason = null;
            }
        }

        const updatedComplaint = await complaint.save();

        // Apply TrustMeter changes (reward/penalty)
        if (status === 'resolved' || status === 'rejected') {
            try {
                const User = (await import('../models/user.model.js')).default;
                const student = await User.findById(complaint.user_id);
                if (student && student.role === 'student') {
                    if (status === 'rejected') {
                        const penalty = penaltyMap[complaint.rejectionReason] || 0;
                        if (penalty !== 0) {
                            student.trustMeter = Math.max(0, (student.trustMeter ?? 100) + penalty);
                            if (student.trustMeter === 0) {
                                // Ban the student for 7 days
                                student.bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                            }
                            await student.save();
                        }
                    } else if (status === 'resolved') {
                        // Reward positive submission
                        student.trustMeter = Math.min(100, (student.trustMeter ?? 100) + 10);
                        await student.save();
                    }
                }
            } catch (trustError) {
                console.error('Failed to update student trust meter:', trustError.message);
            }
        }

        // Send email notification (asynchronously in background)
        if (status === 'resolved' || status === 'rejected') {
            (async () => {
                try {
                    const User = (await import('../models/user.model.js')).default;
                    const student = await User.findById(complaint.user_id);
                    if (student && student.email) {
                        const rejectDetails = status === 'rejected' ? `\nReason for Rejection: ${complaint.rejectionReason.replace('_', ' ').toUpperCase()}` : '';
                        await sendEmail({
                            email: student.email,
                            subject: `Complaint Status Update - MessConnect`,
                            message: `Hello ${student.name},\n\nYour complaint titled "${complaint.title}" has been marked as ${status.toUpperCase()} by the Mess Committee.${rejectDetails}\n\nDetails:\n- Title: ${complaint.title}\n- Category: ${complaint.category}\n- Status: ${status.toUpperCase()}\n\nThank you for your feedback,\nMessConnect Team`
                        });
                    }
                } catch (emailError) {
                    console.error('Failed to send notification email:', emailError.message);
                }
            })();
        }

        res.json({ status: 'success', data: updatedComplaint });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Mark complaint as completed by vendor
// @route   PATCH /api/complaints/:id/vendor-complete
// @access  Private (Vendor)
export const markVendorCompleted = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ status: 'error', message: 'Complaint not found' });
        }

        if (complaint.status !== 'assigned') {
            return res.status(400).json({ status: 'error', message: 'Only assigned complaints can be marked as completed' });
        }

        complaint.status = 'vendor_completed';
        complaint.vendorCompletedAt = Date.now();
        const updatedComplaint = await complaint.save();

        res.json({
            status: 'success',
            data: updatedComplaint
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};



// @desc    Upvote a complaint
// @route   POST /api/complaints/:id/upvote
// @access  Private (Student)
export const upvoteComplaint = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ status: 'error', message: 'Only students can upvote complaints' });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ status: 'error', message: 'Complaint not found' });
        }

        // Initialize upvotes array if it doesn't exist (for older records)
        if (!complaint.upvotes) {
            complaint.upvotes = [];
        }

        // Check if user already upvoted (convert ObjectIds to strings for safe comparison)
        const userIdStr = req.user._id.toString();
        const index = complaint.upvotes.findIndex(id => id.toString() === userIdStr);

        if (index > -1) {
            // Remove upvote
            complaint.upvotes.splice(index, 1);
        } else {
            // Add upvote
            complaint.upvotes.push(req.user._id);
        }

        await complaint.save();

        res.json({
            status: 'success',
            data: complaint
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
