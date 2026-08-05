import College from '../models/college.model.js';
import User from '../models/user.model.js';
import Invitation from '../models/invitation.model.js';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail.js';

const createCollegeSchema = z.object({
    name: z.string().trim().min(2, 'College name is required'),

    slug: z
        .string()
        .trim()
        .toLowerCase()
        .min(2, 'Slug is required')
        .regex(
            /^[a-z0-9-]+$/,
            'Slug can only contain lowercase letters, numbers and hyphens'
        ),

    allowedDomains: z
        .array(
            z.string()
                .trim()
                .min(1, 'Domain cannot be empty')
                .regex(
                    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    'Invalid domain format'
                )
        )
        .min(1, 'At least one allowed domain is required'),

    contactEmail: z
        .string()
        .email('Invalid email')
        .optional(),

    contactPhone: z
        .string()
        .trim()
        .optional()
});

const updateCollegeStatusSchema = z.object({
    isActive: z.boolean()
});


export const createCollege = async (req, res) => {
    try {
        // 1. Validate request
        const validatedData = createCollegeSchema.parse(req.body);

        // 2. Check duplicate
        const collegeExists = await College.findOne({
            slug: validatedData.slug
        });

        if (collegeExists) {
            return res.status(400).json({
                status: 'error',
                message: 'College slug already exists'
            });
        }

        // 3. Create
        const college = await College.create(validatedData);

        return res.status(201).json({
            status: 'success',
            data: college
        });

    } catch (error) {

        // Zod validation error
        if (error.name === 'ZodError') {
            return res.status(400).json({
                status: 'error',
                errors: error.errors
            });
        }

        // Duplicate key from MongoDB
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'College slug already exists'
            });
        }

        console.error(error);

        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};


export const getColleges = async (req, res) => {
    try {
        const colleges = await College.find();

        return res.status(200).json({
            status: 'success',
            data: colleges
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};


export const updateCollegeStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const { isActive } = updateCollegeStatusSchema.parse(req.body);

        const college = await College.findByIdAndUpdate(
            id,
            { isActive },
            { new: true, runValidators: true }
        );

        if (!college) {
            return res.status(404).json({
                status: 'error',
                message: 'College not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: college
        });

    } catch (error) {

        if (error.name === 'ZodError') {
            return res.status(400).json({
                status: 'error',
                errors: error.errors
            });
        }

        console.error(error);

        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

export const updateCollege = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validate request
        const validatedData = createCollegeSchema.parse(req.body);

        // 2. Check duplicate slug for other colleges
        const collegeExists = await College.findOne({
            slug: validatedData.slug,
            _id: { $ne: id }
        });

        if (collegeExists) {
            return res.status(400).json({
                status: 'error',
                message: 'College slug already exists'
            });
        }

        // 3. Update
        const college = await College.findByIdAndUpdate(
            id,
            validatedData,
            { new: true, runValidators: true }
        );

        if (!college) {
            return res.status(404).json({
                status: 'error',
                message: 'College not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: college
        });

    } catch (error) {
        // Zod validation error
        if (error.name === 'ZodError') {
            return res.status(400).json({
                status: 'error',
                errors: error.errors
            });
        }

        // Duplicate key from MongoDB
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'College slug already exists'
            });
        }

        console.error(error);

        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};


export const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({
            role: 'college_admin'
        }).populate('collegeId', 'name slug').select('-password');

        return res.status(200).json({
            status: 'success',
            data: admins
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

const inviteAdminSchema = z.object({
    email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
    collegeId: z.string().min(1, 'College ID is required')
});

export const inviteAdmin = async (req, res) => {
    try {
        const validated = inviteAdminSchema.parse(req.body);
        
        // 1. Check if user already exists
        const normalizedEmail = validated.email.toLowerCase().trim();
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ status: 'error', message: 'An account with this email address already exists. Please sign in instead.' });
        }

        // 2. Check if college exists
        const college = await College.findById(validated.collegeId);
        if (!college) {
            return res.status(404).json({ status: 'error', message: 'College not found' });
        }

        // 3. Clear only pending (unaccepted) invitations for this email to preserve accepted audit trail
        await Invitation.deleteMany({ email: validated.email, isAccepted: false });

        // 4. Generate random token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Expiration in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // 5. Save Invitation
        const invitation = await Invitation.create({
            email: validated.email,
            collegeId: validated.collegeId,
            token,
            expiresAt
        });

        // 6. Send Invitation Email
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const inviteLink = `${clientUrl}/accept-invite?token=${token}`;

        await sendEmail({
            email: validated.email,
            subject: 'MessConnect College Admin Invitation',
            message: `You have been invited to manage the MessConnect portal for ${college.name} as a College Admin.

Please complete your registration within 7 days by clicking the link below:
${inviteLink}

If you did not request this invitation, please ignore this email.`
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n[EMAIL MOCK] Sent invitation link to ${validated.email}:\n${inviteLink}\n`);
        }

        res.status(201).json({
            status: 'success',
            message: 'Invitation sent successfully',
            data: {
                _id: invitation._id,
                email: invitation.email,
                expiresAt: invitation.expiresAt,
                isAccepted: invitation.isAccepted
            }
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ status: 'error', errors: error.errors });
        }
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message || 'Something went wrong' });
    }
};

export const getInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.find()
            .populate('collegeId', 'name slug')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: invitations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
};