const stripe = require('../config/stripe');
const { supabase } = require('../config/supabaseClient');

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
    try {
        const { booking_id } = req.body;
        const user_id = req.user.id;

        if (!booking_id) {
            return res.status(400).json({ error: 'booking_id is required' });
        }

        // 1. Fetch booking to verify existence and ownership
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking_id)
            .single();

        if (bookingError || !booking) {
            console.error('Booking fetch error:', bookingError);
            return res.status(404).json({ error: 'Booking not found' });
        }

        // 2. Verify Ownership
        if (booking.user_id !== user_id) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this booking' });
        }

        // 3. Extract Amount
        const amount = parseFloat(booking.amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid or missing amount for this booking' });
        }

        // 4. Calculate Amount in Cents (Stripe constraint)
        const amountInCents = Math.round(amount * 100);

        // 5. Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                booking_id: booking_id,
                user_id: user_id
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // 6. Return client_secret to frontend
        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Stripe Payment Intent Error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};

// @desc    Confirm Booking
// @route   POST /api/payments/confirm-booking
// @access  Private
exports.confirmBooking = async (req, res) => {
    try {
        const { payment_intent_id, booking_id } = req.body;
        const user_id = req.user.id;

        if (!payment_intent_id || !booking_id) {
            return res.status(400).json({ error: 'payment_intent_id and booking_id are required' });
        }

        // 1. Retrieve the Payment Intent from Stripe to verify it succeeded
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not successful yet' });
        }

        // 2. Validate metadata matches
        if (paymentIntent.metadata.booking_id !== booking_id || paymentIntent.metadata.user_id !== user_id) {
            return res.status(400).json({ error: 'Payment intent does not match booking/user' });
        }

        // 3. Update the booking status in Supabase
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'confirmed',
                payment_intent_id: payment_intent_id
            })
            .eq('id', booking_id)
            .eq('user_id', user_id);

        if (updateError) {
            console.error('Supabase Update Error:', updateError);
            return res.status(500).json({ error: 'Failed to update booking status' });
        }

        res.status(200).json({ message: 'Booking confirmed successfully' });

    } catch (error) {
        console.error('Confirm Booking Error:', error);
        res.status(500).json({ error: 'Failed to confirm booking' });
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
        // Construct the event using the raw body buffer
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
        console.error(`⚠️  Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const booking_id = paymentIntent.metadata.booking_id;

        console.log(`💰 PaymentIntent status: ${paymentIntent.status} for Booking ID: ${booking_id}`);

        if (booking_id) {
            // Update the booking status to confirmed
            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    status: 'confirmed',
                    payment_intent_id: paymentIntent.id
                })
                .eq('id', booking_id);

            if (updateError) {
                console.error(`Error updating booking status for ${booking_id}:`, updateError);
                return res.status(500).json({ error: 'Database update failed processing payment' });
            }

            console.log(`✅ Booking ${booking_id} accurately marked as confirmed.`);
        }
    } else {
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
};
