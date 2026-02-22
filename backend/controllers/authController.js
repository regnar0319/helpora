const { supabase, supabaseAdmin } = require('../config/supabaseClient');

// Signup
exports.signup = async (req, res) => {
    console.log('--- Signup Request Received ---'); // DEBUG
    console.log('Headers:', req.headers['content-type']); // DEBUG
    console.log('Body:', req.body); // DEBUG
    console.log('File:', req.file); // DEBUG

    let { email, password, role, fullName } = req.body;
    const idDocument = req.file;

    // Default to customer if role is not provided
    if (!role) {
        role = 'customer';
    }

    let idDocumentUrl = null; // Scope outside

    try {
        // 1. Sign up with Supabase Admin to bypass email rate limits & auto-confirm
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm the user
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;

        if (authData.user) {
            // Sign in immediately to get a session
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) throw signInError;

            // Use the session from sign in
            authData.session = signInData.session;

            // 2. Upload ID Document if provided (for providers)
            if (idDocument && role === 'provider') {
                const fileName = `${authData.user.id}/${Date.now()}_${idDocument.originalname}`;
                const { data: storageData, error: storageError } = await supabaseAdmin
                    .storage
                    .from('provider-documents')
                    .upload(fileName, idDocument.buffer, {
                        contentType: idDocument.mimetype
                    });

                if (storageError) {
                    console.error('Storage Upload Error:', storageError);
                } else {
                    idDocumentUrl = fileName;
                }
            }

            // 3. Create profile entry
            if (!supabaseAdmin) {
                throw new Error('Server misconfiguration: Service Role Key missing');
            }

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        role,
                        full_name: fullName,
                        // Store document path/url if needed
                    }
                ]);

            if (profileError) {
                return res.status(400).json({ error: profileError.message });
            }

            res.status(201).json({
                message: 'User registered successfully',
                user: authData.user,
                session: authData.session,
                role: role, // Explicitly return role
                idDocumentUrl: idDocumentUrl
            });
        }
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(400).json({ error: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Fetch user role from profiles
        let profile = null;
        let profileError = null;

        if (supabaseAdmin) {
            const { data: adminData, error: adminError } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            profile = adminData;
            profileError = adminError;
        } else {
            // Fallback utilizing auth context if Admin SDK fails securely
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            profile = pData;
            profileError = pError;
        }

        if (profileError) {
            // Fallback if profile not found (shouldn't happen)
            console.error('Profile not found for user:', data.user.id, profileError.message);
        }

        const role = profile ? profile.role : 'customer';

        res.status(200).json({
            message: 'Login successful',
            user: data.user,
            session: data.session,
            role: role // Return role for frontend redirection
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};
