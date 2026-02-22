const { supabase, supabaseAdmin } = require('../config/supabaseClient');

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch user role from profiles using Admin to bypass RLS on backend
        const clientToUse = supabaseAdmin || supabase;
        const { data: profile, error: profileError } = await clientToUse
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Middleware Profile Error:', profileError);
            return res.status(401).json({ error: 'User profile not found' });
        }

        // Construct clean user object
        req.user = {
            id: user.id,
            email: user.email,
            role: profile.role
        };
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
