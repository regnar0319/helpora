require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Trust the Render proxy to fix global Rate Limiter IP sharing bugs
app.set('trust proxy', 1);

// Global Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://js.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com"],
            connectSrc: ["'self'", "https://api.stripe.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"]
        }
    }
})); // Strict Security headers whitelisting Stripe integrations

app.use(compression()); // Compress all payload responses

// Secure CORS Configuration
const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://helpora-cqnm.onrender.com' // Explicitly whitelist Render frontend
].filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
    );
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // IN STRICT PROD, you might want to remove `!origin` to block cURL
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies and authorization headers
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// --- Stripe Webhook MUST precede express.json() to retain the raw body buffer ---
const paymentController = require('./controllers/paymentController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

app.use(express.json());
app.use(morgan('dev')); // Logging

// --- Global Rate Limiter ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/payments', paymentRoutes);

const path = require('path');

// Base route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Page Routes
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

app.get('/provider/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/provider-register.html'));
});

app.get('/provider/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/provider-dashboard.html'));
});

// Error handling middleware
const { errorHandler } = require('./middleware/errorMiddleware');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
