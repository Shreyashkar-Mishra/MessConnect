import User from "../models/user.model.js";
import Otp from "../models/otp.model.js";
import College from "../models/college.model.js";
import Mess from "../models/mess.model.js";
import Invitation from "../models/invitation.model.js";

import jwt from "jsonwebtoken";
import { z } from "zod";
import { sendEmail } from "../utils/sendEmail.js";

const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
const upperCaseRegex = /[A-Z]/;
const lowerCaseRegex = /[a-z]/;

/* =============================
   BASE VALIDATION SCHEMA
   NOTE: college_admin and super_admin are intentionally excluded.
   college_admin registers via invitation link only (/accept-invite).
   super_admin is seeded directly.
============================= */

const baseSchema = z.object({
    name: z.string().min(3).max(50),
    email: z.email().transform(v => v.toLowerCase()),
    password: z.string()
        .min(8, { message: "Must be 8 char long." })
        .max(50)
        .regex(specialCharRegex, { message: "Must contain one special char." })
        .regex(upperCaseRegex, { message: "Must contain one upper case char." })
        .regex(lowerCaseRegex, { message: "Must contain one lower case char." }),
    role: z.enum(["student", "vendor", "mess_committee"]),
    phoneNumber: z.string().min(10),

    collegeSlug: z.string().optional(),
    messAssigned: z.string().optional(), // ObjectId of the Mess
    companyName: z.string().optional(),
    otp: z.string().length(6, { message: "OTP must be exactly 6 digits." })
});


/* =============================
   SIGNUP CONTROLLER
============================= */

