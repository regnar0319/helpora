const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        // 1. Check if user is authenticated (req.user must exist)
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: No user found' });
        }

        // 2. Check if user's role matches the required role
        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                error: `Forbidden: Requires ${requiredRole} role`
            });
        }

        // 3. Allow request
        next();
    };
};

module.exports = authorizeRole;
