// API Base URL - Dynamically set based on environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://your-backend-app-name.onrender.com'; // Replace with your Render URL

document.addEventListener('DOMContentLoaded', () => {

    // --- Helper Functions ---
    const showLoading = (btn, text = 'Processing...') => {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = text;
        btn.disabled = true;
    };

    const hideLoading = (btn) => {
        btn.textContent = btn.dataset.originalText || 'Submit';
        btn.disabled = false;
    };

    const showError = (message) => {
        alert(message); // Simple alert for now, can be improved to UI element
    };

    // --- Login Form Handling ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                showError("Please fill in all fields.");
                return;
            }

            try {
                showLoading(submitBtn, 'Logging in...');

                const response = await fetch(API_BASE_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                // Success
                console.log('Login Response Data:', data); // DEBUG LOG
                localStorage.setItem('helporaToken', data.session.access_token);
                localStorage.setItem('helporaUser', JSON.stringify(data.user)); // Store full user object
                localStorage.setItem('helporaRole', data.role); // Important for route protection evaluations

                // Redirect based on role
                if (data.role === 'provider') {
                    console.log('Redirecting to provider dashboard'); // DEBUG LOG
                    window.location.href = 'provider-dashboard.html';
                } else if (data.role === 'admin') {
                    console.log('Redirecting to admin dashboard'); // DEBUG LOG
                    window.location.href = 'admin-dashboard.html';
                } else {
                    console.log('Redirecting to customer dashboard (Default)'); // DEBUG LOG
                    window.location.href = 'dashboard.html';
                }

            } catch (error) {
                console.error(error);
                showError(error.message);
                hideLoading(submitBtn);
                // Don't modify button state on success as we redirect
            }
        });
    }

    // --- Signup Form Handling ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const role = 'customer'; // Default to customer for this form, or grab from valid input if exists

            // If there is a role selector in signup.html, use it. 
            // Looking at previous context, signup.html might just be for customers.
            // provider-register.html is for providers.

            const submitBtn = signupForm.querySelector('button[type="submit"]');

            // Basic Validation
            if (password !== confirmPassword) {
                showError("Passwords do not match!");
                return;
            }

            if (password.length < 6) {
                showError("Password must be at least 6 characters.");
                return;
            }

            try {
                showLoading(submitBtn, 'Creating Account...');

                const response = await fetch(API_BASE_URL + '/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        fullName,
                        role
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Handle express-validator errors array
                    if (data.errors) {
                        throw new Error(data.errors.map(err => err.msg).join('\n'));
                    }
                    throw new Error(data.error || 'Signup failed');
                }

                // Success
                if (data.session) {
                    localStorage.setItem('helporaToken', data.session.access_token);
                    localStorage.setItem('helporaUser', JSON.stringify(data.user));
                    localStorage.setItem('helporaRole', data.role || 'customer');
                    window.location.href = 'dashboard.html';
                } else {
                    // Email confirmation required
                    alert('Registration successful! Please check your email to confirm your account before logging in.');
                    window.location.href = 'login.html';
                }

            } catch (error) {
                console.error(error);
                showError(error.message);
                hideLoading(submitBtn);
            }
        });
    }

    // --- Provider Register Form Handling ---
    const providerForm = document.getElementById('provider-register-form');
    if (providerForm) {
        providerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const phone = document.getElementById('phone')?.value || '';
            const category = document.getElementById('category')?.value || '';
            const experience = document.getElementById('experience')?.value || '';
            const city = document.getElementById('city')?.value || '';
            const idFileField = document.getElementById('id-upload');
            const idFile = idFileField && idFileField.files.length > 0 ? idFileField.files[0] : null;
            const role = 'provider';

            const submitBtn = providerForm.querySelector('button[type="submit"]');

            if (password !== confirmPassword) {
                showError("Passwords do not match!");
                return;
            }

            try {
                showLoading(submitBtn, 'Registering...');

                const formData = new FormData();
                formData.append('fullName', fullName);
                formData.append('email', email);
                formData.append('password', password);
                formData.append('phone', phone);
                formData.append('category', category);
                formData.append('experience', experience);
                formData.append('city', city);
                formData.append('role', role);
                if (idFile) {
                    formData.append('idDocument', idFile);
                }

                // Debug: Log file info
                if (idFile) {
                    console.log('File selected:', idFile.name, idFile.size, idFile.type);
                } else {
                    console.log('No file selected');
                }

                // Important: Do NOT set Content-Type header manually for FormData
                const response = await fetch(API_BASE_URL + '/api/auth/signup', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                console.log('Signup Response:', data);

                if (!response.ok) {
                    if (data.errors) {
                        throw new Error(data.errors.map(err => err.msg).join('\n'));
                    }
                    throw new Error(data.error || 'Registration failed');
                }

                if (data.session) {
                    console.log('Session found, storing token...');
                    localStorage.setItem('helporaToken', data.session.access_token);
                    localStorage.setItem('helporaUser', JSON.stringify(data.user));
                    localStorage.setItem('helporaRole', 'provider');

                    // Explicit redirect to provider dashboard
                    console.log('Redirecting to /provider-dashboard.html...');
                    window.location.href = '/provider-dashboard.html';
                    return; // Ensure no other code runs
                } else {
                    // Email confirmation required (Should not happen for providers now)
                    console.log('No session in response. Redirecting to login...');
                    alert('Registration successful! Please check your email to confirm your account before logging in.');
                    window.location.href = '/login.html';
                }

            } catch (error) {
                console.error('Provider Registration Error:', error);
                showError(error.message);
                hideLoading(submitBtn);
            }
        });
    }
});
