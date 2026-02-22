import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = decoded;

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ status: 'error', message: 'Not authorized' });
        }
    }

    if (!token) {
        res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
    }
};

export const creator = (req, res, next) => {
    if (req.user && req.user.role === 'CREATOR') {
        next();
    } else {
        res.status(403).json({ status: 'error', message: 'Forbidden. Creators only' });
    }
};