const signup = async (req, res) => {

    const parsedData = baseSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(400).json({
            message: "Invalid input format",
            error: parsedData.error
        });
    }

    const data = parsedData.data;

    if (data.role === "vendor") {
        if (!data.companyName) {
            return res.status(400).json({
                message: "Vendor must provide companyName"
            });
        }
        if (!data.messAssigned) {
            return res.status(400).json({
                message: "Vendor must select an assigned mess"
            });
        }
    }

    try {
        let collegeId = null;

        const emailDomain = data.email.split("@")[1];

        // Vendors provide their college via collegeSlug in the request body
        if (data.role === "vendor") {
            if (!data.collegeSlug) {
                return res.status(400).json({ message: "collegeSlug is required for vendors" });
            }
            const college = await College.findOne({ slug: data.collegeSlug });
            if (!college) {
                return res.status(400).json({ message: "Invalid college slug provided." });
            }
            collegeId = college._id;

            // Check if there is already an approved vendor for the same mess in this college
            const existingApprovedVendor = await User.findOne({
                role: 'vendor',
                collegeId,
                messAssigned: data.messAssigned,
                isApprovedByAdmin: true
            });
            if (existingApprovedVendor) {
                return res.status(400).json({ message: 'A vendor is already registered and approved for this mess.' });
            }
        }
        // For students and mess_committee, college is derived strictly from the email domain
        else {
            const college = await College.findOne({ allowedDomains: emailDomain });

            if (!college) {
                return res.status(400).json({ message: `Your email domain (${emailDomain}) is not registered with any college.` });
            }

            if (data.collegeSlug && college.slug !== data.collegeSlug) {
                return res.status(400).json({ message: "Your email domain does not belong to this specific college portal." });
            }

            collegeId = college._id;
        }

        // Validate OTP — match strictly on email to prevent cross-phone/email collisions
        const otpRecord = await Otp.findOne({
            email: data.email,
            otp: data.otp
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const normalizedEmail = data.email.toLowerCase().trim();
        const userExists = await User.findOne({ email: normalizedEmail });

        if (userExists) {
            return res.status(400).json({ message: "An account with this email address already exists. Please sign in instead." });
        }

        if (data.messAssigned === "") {
            data.messAssigned = undefined;
        }
        let vendorDocuments = undefined;
        if (data.role === 'vendor' && req.files) {
            vendorDocuments = {};
            const fields = ['udyamCertificate', 'fssaiLicense', 'labourLicense', 'gstCertificate', 'panCard', 'aadhaarCard'];
            fields.forEach(field => {
                if (req.files[field] && req.files[field][0]) {
                    const file = req.files[field][0];
                    vendorDocuments[field] = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
                }
            });
        }

        // Create the user — only pick the fields we explicitly allow (never spread raw request body)
        const newUser = await User.create({
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            phoneNumber: data.phoneNumber,
            companyName: data.companyName,
            vendorDocuments,
            messAssigned: data.messAssigned,
            collegeId: collegeId || undefined,
            isVerified: true,        // verified by OTP
            isApprovedByAdmin: false  // pending college_admin review for vendor/committee
        });

        // Cleanup OTP
        await Otp.deleteOne({ _id: otpRecord._id });

        const token = jwt.sign(
            { _id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: true
        });

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                collegeId: newUser.collegeId
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/* =============================
   LOGIN CONTROLLER
============================= */

const login = async (req, res) => {
    try {

        let { email, password } = req.body;

        if (email) email = email.toLowerCase();

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

        // college_admin accounts are always pre-approved via invitation; only vendor/committee need admin review
        if (["vendor", "mess_committee"].includes(user.role) && !user.isApprovedByAdmin) {
            return res.status(403).json({
                message: "Your account is pending admin verification."
            });
        }

        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: true
        });


        res.status(200).json({
            message: "Logged in successfully",
            token,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                isApprovedByAdmin: user.isApprovedByAdmin,
                collegeId: user.collegeId
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



/* =============================
   LOGOUT
============================= */

const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: true
    });

    res.status(200).json({ message: "Logged out successfully" });
};


/* =============================
   SEND OTP
============================= */

const sendOtp = async (req, res) => {
    try {
        const { email, phoneNumber, role, collegeSlug, messAssigned } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({ message: "Email or Phone Number is required" });
        }

        // Phone-only OTP is not yet implemented (no SMS gateway)
        if (phoneNumber && !email) {
            return res.status(501).json({ message: "Phone-only OTP is not yet supported. Please provide an email address." });
        }

        // Check if user with this email already exists
        if (email) {
            const normalizedEmail = email.toLowerCase().trim();
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                return res.status(400).json({ message: "An account with this email address already exists. Please sign in instead." });
            }
        }

        // Check if user with this phone number already exists
        if (phoneNumber) {
            const existingPhone = await User.findOne({ phoneNumber });
            if (existingPhone) {
                return res.status(400).json({ message: "An account with this phone number already exists." });
            }
        }

        // If vendor registration, check if vendor for this mess already exists
        if (role === 'vendor') {
            if (!messAssigned) {
                return res.status(400).json({ message: "Vendor must select an assigned mess." });
            }
            if (!collegeSlug) {
                return res.status(400).json({ message: "College slug is required for vendor." });
            }
            const college = await College.findOne({ slug: collegeSlug });
            if (!college) {
                return res.status(400).json({ message: "Invalid college selected." });
            }
            const existingVendor = await User.findOne({
                role: 'vendor',
                collegeId: college._id,
                messAssigned
            });
            if (existingVendor) {
                return res.status(400).json({ message: "A vendor account already exists for this mess." });
            }
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.create({
            email: email ? email.toLowerCase() : undefined,
            phoneNumber,
            otp
        });

        // Send OTP via email
        if (email) {
            await sendEmail({
                email,
                subject: 'MessConnect Verification OTP',
                message: `Your verification OTP is: ${otp}. It is valid for 5 minutes.`
            });
        }

        res.status(200).json({ status: "success", message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* =============================
   RESET PASSWORD
============================= */

const resetPasswordSchema = z.object({
    email: z.email().transform(v => v.toLowerCase()),
    otp: z.string().length(6, { message: "OTP must be exactly 6 digits." }),
    newPassword: z.string()
        .min(8, { message: "Must be 8 char long." })
        .max(50)
        .regex(specialCharRegex, { message: "Must contain one special char." })
        .regex(upperCaseRegex, { message: "Must contain one upper case char." })
        .regex(lowerCaseRegex, { message: "Must contain one lower case char." })
});

const resetPassword = async (req, res) => {
    try {
        const parsedData = resetPasswordSchema.safeParse(req.body);

        if (!parsedData.success) {
            return res.status(400).json({
                message: "Invalid input format",
                error: parsedData.error.issues
            });
        }

        const { email, otp, newPassword } = parsedData.data;

        // Verify OTP
        const otpRecord = await Otp.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Verify User
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update password and let pre('save') hook hash it
        user.password = newPassword;
        await user.save();

        // Cleanup OTP
        await Otp.deleteOne({ _id: otpRecord._id });

        res.status(200).json({ status: "success", message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* =============================
   GET ME
============================= */

const getMe = async (req, res) => {
    try {
        res.json({ status: 'success', user: req.user });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/* =============================
   GET ACTIVE COLLEGES
============================= */

const getActiveColleges = async (req, res) => {
    try {
        const colleges = await College.find({ isActive: true }).select('name slug allowedDomains');
        res.status(200).json({ status: 'success', data: colleges });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/* =============================
   GET MESSES
============================= */

const getMesses = async (req, res) => {
    try {
        const { collegeId } = req.query;
        if (!collegeId) {
            return res.status(400).json({ status: 'error', message: 'collegeId is required' });
        }
        const messes = await Mess.find({ collegeId, isActive: true }).select('name');
        res.status(200).json({ status: 'success', data: messes });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/* =============================
   INVITATION — VERIFY TOKEN
============================= */

const getInvitationByToken = async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await Invitation.findOne({ token, isAccepted: false }).populate('collegeId', 'name');
        if (!invitation) {
            return res.status(404).json({ status: 'error', message: 'Invitation not found or already accepted' });
        }

        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({ status: 'error', message: 'Invitation has expired' });
        }

        res.status(200).json({
            status: 'success',
            data: {
                email: invitation.email,
                collegeName: invitation.collegeId?.name || 'N/A',
                collegeId: invitation.collegeId?._id
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
};

/* =============================
   INVITATION — ACCEPT & REGISTER
============================= */

const acceptInvitationSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    name: z.string().min(3).max(50),
    phoneNumber: z.string().min(10),
    password: z.string()
        .min(8, { message: "Must be 8 char long." })
        .max(50)
        .regex(specialCharRegex, { message: "Must contain one special char." })
        .regex(upperCaseRegex, { message: "Must contain one upper case char." })
        .regex(lowerCaseRegex, { message: "Must contain one lower case char." })
});

const acceptInvitation = async (req, res) => {
    try {
        const parsed = acceptInvitationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ status: 'error', message: 'Invalid input format', error: parsed.error });
        }

        const { token, name, password, phoneNumber } = parsed.data;

        // 1. Verify invitation
        const invitation = await Invitation.findOne({ token, isAccepted: false });
        if (!invitation) {
            return res.status(404).json({ status: 'error', message: 'Invitation not found or already accepted' });
        }

        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({ status: 'error', message: 'Invitation has expired' });
        }

        // 2. Check duplicate email or phone
        const normalizedEmail = invitation.email.toLowerCase().trim();
        const emailExists = await User.findOne({ email: normalizedEmail });
        if (emailExists) {
            return res.status(400).json({ status: 'error', message: 'An account with this email address already exists. Please sign in instead.' });
        }

        const phoneExists = await User.findOne({ phoneNumber });
        if (phoneExists) {
            return res.status(400).json({ status: 'error', message: 'A user with this phone number already registered' });
        }

        // 3. Create College Admin — pre-approved because they were invited by Super Admin
        const newUser = await User.create({
            name,
            email: invitation.email,
            password,
            phoneNumber,
            role: 'college_admin',
            collegeId: invitation.collegeId,
            isVerified: true,
            isApprovedByAdmin: true
        });

        // 4. Mark invitation as accepted
        invitation.isAccepted = true;
        await invitation.save();

        // 5. Sign JWT and set as httpOnly cookie only (do not expose in response body)
        const jwtToken = jwt.sign(
            { _id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.cookie("token", jwtToken, {
            httpOnly: true,
            sameSite: true
        });

        res.status(201).json({
            status: 'success',
            message: 'Invitation accepted and account registered successfully',
            token: jwtToken,
            user: {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                collegeId: newUser.collegeId
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message || 'Something went wrong' });
    }
};

export { signup, login, logout, sendOtp, resetPassword, getActiveColleges, getMesses, getMe, getInvitationByToken, acceptInvitation };
