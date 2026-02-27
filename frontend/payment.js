// Please replace with your actual test Publishable Key from Stripe Dashboard
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T3ast8EQVilhVEQZp94LdxSOcNGp6qpqoGcgZynW19VrhBsi8ARzhIf3FTMUJM6n7FhrvY9sB9wwrcTyj1Pg9m400I7yHpKX0D';
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

// DOM Elements
const paymentForm = document.getElementById('payment-form');
const submitButton = document.getElementById('submit');
const spinner = document.getElementById('spinner');
const buttonText = document.getElementById('button-text');
const messageContainer = document.getElementById('payment-message');
const bookingDetailsEl = document.getElementById('booking-details');
const skeletonEl = document.getElementById('payment-element-skeleton');
const paymentElementContainer = document.getElementById('payment-element');

// State
let elements;
let bookingId;
let paymentIntentIdFromApi;

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Get booking ID from query params (e.g., booking-payment.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    bookingId = urlParams.get('id');

    if (!bookingId) {
        showMessage('Error: No booking ID provided.', 'error');
        bookingDetailsEl.innerText = "Invalid Booking request.";
        return;
    }

    try {
        bookingDetailsEl.innerText = `Preparing payment for Booking #${bookingId.substring(0, 8)}...`;

        // 1. Create Payment Intent on the backend
        const response = await fetch('/api/payments/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ booking_id: bookingId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to initialize payment');
        }

        const { clientSecret, paymentIntentId } = data;
        paymentIntentIdFromApi = paymentIntentId;

        // 2. Initialize Stripe Elements with the clientSecret
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#6c5ce7',
                colorBackground: '#ffffff',
                colorText: '#333333',
                colorDanger: '#df1b41',
                fontFamily: 'system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
            }
        };

        elements = stripe.elements({ clientSecret, appearance });

        // 3. Create and mount the Payment Element
        const paymentElement = elements.create('payment');

        paymentElement.on('ready', () => {
            skeletonEl.style.display = 'none';
            paymentElementContainer.style.display = 'block';
            submitButton.disabled = false;
            bookingDetailsEl.innerText = `Booking #${bookingId.substring(0, 8)} - Secure Checkout`;
        });

        paymentElement.mount('#payment-element');

    } catch (error) {
        console.error('Initialization error:', error);
        skeletonEl.style.display = 'none';
        bookingDetailsEl.innerText = "";
        showMessage(error.message, 'error');
    }
});

// Handle Form Submission
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!elements || !stripe) {
        return;
    }

    setLoading(true);
    messageContainer.style.display = 'none';

    try {
        // 4. Confirm the payment with Stripe
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL isn't used because we use redirect: "if_required"
                return_url: window.location.origin + '/dashboard.html',
            },
            redirect: 'if_required',
        });

        if (error) {
            // Show error to your customer (e.g., insufficient funds, card declined)
            if (error.type === "card_error" || error.type === "validation_error") {
                showMessage(error.message, 'error');
            } else {
                showMessage("An unexpected error occurred.", 'error');
            }
            setLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // 5. Payment successful! Call backend to update booking status
            await confirmBookingWithBackend(paymentIntent.id, bookingId);
        } else {
            // Handle other statuses if necessary
            showMessage(`Payment status: ${paymentIntent.status}`, 'error');
            setLoading(false);
        }
    } catch (err) {
        console.error('Payment confirmation error:', err);
        showMessage('A critical error occurred processing the payment.', 'error');
        setLoading(false);
    }
});

async function confirmBookingWithBackend(paymentIntentId, bookingId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/payments/confirm-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                payment_intent_id: paymentIntentId,
                booking_id: bookingId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update booking status on server');
        }

        // Show success UI
        showMessage('Payment successful! Your booking is confirmed.', 'success');

        // Optional: Redirect user to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('Confirm booking error:', error);
        showMessage('Payment succeeded, but we failed to confirm the booking locally. Please contact support.', 'error');
        setLoading(false);
    }
}

// UI Helpers
function showMessage(messageText, type) {
    messageContainer.className = ''; // reset classes
    messageContainer.classList.add(type);
    messageContainer.textContent = messageText;
    messageContainer.style.display = 'block';
}

function setLoading(isLoading) {
    if (isLoading) {
        submitButton.disabled = true;
        spinner.style.display = 'block';
        buttonText.style.display = 'none';
    } else {
        submitButton.disabled = false;
        spinner.style.display = 'none';
        buttonText.style.display = 'block';
    }
}
