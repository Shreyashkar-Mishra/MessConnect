import Feedback from '../models/feedback.model.js';
import Mess from '../models/mess.model.js';

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Private (Student only)
export const submitFeedback = async (req, res) => {
    try {
        const { date, ratings, comment, mess } = req.body;

        if (!mess) {
            return res.status(400).json({ status: 'error', message: 'Mess is required' });
        }

        if (req.user.role !== 'student') {
            return res.status(403).json({ status: 'error', message: 'Only students can submit feedback' });
        }

        // Ensure the mess belongs to the student's own college
        const messDoc = await Mess.findOne({ _id: mess, collegeId: req.collegeId });
        if (!messDoc) {
            return res.status(403).json({ status: 'error', message: 'Mess does not belong to your college' });
        }

        // Validate ratings array
        if (!Array.isArray(ratings) || ratings.length === 0) {
            return res.status(400).json({ status: 'error', message: 'At least one category rating is required' });
        }

        const feedbackDate = new Date(date);

        // Ensure date is valid
        if (isNaN(feedbackDate.getTime())) {
            return res.status(400).json({ status: 'error', message: 'Invalid date format' });
        }

        const today = new Date();
        if (
            feedbackDate.getFullYear() !== today.getFullYear() ||
            feedbackDate.getMonth() !== today.getMonth() ||
            feedbackDate.getDate() !== today.getDate()
        ) {
            return res.status(400).json({ status: 'error', message: 'Feedback can only be submitted for the present day' });
        }

        // The schema ensures uniqueness per user per date per mess, so match exactly what we are resolving
        let existingFeedback = await Feedback.findOne({
            user: req.user._id,
            mess,
            date: {
                $gte: new Date(feedbackDate.setHours(0, 0, 0, 0)),
                $lt: new Date(feedbackDate.setHours(23, 59, 59, 999))
            }
        });

        if (existingFeedback) {
            // Merge new ratings into existing document
            ratings.forEach(newRating => {
                const existingIndex = existingFeedback.ratings.findIndex(r => r.category === newRating.category);
                if (existingIndex >= 0) {
                    existingFeedback.ratings[existingIndex].rating = newRating.rating;
                } else {
                    existingFeedback.ratings.push(newRating);
                }
            });
            if (comment) existingFeedback.comment = comment; // Update comment if provided
            await existingFeedback.save();
            
            return res.status(200).json({
                status: 'success',
                data: existingFeedback
            });
        }

        const feedback = await Feedback.create({
            user: req.user._id,
            collegeId: req.collegeId,
            date: new Date(date), // use original date string
            mess, // assign the selected mess
            ratings,
            comment
        });

        res.status(201).json({
            status: 'success',
            data: feedback
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ status: 'error', message: 'You have already submitted feedback for this date' });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get feedback
// @route   GET /api/feedback
// @access  Private
export const getFeedback = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        // Always scope to the requesting user's college first
        let aggregateFilter = { collegeId: req.collegeId };

        if (req.user.role === 'student') {
            aggregateFilter.user = req.user._id;
        }

        // mess_committee / college_admin / super_admin may filter further by a specific mess (already scoped to college above)
        if (req.query.mess && ['mess_committee', 'college_admin', 'super_admin'].includes(req.user.role)) {
            // Validate the requested mess belongs to this college before trusting the param
            const messDoc = await Mess.findOne({ _id: req.query.mess, collegeId: req.collegeId });
            if (!messDoc) {
                return res.status(403).json({ status: 'error', message: 'Mess does not belong to your college' });
            }
            aggregateFilter.mess = req.query.mess;
        }

        if (req.user.role === 'vendor') {
            if (req.user.messAssigned && req.user.messAssigned !== 'None') {
                aggregateFilter.mess = req.user.messAssigned;
            }
        }
        
        // Calculate aggregations correctly mapped to entirety
        const allFeedbacksForAgg = await Feedback.find(aggregateFilter);
        let totalScore = 0; let totalRatings = 0;
        const catScores = {}; const catCounts = {};

        allFeedbacksForAgg.forEach(fb => {
             if (fb.ratings && fb.ratings.length) {
                fb.ratings.forEach(r => {
                    if (!catScores[r.category]) { catScores[r.category] = 0; catCounts[r.category] = 0; }
                    catScores[r.category] += r.rating;
                    catCounts[r.category]++;
                    totalScore += r.rating;
                    totalRatings++;
                });
             } else if (fb.rating) {
                totalScore += fb.rating;
                totalRatings++;
             }
        });
        const categoryAverages = {};
        Object.keys(catScores).forEach(cat => { categoryAverages[cat] = (catScores[cat] / catCounts[cat]).toFixed(1); });
        const avgRating = totalRatings ? (totalScore / totalRatings).toFixed(1) : '–';


        let listQueryFilter = { ...aggregateFilter };
        if (req.user.role === 'mess_committee') {
            listQueryFilter.comment = { $exists: true, $ne: '' };
        }

        let query = Feedback.find(listQueryFilter).populate('mess', 'name');

        if (['mess_committee', 'college_admin', 'super_admin'].includes(req.user.role)) {
            query = query.populate('user', 'name email');
        } else if (req.user.role === 'vendor') {
            query = query.select('-user');
        }

        const total = await Feedback.countDocuments(listQueryFilter);
        const feedbackList = await query.sort({ date: -1 }).skip(skip).limit(limit);

        res.status(200).json({
            status: 'success',
            count: feedbackList.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            categoryAverages,
            avgRating,
            data: feedbackList
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};


