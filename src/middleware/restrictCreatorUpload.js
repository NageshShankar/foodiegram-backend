/**
 * restrictCreatorUpload.js
 *
 * Blocks ONLY the upload action for Creators who are pending admin verification.
 * All browsing routes (feed, save, search, profiles) remain fully accessible.
 */

export const restrictUnverifiedCreatorUpload = (req, res, next) => {
    const user = req.user;

    if (
        user.role === "CREATOR" &&
        user.isVerified &&
        !user.isAdminVerified
    ) {
        return res.status(403).json({
            success: false,
            message: "Your account is under verification. You cannot upload reels yet."
        });
    }

    next();
};

