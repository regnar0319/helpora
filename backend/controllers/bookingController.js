const { supabase } = require('../config/supabaseClient');

// Create Booking
exports.createBooking = async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Only customers can create bookings' });
    }

    const { serviceType, scheduledDate, professionalId } = req.body;

    try {
        console.log('--- Debug: Insert Booking ---');
        console.log('req.user.id:', req.user.id);
        console.log('Payload:', {
            customer_id: req.user.id,
            user_id: req.user.id,
            service_type: serviceType,
            scheduled_date: scheduledDate,
            professional_id: professionalId || null
        });

        // Use supabaseAdmin (Service Role Key) to bypass RLS on the backend, 
        // or ensure it properly inserts if RLS is enabled and requires service_role
        const { supabaseAdmin } = require('../config/supabaseClient');

        const clientToUse = supabaseAdmin || supabase;

        const { data, error } = await clientToUse
            .from('bookings')
            .insert([
                {
                    customer_id: req.user.id,
                    user_id: req.user.id,
                    service_type: serviceType,
                    scheduled_date: scheduledDate,
                    professional_id: professionalId || null // Optional initial assignment
                }
            ])
            .select();

        if (error) {
            console.error('Supabase Insert Error:', error);
            throw error;
        }

        res.status(201).json({ message: 'Booking created', booking: data[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get Bookings
exports.getBookings = async (req, res) => {
    try {
        let query = supabase.from('bookings').select('*, profiles:customer_id(full_name)');

        if (req.user.role === 'customer') {
            query = query.eq('customer_id', req.user.id);
        } else if (req.user.role === 'professional') {
            // Professionals see bookings assigned to them OR pending bookings (marketplace style)
            // For now, let's show assigned bookings.
            query = query.eq('professional_id', req.user.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Assign Professional
exports.assignProfessional = async (req, res) => {
    const { id } = req.params;
    const { professionalId } = req.body;

    // Logic: Who can assign? 
    // If we assume a marketplace, a Professional might "accept" a job (assign themselves).
    // Or a customer assigns a specific professional.
    // For safety, let's allow:
    // 1. Professional assigning themselves (Accept Job).
    // 2. Customer assigning (if not already assigned).

    try {
        const allowAssign = (req.user.role === 'professional' && req.user.id === professionalId) ||
            (req.user.role === 'customer'); // Simplified logic

        if (!allowAssign) {
            return res.status(403).json({ error: 'Not authorized to assign this professional' });
        }

        const { data, error } = await supabase
            .from('bookings')
            .update({ professional_id: professionalId, status: 'accepted' })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Professional assigned', booking: data[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update Status
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'accepted', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        // Fetch booking to check ownership
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Authorization logic
        let authorized = false;
        if (req.user.role === 'customer' && status === 'cancelled' && booking.customer_id === req.user.id) authorized = true; // Customer can only cancel their own bookings
        if (req.user.role === 'professional' && booking.professional_id === req.user.id) authorized = true; // Professional can update their assignments

        if (!authorized) {
            return res.status(403).json({ error: 'Not authorized to update status. You must own this booking.' });
        }

        const { data, error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Status updated', booking: data[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
