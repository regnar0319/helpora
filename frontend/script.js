// Helpora Homepage & Upgrade Booking// API Base URL - Dynamically set based on environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === ''
    ? 'http://localhost:5000'
    : 'https://helpora-cqnm.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check for Dashboard
    // Dashboard checks its own auth organically now relying on dashboard.js
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            const isVisible = navLinks.style.display === 'flex';
            navLinks.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '70px';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = 'white';
                navLinks.style.padding = '1rem';
                navLinks.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                navLinks.style.zIndex = '999';
            }
        });
    }

    // --- Booking Modal Logic ---
    const modal = document.getElementById('booking-modal');
    const closeModal = document.querySelector('.close-modal');
    const bookButtons = document.querySelectorAll('.book-now-trigger, .book-btn');
    const formSteps = document.querySelectorAll('.form-step');
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const progressBar = document.querySelector('.progress-fill');
    const stepTexts = document.querySelectorAll('.step-text');

    // Form Inputs
    const serviceSelect = document.getElementById('service-select');
    const timeButtons = document.querySelectorAll('.time-slot');
    const selectedTimeInput = document.getElementById('selected-time');

    let currentStep = 1;
    let bookingData = {};

    // Open Modal
    bookButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Auth Check: Require login to book
            const token = localStorage.getItem('helporaToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // Get service data from the card if available
            const card = btn.closest('.service-card');
            let preSelectedService = "";

            if (card) {
                preSelectedService = card.dataset.service;
            }

            // Set Dropdown Value
            if (preSelectedService) {
                serviceSelect.value = preSelectedService;
            } else {
                serviceSelect.value = ""; // Reset if generic "Book Now"
            }

            // Reset Booking Flow
            resetBookingForm();
            modal.style.display = 'flex';
        });
    });

    // Close Modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Time Slot Selection logic
    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove selected class from others
            timeButtons.forEach(b => b.classList.remove('selected'));
            // Add to clicked
            btn.classList.add('selected');
            // Set input value
            selectedTimeInput.value = btn.dataset.time;
        });
    });

    // Navigation logic
    function showStep(step) {
        formSteps.forEach(s => s.classList.remove('active'));
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

        // Update Progress Bar
        const percent = (step / 4) * 100;
        progressBar.style.width = `${percent}%`;

        // Update Step Text highlight
        stepTexts.forEach((text, index) => {
            if (index + 1 <= step) {
                text.classList.add('active');
            } else {
                text.classList.remove('active');
            }
        });

        // If Step 4, populate summary
        if (step === 4) {
            populateSummary();
        }
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
            // Check HTML5 validation first
            if (input.required && !input.value) {
                valid = false;
                highlightError(input);
            } else {
                removeError(input);
            }
        });

        // Specific Validation for Time Slot (since it uses buttons and a hidden input)
        if (step === 3) {
            if (selectedTimeInput.value === "") {
                valid = false;
                // Optional: highlight time slots grid
                document.getElementById('time-slots').style.border = "1px solid red";
            } else {
                document.getElementById('time-slots').style.border = "none";
            }
        }

        return valid;
    }

    function highlightError(element) {
        element.style.borderColor = "#ff3b30";
        // Optionally add shake animation
    }

    function removeError(element) {
        element.style.borderColor = "#e0e0e0";
    }

    function saveStepData(step) {
        if (step === 1) {
            bookingData.service = serviceSelect.value;
            // Extract price from option text (Quick hack for demo)
            const optionText = serviceSelect.options[serviceSelect.selectedIndex].text;
            bookingData.price = optionText.match(/\(Starts at (\$\d+)\)/)?.[1] || "$TBD";
        }
        if (step === 2) {
            bookingData.address = document.getElementById('address').value;
            bookingData.city = document.getElementById('city').value;
            bookingData.landmark = document.getElementById('landmark').value;
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

    // Form Submission
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('helporaToken');
        if (!token) {
            alert('Please login to book a service.');
            window.location.href = 'login.html';
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // Combine Date & Time into a roughly acceptable format for the backend
            // In a strict prod app, we'd format to strict ISO8601, but the backend accepts loose formats usually if JS gives "YYYY-MM-DD HH:MM AM"
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
                // Formatting express-validator errors
                if (data.errors && Array.isArray(data.errors)) {
                    throw new Error(data.errors.map(err => err.msg).join(', '));
                }
                throw new Error(data.error || 'Failed to book service');
            }

            alert(`Booking Confirmed!\n\nService: ${data.booking.service_type}\nWe will notify you when a professional accepts the job.`);
            modal.style.display = 'none';
        } catch (error) {
            console.error('Booking Error:', error);
            alert(`Error confirming booking: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Booking';
        }
    });

    // Smooth Scroll for setup links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId) return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        });
    });
});
