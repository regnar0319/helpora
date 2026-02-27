// dashboard.js - Logic for the Customer Dashboard

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === ''
    ? 'http://localhost:5000'
    : 'https://helpora-cqnm.onrender.com';
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('helporaUser');
    const token = localStorage.getItem('helporaToken');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    // Set Welcome Display
    const displayNameEl = document.getElementById('user-display-name');
    if (displayNameEl) {
        try {
            const userObj = JSON.parse(user);
            // Supabase puts custom fields in user_metadata
            const name = userObj.user_metadata?.full_name || userObj.email || 'User';
            displayNameEl.textContent = `Welcome, ${name}`;
        } catch (e) {
            displayNameEl.textContent = 'Welcome, User';
        }
    }

    // Logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('helporaUser');
            localStorage.removeItem('helporaToken');
            localStorage.removeItem('helporaRole');
            window.location.href = 'login.html';
        });
    }

    // Load Bookings
    const bookingsListEl = document.getElementById('customer-bookings-list');

    const loadBookings = async () => {
        if (!bookingsListEl) return;

        try {
            const response = await fetch(API_BASE_URL + '/api/bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 404) {
                // Handled by our backend conventionally when arrays are empty
                renderBookings([]);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const bookings = await response.json();
            renderBookings(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            bookingsListEl.innerHTML = `<p style="color: red;">Error loading bookings. Please try again later.</p>`;
        }
    };

    const renderBookings = (bookings) => {
        bookingsListEl.innerHTML = '';

        if (!bookings || bookings.length === 0) {
            bookingsListEl.innerHTML = '<div style="text-align: center; padding: 2rem; background: #f9fafb; border-radius: 8px;"><i class="fas fa-calendar-times" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i><p style="color: #4b5563; font-weight: 500;">You have no bookings yet.</p><p style="color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem;">Head over to our services below to get started!</p><a href="#services" class="btn btn-primary btn-sm" style="margin-top: 1rem; display: inline-block;">Browse Services</a></div>';
            return;
        }

        bookings.forEach(booking => {
            const date = new Date(booking.scheduled_date).toLocaleString();
            let statusClass = 'status-upcoming'; // default

            if (booking.status === 'completed') statusClass = 'status-completed';
            if (booking.status === 'cancelled') statusClass = 'status-cancelled'; // Assume CSS exists or we fall back

            const card = document.createElement('div');
            card.className = 'booking-card';

            let paymentBadge = booking.payment_status === 'paid'
                ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; vertical-align: middle; margin-left: 8px;">PAID</span>'
                : '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; vertical-align: middle; margin-left: 8px;">UNPAID</span>';

            let actionHtml = '';
            if (booking.status === 'pending' || booking.status === 'accepted') {
                actionHtml += `<button class="btn btn-secondary btn-sm cancel-booking-btn" data-id="${booking.id}">Cancel Booking</button>`;
            }
            if (booking.status !== 'cancelled' && booking.payment_status !== 'paid') {
                actionHtml += `<button class="btn btn-primary btn-sm pay-now-btn" style="background: #10b981; border: none; margin-left: 8px;" data-id="${booking.id}">Pay Now</button>`;
            }

            card.innerHTML = `
                <div class="booking-status ${statusClass}">${booking.status.toUpperCase()}</div>
                <div class="booking-details">
                    <h3 style="display: flex; align-items: center;">${booking.service_type} ${paymentBadge}</h3>
                    <p class="booking-meta"><i class="fas fa-calendar"></i> ${date}</p>
                    <p class="booking-meta"><i class="fas fa-info-circle"></i> Professional: ${booking.professional_id ? 'Assigned' : 'Awaiting Assignment'}</p>
                </div>
                <div class="booking-actions" style="margin-top: 10px;">
                    ${actionHtml}
                </div>
            `;

            bookingsListEl.appendChild(card);
        });

        // Add event listeners for Cancel buttons
        document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to cancel this booking?')) return;

                const bookingId = e.target.getAttribute('data-id');
                try {
                    const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ status: 'cancelled' })
                    });

                    if (!response.ok) throw new Error('Failed to cancel booking');
                    alert('Booking cancelled successfully.');
                    loadBookings(); // reload list
                } catch (error) {
                    console.error('Cancel error:', error);
                    alert('Could not cancel booking.');
                }
            });
        });

        // Add event listeners for Pay Now buttons
        document.querySelectorAll('.pay-now-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.getAttribute('data-id');
                openPaymentModal(bookingId);
            });
        });
    };

    loadBookings();

    // --- Stripe Payment Implementation ---
    // Safely instantiated with Stripe's test Publishable Key (Does NOT compromise secret key)
    const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx');
    let elements;

    const paymentModal = document.getElementById('payment-modal');
    const closePaymentModalBtn = document.getElementById('close-payment-modal');
    const paymentForm = document.getElementById('payment-form');
    const paymentMessage = document.getElementById('payment-message');
    const submitPaymentBtn = document.getElementById('submit-payment');

    if (closePaymentModalBtn) {
        closePaymentModalBtn.addEventListener('click', () => {
            paymentModal.style.display = 'none';
        });
    }

    const openPaymentModal = async (bookingId) => {
        try {
            // Disable Pay Now button briefly to prevent double clicks
            const payBtn = document.querySelector(`.pay-now-btn[data-id="${bookingId}"]`);
            if (payBtn) payBtn.disabled = true;

            // 1. Create Payment Intent dynamically securing client_secret natively
            const response = await fetch(API_BASE_URL + '/api/payments/create-intent', {
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

            // 2. Initialize localized Stripe Elements avoiding exposing API secrets
            const clientSecret = data.clientSecret;
            elements = stripe.elements({ clientSecret });

            const paymentElement = elements.create('payment');
            document.getElementById('payment-element').innerHTML = ''; // Clear previous elements if re-opening
            paymentElement.mount('#payment-element');

            // 3. Show Modal securely
            paymentModal.style.display = 'flex';
            if (payBtn) payBtn.disabled = false;

        } catch (error) {
            console.error('Payment Modal Error:', error);
            alert(`Error initializing secure payment: ${error.message}`);
        }
    };

    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            submitPaymentBtn.disabled = true;
            submitPaymentBtn.textContent = 'Processing...';
            paymentMessage.style.display = 'none';

            try {
                // 4. Securely confirm payment directly against Stripe Servers
                const { error, paymentIntent } = await stripe.confirmPayment({
                    elements,
                    confirmParams: {},
                    redirect: 'if_required' // Guarantees page stays active enabling synchronous refresh maps natively
                });

                if (error) {
                    paymentMessage.textContent = error.message;
                    paymentMessage.style.display = 'block';
                } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                    alert('Payment successful! Your booking is securely finalized.');
                    paymentModal.style.display = 'none';
                    loadBookings(); // Trigger dynamic reload rendering "PAID" markers strictly
                } else {
                    paymentMessage.textContent = 'Unexpected payment status.';
                    paymentMessage.style.display = 'block';
                }
            } catch (err) {
                paymentMessage.textContent = 'An unexpected error occurred finalizing payment.';
                paymentMessage.style.display = 'block';
            } finally {
                submitPaymentBtn.disabled = false;
                submitPaymentBtn.textContent = 'Pay Now';
            }
        });
    }

    // --- Embedded Booking Modal Logic ---
    const bookingModal = document.getElementById('booking-modal');
    const closeBookingModal = document.querySelector('#booking-modal .close-modal');
    const bookButtons = document.querySelectorAll('.book-now-trigger');
    const formSteps = document.querySelectorAll('.form-step');
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const progressBar = document.querySelector('.progress-fill');
    const stepTexts = document.querySelectorAll('.step-text');
    const serviceSelect = document.getElementById('service-select');
    const timeButtons = document.querySelectorAll('.time-slot');
    const selectedTimeInput = document.getElementById('selected-time');

    let currentStep = 1;
    let bookingData = {};

    if (bookingModal) {
        bookButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const card = btn.closest('.service-card');
                let preSelectedService = card ? card.dataset.service : "";

                if (preSelectedService) serviceSelect.value = preSelectedService;
                else serviceSelect.value = "";

                resetBookingForm();
                bookingModal.style.display = 'flex';
            });
        });

        closeBookingModal.addEventListener('click', () => {
            bookingModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === bookingModal) {
                bookingModal.style.display = 'none';
            }
        });

        timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                timeButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedTimeInput.value = btn.dataset.time;
            });
        });

        function showStep(step) {
            formSteps.forEach(s => s.classList.remove('active'));
            document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

            const percent = (step / 4) * 100;
            progressBar.style.width = `${percent}%`;

            stepTexts.forEach((text, index) => {
                if (index + 1 <= step) text.classList.add('active');
                else text.classList.remove('active');
            });

            if (step === 4) populateSummary();
        }

        nextButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    saveStepData(currentStep);
                    currentStep++;
                    showStep(currentStep);
                }
            });
        });

        prevButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                currentStep--;
                showStep(currentStep);
            });
        });

        function validateStep(step) {
            const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
            const inputs = currentStepEl.querySelectorAll('input, select');
            let valid = true;

            inputs.forEach(input => {
                if (input.required && !input.value) {
                    valid = false;
                    input.style.borderColor = "#ff3b30";
                } else {
                    input.style.borderColor = "#e0e0e0";
                }
            });

            if (step === 3) {
                if (selectedTimeInput.value === "") {
                    valid = false;
                    document.getElementById('time-slots').style.border = "1px solid red";
                } else {
                    document.getElementById('time-slots').style.border = "none";
                }
            }
            return valid;
        }

        function saveStepData(step) {
            if (step === 1) {
                bookingData.service = serviceSelect.value;
                const optionText = serviceSelect.options[serviceSelect.selectedIndex].text;
                bookingData.price = optionText.match(/\(Starts at (\$\d+)\)/)?.[1] || "$TBD";
            }
            if (step === 2) {
                bookingData.address = document.getElementById('address').value;
                bookingData.city = document.getElementById('city').value;
            }
            if (step === 3) {
                bookingData.date = document.getElementById('date').value;
                bookingData.time = selectedTimeInput.value;
            }
        }

        function populateSummary() {
            document.getElementById('summary-service').textContent = bookingData.service;
            document.getElementById('summary-location').textContent = `${bookingData.address}, ${bookingData.city}`;
            document.getElementById('summary-datetime').textContent = `${bookingData.date} @ ${bookingData.time}`;
            document.getElementById('summary-price').textContent = bookingData.price;
        }

        function resetBookingForm() {
            currentStep = 1;
            showStep(1);
            bookingData = {};
            document.getElementById('booking-form').reset();
            timeButtons.forEach(b => b.classList.remove('selected'));
            selectedTimeInput.value = "";
        }

        document.getElementById('booking-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
                const scheduledDate = new Date(`${bookingData.date} ${bookingData.time}`).toISOString();

                const response = await fetch(API_BASE_URL + '/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        serviceType: bookingData.service,
                        scheduledDate: scheduledDate
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to book service');
                }

                alert(`Booking Confirmed!\n\nService: ${data.booking.service_type}\nYour booking will appear in your dashboard shortly.`);
                bookingModal.style.display = 'none';
                loadBookings(); // Automatically refresh the customer's dashboard!
            } catch (error) {
                console.error('Booking Error:', error);
                alert(`Error confirming booking: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Booking';
            }
        });
    }

    // Smooth Scroll specifically for dashboard anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId) return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

});
