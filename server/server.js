import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import complaintRoutes from './src/routes/complaint.routes.js';
import staffRoutes from './src/routes/staff.routes.js';
import feedbackRoutes from './src/routes/feedback.routes.js';
import noticeRoutes from './src/routes/notice.routes.js';
import timeTableRoutes from './src/routes/timeTable.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import superadminRoutes from './src/routes/superadmin.routes.js';
import messRoutes from './src/routes/mess.routes.js';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Trust the first proxy hop (required when deployed behind Render / any reverse proxy)
// Without this, express-rate-limit cannot read the X-Forwarded-For header and throws a ValidationError
app.set('trust proxy', 1);

// MIDDLEWARE

// CORS Configuration
// Build allowed origins list from env (supports comma-separated list)
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
];
if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach((url) => {
        const trimmed = url.trim();
        if (trimmed && !allowedOrigins.includes(trimmed)) {
            allowedOrigins.push(trimmed);
        }
    });
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser())

// Serve static files from the uploads directory
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);

// Other API routes to be implemented
// app.use('/api/users', userRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/timetable', timeTableRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/messes', messRoutes);


// ERROR HANDLING

// 404 Not Found middleware
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.path,
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// SERVER STARTUP
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Start server
        app.listen(PORT, () => {
            console.log(`MessConnect Server Running Successfully URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
