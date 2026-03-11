export const restrictUnverifiedCreator = (req, res, next) => {
    const user = req.user;

    // Only apply restriction to Creators who have completed basic verification but not admin verification
    if (
        user.role === "CREATOR" &&
        !user.isAdminVerified
    ) {
        // We allow access to verification details submission and status check
        // These will be excluded at the route level by not applying this middleware
        return res.status(403).json({
            success: false,
            message: "Your account is under admin review. Please wait for approval.",
            code: "ADMIN_REVIEW_PENDING"
        });
    }

    next();
};
