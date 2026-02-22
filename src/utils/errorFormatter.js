export const formatError = (error) => {
    // MongoDB Duplicate Key Error (E11000)
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        const value = error.keyValue ? error.keyValue[field] : '';

        switch (field) {
            case 'username':
                return `Sorry, the username "${value}" is already taken. Please try another one.`;
            case 'email':
                return `An account with the email "${value}" already exists. Try logging in instead.`;
            case 'gstNumber':
                return `The GST number "${value}" is already registered. Please check again.`;
            case 'contactNumber':
                return `Total contact number "${value}" is already in use.`;
            default:
                return `This ${field} is already in use. Please use a different value.`;
        }
    }

    // Mongoose Validation Error
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return messages[0] || 'Please provide all required information correctly.';
    }

    // JWT Errors
    if (error.name === 'JsonWebTokenError') {
        return 'Invalid token. Please log in again.';
    }
    if (error.name === 'TokenExpiredError') {
        return 'Your session has expired. Please log in again.';
    }

    // Fallback to error message if it's a simple string or user-defined error
    if (typeof error === 'string') return error;

    // Default error message
    return error.message || 'Something went wrong. Please try again later.';
};
