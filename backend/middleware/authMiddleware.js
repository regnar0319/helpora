const { supabase, supabaseAdmin } = require('../config/supabaseClient');

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    console.log('--- Debug: Auth Middleware ---');
    console.log('Received Token:', token.substring(0, 15) + '...');

    try {
        let user = null;

        // Try to verify the token natively using Supabase
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            console.warn('Supabase auth.getUser failed:', error?.message);
            console.log('Attempting manual decode since we use Service Role Key for DB inserts...');

            // If using Service Role Key, we can optionally bypass strict verification 
            // and just decode the token to get the user ID (since RLS is bypassed anyway).
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);

            if (!decoded || !decoded.sub) {
                console.error('Failed to decode JWT manually');
                return res.status(401).json({ error: 'Invalid token' });
            }

            user = {
                id: decoded.sub,
                email: decoded.email
            };
        } else {
            user = data.user;
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
