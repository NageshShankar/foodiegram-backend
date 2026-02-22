export const adminOnly = (req, res, next) => {
    // Hardcoded check as requested by prompt logic for specific admin email
    if (req.user && req.user.email === 'nageshshankar183@gmail.com') {
        next();
    } else {
        res.status(403).json({
            status: 'error',
            message: 'Access denied. Admins only.'
        });
    }
};

export const creatorOnly = (req, res, next) => {
    if (req.user && req.user.role === 'CREATOR') {
        next();
    } else {
        res.status(403).json({
            status: 'error',
            message: 'Access denied. Creators only.'
        });
    }
};
