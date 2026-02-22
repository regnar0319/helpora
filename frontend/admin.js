// Helpora Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {

    // --- Sidebar Navigation ---
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.admin-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Logic for logout
            if (item.classList.contains('logout')) {
                window.location.href = 'index.html';
                return;
            }

            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Hide all sections
            sections.forEach(sec => sec.classList.remove('active'));

            // Show target section
            const targetId = item.getAttribute('data-section');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Update Title
            pageTitle.textContent = item.textContent.trim();

            // Mobile: Close sidebar after selection
            if (window.innerWidth < 768) {
                document.getElementById('sidebar').classList.remove('active');
            }
        });
    });

    // --- Mobile Sidebar Toggle ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // --- Mock Actions (Buttons) ---

    // Professionals: Approve/Reject
    const approveBtns = document.querySelectorAll('.btn-outline-success');
    approveBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const badge = row.querySelector('.badge');

            badge.className = 'badge badge-success';
            badge.textContent = 'Approved';

            this.style.display = 'none';
            this.nextElementSibling.style.display = 'none'; // Hide Reject btn

            // Add a "Revoke" button or just text
            const actionsCell = this.parentElement;
            actionsCell.innerHTML = '<span style="color: green; font-weight: 500;">Verified</span>';
        });
    });

    const rejectBtns = document.querySelectorAll('.btn-outline-danger');
    rejectBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            if (confirm('Are you sure you want to reject this professional?')) {
                const row = this.closest('tr');
                row.style.opacity = '0.5';
                row.style.pointerEvents = 'none';
            }
        });
    });

    // Users: Suspend/Delete
    const suspendBtns = document.querySelectorAll('.btn-warn');
    suspendBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const badge = row.querySelector('.badge');
            badge.className = 'badge badge-warning';
            badge.textContent = 'Suspended';
        });
    });

    const deleteBtns = document.querySelectorAll('.btn-danger');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            if (confirm('Permanently delete this user?')) {
                const row = this.closest('tr');
                row.remove();
            }
        });
    });
});
