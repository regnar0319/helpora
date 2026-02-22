// Helpora Provider Dashboard Logic
// API Base URL - Dynamically set based on environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === ''
    ? 'http://localhost:5000'
    : 'https://your-backend-app-name.onrender.com'; // Replace with your Render URL

document.addEventListener('DOMContentLoaded', () => {

    // --- Registration Logic ---
    // Handled by auth.js now.

    // --- Dashboard Logic ---

    // Availability Toggle
    const availabilityToggle = document.getElementById('availability-toggle');
    const statusText = document.getElementById('status-text');

    if (availabilityToggle && statusText) {
        availabilityToggle.addEventListener('change', () => {
            if (availabilityToggle.checked) {
                statusText.textContent = "Online";
                statusText.style.color = "#00c853"; // Green
            } else {
                statusText.textContent = "Offline";
                statusText.style.color = "#b0bec5"; // Grey
            }
        });

        // Init check
        if (availabilityToggle.checked) {
            statusText.style.color = "#00c853";
        }
    }

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop'); // New backdrop

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (backdrop) backdrop.classList.toggle('active');
        });
    }

    // Close sidebar when clicking backdrop
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('active');
            backdrop.classList.remove('active');
        });
    }

    // Auth & Role Check
    const isDashboard = document.querySelector('.dashboard-body');
    if (isDashboard) {
        const token = localStorage.getItem('helporaToken');
        const userStr = localStorage.getItem('helporaUser');

        if (!token || !userStr) {
            alert('You must be logged in to view the dashboard. Redirecting to login.');
            window.location.href = 'login.html'; // Redirect to login
        } else {
            try {
                const user = JSON.parse(userStr);
                // Simple role check based on local storage (Note: server verifies token anyway)
                // If user doesn't have role property for some reason, we might want to fetch profile. 
                // But authController sends user object which has role if we modified it? 
                // Wait, authController sends { user, session, role }. 
                // auth.js stores `data.user` in `helporaUser`. `data.user` from Supabase might NOT have `role`.
                // `data.role` was sent separately.
                // We typically store the role separately or merge it.
                // Let's assume auth.js didn't merge it.
                // But for now, just checking token existence is better than nothing.
                // Ideally we should check role from a dedicated storage item or profile fetch.
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }

    // Job Actions (Accept/Reject)
    const acceptButtons = document.querySelectorAll('.accept-btn');
    const rejectButtons = document.querySelectorAll('.reject-btn');

    acceptButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const card = this.closest('.job-card');
            this.textContent = 'Accepted';
            this.disabled = true;
            this.classList.add('btn-success');

            // Remove the Reject button
            const rejectBtn = card.querySelector('.reject-btn');
            if (rejectBtn) rejectBtn.style.display = 'none';

            // Optional: Move to "Active" list visually or show notification
            card.style.borderColor = '#00c853';
        });
    });

    rejectButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const card = this.closest('.job-card');
            if (confirm('Are you sure you want to reject this job?')) {
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('helporaToken');
            localStorage.removeItem('helporaUser');
            window.location.href = 'index.html';
        });
    }


    // --- Create and Manage Service Logic ---
    const createServiceForm = document.getElementById('create-service-form');
    const myServicesList = document.getElementById('my-services-list');
    const submitBtn = document.getElementById('submit-service-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    let editingServiceId = null;

    // Fetch and display services
    const fetchMyServices = async () => {
        if (!myServicesList) return;

        try {
            const token = localStorage.getItem('helporaToken');
            if (!token) return;

            myServicesList.innerHTML = '<p>Loading services...</p>';

            const response = await fetch(API_BASE_URL + '/api/services/my-services', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch services');

            myServicesList.innerHTML = '';
            if (data.length === 0) {
                myServicesList.innerHTML = '<p style="color: #666;">You have not published any services yet.</p>';
                return;
            }

            // Render services
            data.forEach(service => {
                const card = document.createElement('div');
                card.style.cssText = "padding: 1.5rem; border: 1px solid #eee; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: white; margin-bottom: 10px;";
                card.innerHTML = `
                    <div style="flex-grow: 1;">
                        <h5 style="margin: 0; font-size: 1.1rem; color: #333;">${service.title}</h5>
                        <p style="margin: 4px 0; color: #666; font-size: 0.9rem; font-weight: 500;">
                            <span style="color: #6200ea;">${service.category}</span> - $${service.price}
                        </p>
                        <p style="margin: 0; color: #888; font-size: 0.85rem; max-width: 80%;">${service.description || 'No description provided.'}</p>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="btn btn-outline btn-sm edit-service-btn" style="border-color: #6200ea; color: #6200ea;" data-id="${service.id}" data-service='${JSON.stringify(service).replace(/'/g, "&#39;")}'>Edit</button>
                        <button class="btn btn-outline btn-sm delete-service-btn" style="border-color: #e53935; color: #e53935;" data-id="${service.id}">Delete</button>
                    </div>
                `;
                myServicesList.appendChild(card);
            });

            // Action Listeners
            document.querySelectorAll('.edit-service-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const serviceStr = e.target.getAttribute('data-service');
                    const service = JSON.parse(serviceStr);
                    enterEditMode(service);
                });
            });

            document.querySelectorAll('.delete-service-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!confirm('Are you sure you want to delete this service?')) return;
                    const id = e.target.getAttribute('data-id');
                    await deleteService(id);
                });
            });

        } catch (error) {
            console.error('Error:', error);
            myServicesList.innerHTML = '<p style="color: red;">Failed to load services.</p>';
        }
    };

    // Delete Service Helper
    const deleteService = async (id) => {
        try {
            const token = localStorage.getItem('helporaToken');
            const res = await fetch(`${API_BASE_URL}/api/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete service');
            }

            fetchMyServices(); // Refresh list safely
            if (editingServiceId === id) resetForm();

        } catch (error) {
            alert('Error deleting service: ' + error.message);
        }
    };

    // Edit Mode Setup
    const enterEditMode = (service) => {
        editingServiceId = service.id;
        document.getElementById('service-name').value = service.title;
        document.getElementById('service-desc').value = service.description;
        document.getElementById('service-price').value = service.price;
        document.getElementById('service-category').value = service.category;

        submitBtn.textContent = 'Update Service';
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
        createServiceForm.scrollIntoView({ behavior: 'smooth' });
    };

    // Reset Form Helper
    const resetForm = () => {
        editingServiceId = null;
        createServiceForm.reset();
        submitBtn.textContent = 'Publish Service';
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
        document.getElementById('service-msg').textContent = '';
    };

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }

    // Handle Form Submit (Create & Update)
    if (createServiceForm) {
        createServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('service-msg');

            const title = document.getElementById('service-name').value;
            const description = document.getElementById('service-desc').value;
            const price = document.getElementById('service-price').value;
            const category = document.getElementById('service-category').value;

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = editingServiceId ? 'Updating...' : 'Publishing...';
                msgDiv.textContent = '';
                msgDiv.className = 'message';

                const token = localStorage.getItem('helporaToken');
                if (!token) throw new Error('You must be logged in.');

                const endpoint = editingServiceId ? `${API_BASE_URL}/api/services/${editingServiceId}` : API_BASE_URL + '/api/services';
                const method = editingServiceId ? 'PUT' : 'POST';

                const response = await fetch(endpoint, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description, price, category })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save service');
                }

                // Success
                msgDiv.textContent = editingServiceId ? 'Service updated successfully!' : 'Service published successfully!';
                msgDiv.classList.add('success');
                resetForm();
                fetchMyServices();

            } catch (error) {
                console.error(error);
                msgDiv.textContent = error.message;
                msgDiv.classList.add('error');
            } finally {
                submitBtn.disabled = false;
                if (!editingServiceId) submitBtn.textContent = 'Publish Service';
            }
        });

        // Initialize display on component mount
        fetchMyServices();
        fetchIncomingBookings();
    }

    // --- Incoming Bookings Logic ---
    const incomingBookingsList = document.getElementById('incoming-bookings-list');

    const fetchIncomingBookings = async () => {
        if (!incomingBookingsList) return;

        try {
            const token = localStorage.getItem('helporaToken');
            if (!token) return;

            const response = await fetch(API_BASE_URL + '/api/bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const bookings = await response.json();

            if (!response.ok) throw new Error(bookings.error || 'Failed to fetch bookings');

            incomingBookingsList.innerHTML = '';

            if (bookings.length === 0) {
                incomingBookingsList.innerHTML = '<p style="color: #666;">No incoming bookings at this time.</p>';
                return;
            }

            bookings.forEach(booking => {
                const date = new Date(booking.scheduled_date).toLocaleString();
                let statusColor = '#f59e0b'; // pending yellow
                if (booking.status === 'accepted') statusColor = '#3b82f6'; // accepted blue
                if (booking.status === 'completed') statusColor = '#10b981'; // completed green
                if (booking.status === 'cancelled') statusColor = '#ef4444'; // cancelled red

                const card = document.createElement('div');
                card.style.cssText = `padding: 1.5rem; border: 1px solid #eee; border-left: 4px solid ${statusColor}; border-radius: 8px; background: white; margin-bottom: 10px; display: flex; flex-direction: column; gap: 10px;`;

                let actionsHtml = '';

                // Allow professionals to accept jobs that are pending (assuming marketplace assignment style)
                // Or if they are assigned, let them update the status to completed
                if (booking.status === 'pending') {
                    // This assumes the professional clicks 'Accept' to assign themselves.
                    actionsHtml = `
                        <button class="btn btn-primary btn-sm accept-btn" data-id="${booking.id}">Accept Job</button>
                    `;
                } else if (booking.status === 'accepted') {
                    actionsHtml = `
                        <button class="btn btn-primary btn-sm complete-btn" style="background: #10b981; border: none;" data-id="${booking.id}">Mark Completed</button>
                        <button class="btn btn-outline btn-sm cancel-btn" style="border-color: #ef4444; color: #ef4444;" data-id="${booking.id}">Cancel</button>
                    `;
                }

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h5 style="margin: 0; font-size: 1.1rem; color: #333;">${booking.service_type}</h5>
                            <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">
                                <i class="fas fa-calendar" style="width: 16px;"></i> ${date}
                            </p>
                            <p style="margin: 0; color: #666; font-size: 0.9rem;">
                                <i class="fas fa-user" style="width: 16px;"></i> Customer: ${booking.profiles ? booking.profiles.full_name : 'Unknown'}
                            </p>
                        </div>
                        <div style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; border-radius: 12px; text-transform: uppercase;">
                            ${booking.status}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
                        ${actionsHtml}
                    </div>
                `;
                incomingBookingsList.appendChild(card);
            });

            // Action Listeners
            document.querySelectorAll('.accept-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const me = parseJwt(token); // Hack to get my ID to self-assign
                    await assignAndAcceptJob(id, me.sub); // Supabase JWT payload uses `sub` for user ID
                });
            });

            document.querySelectorAll('.complete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!confirm('Mark this job as successfully completed?')) return;
                    await updateBookingStatus(e.target.getAttribute('data-id'), 'completed');
                });
            });

            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!confirm('Are you sure you want to cancel this assigned job?')) return;
                    await updateBookingStatus(e.target.getAttribute('data-id'), 'cancelled');
                });
            });

        } catch (error) {
            console.error('Error fetching bookings:', error);
            incomingBookingsList.innerHTML = '<p style="color: red;">Failed to load bookings.</p>';
        }
    };

    // Helper to decode JWT to get professional ID
    function parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    const assignAndAcceptJob = async (bookingId, professionalId) => {
        try {
            const token = localStorage.getItem('helporaToken');
            const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ professionalId })
            });

            if (!res.ok) throw new Error('Failed to accept job');
            fetchIncomingBookings();
        } catch (error) {
            alert(error.message);
        }
    };

    const updateBookingStatus = async (bookingId, status) => {
        try {
            const token = localStorage.getItem('helporaToken');
            const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error('Failed to update status');
            fetchIncomingBookings();
        } catch (error) {
            alert(error.message);
        }
    };

});
