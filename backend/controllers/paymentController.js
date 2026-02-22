const stripe = require('../config/stripe');
const { supabase } = require('../config/supabaseClient');

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/create-intent
// @access  Private (Customer only)
exports.createPaymentIntent = async (req, res) => {
    try {
        const { booking_id } = req.body;
        const customer_id = req.user.id;

        if (!booking_id) {
            return res.status(400).json({ error: 'booking_id is required' });
        }

        // 1. Fetch booking to verify existence and ownership
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*, services:service_id(price)')
            .eq('id', booking_id)
            .single();

        if (bookingError || !booking) {
            // Note: If no service_id was ever saved to the booking table in previous iterations,
            // we will need to adjust this. Assuming the schema links booking -> service -> price
            console.error('Booking fetch error:', bookingError);
            return res.status(404).json({ error: 'Booking not found or missing relations' });
        }

        // 2. Verify Ownership
        if (booking.customer_id !== customer_id) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this booking' });
        }

        // 3. Extract Price
        // Assuming `bookings` table has a `service_id` foreign key linking to `services` table natively.
        // If not, we will need to look up price differently.
        let price = 0;

        if (booking.services && booking.services.price) {
            price = parseFloat(booking.services.price);
        } else {
            // Fallback: If `bookings` table doesn't have `service_id` explicitly linked but stores `service_type` 
            // string, we must query `services` by `title` == `service_type` just to get a price.
            // Let's attempt the fallback query to guarantee resilience against schema mutations:

            const { data: serviceLink, error: fallbackError } = await supabase
                .from('services')
                .select('price')
                .ilike('title', booking.service_type) // Matches "Plumbing" etc.
                .limit(1)
                .single();

            if (!fallbackError && serviceLink) {
                price = parseFloat(serviceLink.price);
            }
        }

        if (isNaN(price) || price <= 0) {
            return res.status(400).json({ error: 'Invalid or missing price for this service' });
        }

        // 4. Calculate Amount in Cents (Stripe constraint)
        const amountInCents = Math.round(price * 100);

        // 5. Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                booking_id: booking_id,
                customer_id: customer_id
            },
            // Note: In modern Stripe, automatic_payment_methods is ideal
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // 6. Return client_secret to frontend natively
        res.status(200).json({
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('Stripe Payment Intent Error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};

// @desc    Handle Stripe Webhook Events
// @route   POST /api/payments/webhook
// @access  Public (Called by Stripe)
exports.stripeWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Construct the event using the raw body buffer provided by `express.raw()` in server.js
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
        console.error(`⚠️  Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle exactly the target event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const booking_id = paymentIntent.metadata.booking_id;

        console.log(`💰 PaymentIntent status: ${paymentIntent.status} for Booking ID: ${booking_id}`);

        if (booking_id) {
            // Update the booking explicitly tracking financial commitments
            // Assumes a column `payment_status` exists on `bookings` (defaults to pending/null normally)
            const { error: updateError } = await supabase
                .from('bookings')
                .update({ payment_status: 'paid' })
                .eq('id', booking_id);

            if (updateError) {
                console.error(`Error updating booking payment status for ${booking_id}:`, updateError);
                // Important: returning 500 tells Stripe to strictly retry delivery
                return res.status(500).json({ error: 'Database update failed processing payment' });
            }

            console.log(`✅ Booking ${booking_id} accurately marked as definitively paid.`);
        }
    } else {
        // Log unhandled events gracefully
        console.log(`Unhandled event type ${event.type}`);
    }

    // Acknowledge receipt natively giving Stripe a fast 200 OK Response
    res.status(200).json({ received: true });
};
