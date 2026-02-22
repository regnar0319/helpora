const { supabase } = require('../config/supabaseClient');

// Helper function for service validation
const validateServiceInput = (title, description, price, category) => {
    const errors = [];

    // Title validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
        errors.push('Title is required and cannot be empty.');
    } else if (title.trim().length > 100) {
        errors.push('Title cannot exceed 100 characters.');
    }

    // Price validation
    if (price === undefined || price === null || price === '') {
        errors.push('Price is required.');
    } else {
        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice <= 0) {
            errors.push('Price must be a valid positive number.');
        }
    }

    // Category validation (basic enum check based on frontend)
    const validCategories = ['Plumbing', 'Electrical', 'Cleaning', 'AC Repair', 'Appliance Repair', 'Home Maintenance'];
    if (!category || !validCategories.includes(category)) {
        errors.push('Invalid category selected.');
    }

    // Sanitization & Formatting
    const sanitizedTitle = title ? title.trim() : title;
    const sanitizedDesc = description ? description.trim() : '';

    return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: {
            title: sanitizedTitle,
            description: sanitizedDesc,
            price: Number(price),
            category
        }
    };
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getAllServices = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching services:', error);
            return res.status(500).json({ error: 'Failed to retrieve services' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Server error in getAllServices:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
exports.getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Server error in getServiceById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// @desc    Get logged in provider's services
// @route   GET /api/services/my-services
// @access  Private (Provider only)
exports.getMyServices = async (req, res) => {
    try {
        const provider_id = req.user.id;

        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('provider_id', provider_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching provider services:', error);
            return res.status(500).json({ error: 'Failed to retrieve your services' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Server error in getMyServices:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Provider only)
exports.createService = async (req, res) => {
    try {
        const { title, description, price, category } = req.body;
        const provider_id = req.user.id;

        // Comprehensive Validation
        const validation = validateServiceInput(title, description, price, category);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors.join(' ') });
        }

        const { sanitizedData } = validation;

        const { data, error } = await supabase
            .from('services')
            .insert([{
                provider_id,
                title: sanitizedData.title,
                description: sanitizedData.description,
                price: sanitizedData.price,
                category: sanitizedData.category
            }])
            .select();

        if (error) {
            console.error('Error creating service:', error);
            return res.status(500).json({ error: 'Failed to create service' });
        }

        res.status(201).json(data[0]);
    } catch (err) {
        console.error('Server error in createService:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// @desc    Update an existing service
// @route   PUT /api/services/:id
// @access  Private (Provider owner only)
exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const provider_id = req.user.id;
        const { title, description, price, category } = req.body;

        // Comprehensive Validation
        const validation = validateServiceInput(title, description, price, category);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors.join(' ') });
        }

        const { sanitizedData } = validation;

        // Verify Ownership First
        const { data: service, error: fetchError } = await supabase
            .from('services')
            .select('provider_id')
            .eq('id', id)
            .single();

        if (fetchError || !service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        if (service.provider_id !== provider_id) {
            return res.status(403).json({ error: 'Unauthorized to update this service' });
        }

        // Perform Update
        const { data, error: updateError } = await supabase
            .from('services')
            .update({
                title: sanitizedData.title,
                description: sanitizedData.description,
                price: sanitizedData.price,
                category: sanitizedData.category
            })
            .eq('id', id)
            .select();

        if (updateError) {
            console.error('Error updating service:', updateError);
            return res.status(500).json({ error: 'Failed to update service' });
        }

        res.status(200).json(data[0]);
    } catch (err) {
        console.error('Server error in updateService:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Provider owner only)
exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const provider_id = req.user.id;

        // Verify Ownership First
        const { data: service, error: fetchError } = await supabase
            .from('services')
            .select('provider_id')
            .eq('id', id)
            .single();

        if (fetchError || !service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        if (service.provider_id !== provider_id) {
            return res.status(403).json({ error: 'Unauthorized to delete this service' });
        }

        // Perform Delete
        const { error: deleteError } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting service:', deleteError);
            return res.status(500).json({ error: 'Failed to delete service' });
        }

        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (err) {
        console.error('Server error in deleteService:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
