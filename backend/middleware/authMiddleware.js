const { supabase, supabaseAdmin } = require('../config/supabaseClient');

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    console.log('--- Debug: Auth Middleware ---');
    console.log('Received Token:', token.substring(0, 15) + '...');

    try {
        // Verify the token natively using Supabase (which securely validates the JWT signature)
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Token Verification Error:', error?.message);
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log('Decoded User ID:', user.id);

        // Fetch user role from profiles using Admin to bypass RLS on backend lookups
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
        console.error('Auth Middleware Exception:', err);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
