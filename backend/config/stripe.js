require('dotenv').config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.error('FATAL ERROR: STRIPE_SECRET_KEY is not defined in the environment variables.');
    console.warn('Backend is booting in Development Mock Mode: Stripe APIs will fail until configured.');
}

// Initialize the Stripe instance with the secret key and the latest API version (Or Mock string to prevent boot loop)
const stripe = require('stripe')(stripeSecretKey || 'sk_test_dummy_key_to_prevent_crash_on_boot_123', {
    apiVersion: '2023-10-16', // Using a stable API version. Update as needed.
    appInfo: {
        name: 'Helpora',
        version: '1.0.0'
    }
});

module.exports = stripe;
