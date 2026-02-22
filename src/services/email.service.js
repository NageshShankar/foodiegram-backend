import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true, // show debug output
    logger: true // log information in console
});

export const sendRestaurantVerificationEmail = async (creator, restaurant, token) => {
    try {
        const adminEmail = 'nageshshankar183@gmail.com';
        const verifyUrl = `${process.env.BACKEND_URL}/api/admin/verify?restaurantId=${restaurant._id}&token=${token}`;
        const rejectUrl = `${process.env.BACKEND_URL}/api/admin/reject?restaurantId=${restaurant._id}&token=${token}`;

        console.log(`[EMAIL-SERVICE] Sending verification email for ${restaurant.restaurantName}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: 'New Restaurant Verification Request',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <div style="background-color: #000; color: #FACC15; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">FOODIEGRAM</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">NEW RESTAURANT VERIFICATION</p>
                    </div>
                    <div style="padding: 40px; background-color: #ffffff;">
                        <h2 style="color: #000; margin-top: 0; font-size: 22px; border-bottom: 2px solid #FACC15; display: inline-block; padding-bottom: 5px;">Restaurant Details</h2>
                        
                        <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <p style="margin: 10px 0;"><strong>Creator Email:</strong> ${creator.email || 'N/A'}</p>
                            <p style="margin: 10px 0;"><strong>Restaurant Name:</strong> ${restaurant.restaurantName || restaurant.name}</p>
                            <p style="margin: 10px 0;"><strong>GST Number:</strong> ${restaurant.gstNumber}</p>
                            <p style="margin: 10px 0;"><strong>Address:</strong> ${restaurant.address}</p>
                            <p style="margin: 10px 0;"><strong>Zomato:</strong> <a href="${restaurant.zomatoLink}">${restaurant.zomatoLink}</a></p>
                            <p style="margin: 10px 0;"><strong>Swiggy:</strong> <a href="${restaurant.swiggyLink}">${restaurant.swiggyLink}</a></p>
                            <p style="margin: 10px 0;"><strong>Photo:</strong> <a href="${process.env.BACKEND_URL}${restaurant.restaurantPhoto}">View Photo</a></p>
                        </div>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${verifyUrl}" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px; display: inline-block; margin-right: 10px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">VERIFY</a>
                            <a href="${rejectUrl}" style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">REJECT</a>
                        </div>
                        
                        <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
                            <strong>Verification Links:</strong><br>
                            <a href="${verifyUrl}" style="color: #22c55e;">Verify Link</a> | 
                            <a href="${rejectUrl}" style="color: #ef4444;">Reject Link</a>
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] Verification email sent: ${info.response}`);
        return true;
    } catch (error) {
        console.error('[EMAIL-SERVICE] Error sending verification email:', error);
        return false;
    }
};

export const sendCreatorStatusEmail = async (email, statusMessage) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Foodiegram Account Status Update',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>Account Status Update</h2>
                    <p>${statusMessage}</p>
                    <br />
                    <p>Team Foodiegram</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] Status email sent: ${info.response}`);
    } catch (error) {
        console.error('[EMAIL-SERVICE] Error sending status email:', error);
    }
};
export const sendOTPEmail = async (email, otp) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'nageshshankar183@gmail.com';
        if (email === adminEmail) {
            console.log(`[EMAIL-SERVICE] Skipping login OTP email for ADMIN: ${email}`);
            return true;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Foodiegram Creator Login OTP',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #000; color: #FACC15; padding: 25px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">FOODIEGRAM</h1>
                    </div>
                    <div style="padding: 40px; background-color: #fff; text-align: center;">
                        <h2 style="color: #334155; margin-top: 0;">Creator Login Verification</h2>
                        <p style="color: #64748b; font-size: 16px;">Use the code below to verify your login attempt. This code expires in 5 minutes.</p>
                        
                        <div style="margin: 35px 0;">
                            <span style="background-color: #f1f5f9; color: #000; font-size: 32px; font-weight: 800; letter-spacing: 12px; padding: 15px 30px; border-radius: 8px; border: 1px dashed #cbd5e1; display: inline-block;">
                                ${otp}
                            </span>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 13px;">If you didn't attempt to log in, please secure your account immediately.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] OTP email sent: ${info.response}`);
        return true;
    } catch (error) {
        console.error('[EMAIL-SERVICE] Error sending OTP email:', error);
        return false;
    }
};

export const sendRegistrationOTPEmail = async (email, otp) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'nageshshankar183@gmail.com';
        if (email === adminEmail) {
            console.log(`[EMAIL-SERVICE] Skipping registration OTP email for ADMIN: ${email}`);
            return true;
        }

        console.log(`[EMAIL-SERVICE] Attempting to send Registration OTP to: ${email}`);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Foodiegram Account Verification',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #000; color: #FACC15; padding: 25px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">FOODIEGRAM</h1>
                    </div>
                    <div style="padding: 40px; background-color: #fff; text-align: center;">
                        <h2 style="color: #334155; margin-top: 0;">Verify Your Account</h2>
                        <p style="color: #64748b; font-size: 16px;">Welcome to Foodiegram! Use the code below to verify your email address. This code expires in 10 minutes.</p>
                        
                        <div style="margin: 35px 0;">
                            <span style="background-color: #f1f5f9; color: #000; font-size: 32px; font-weight: 800; letter-spacing: 12px; padding: 15px 30px; border-radius: 8px; border: 1px dashed #cbd5e1; display: inline-block;">
                                ${otp}
                            </span>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 13px;">If you didn't create an account, please ignore this email.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] Registration OTP email sent: ${info.response}`);
        return true;
    } catch (error) {
        console.error('[EMAIL-SERVICE] Error sending Registration OTP email to ' + email + ':', error);
        return false;
    }
};
export const sendPasswordResetEmail = async (email, resetUrl) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Foodiegram Password Reset',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #000; color: #FACC15; padding: 25px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">FOODIEGRAM</h1>
                    </div>
                    <div style="padding: 40px; background-color: #fff; text-align: center;">
                        <h2 style="color: #334155; margin-top: 0;">Password Reset</h2>
                        <p style="color: #64748b; font-size: 16px;">You requested a password reset. Click the button below to set a new password. This link expires in 10 minutes.</p>
                        
                        <div style="margin: 35px 0;">
                            <a href="${resetUrl}" style="background-color: #FACC15; color: #000; padding: 15px 30px; border-radius: 8px; font-weight: 800; text-decoration: none; display: inline-block; box-shadow: 0 10px 20px -5px rgba(250, 204, 21, 0.4);">
                                RESET PASSWORD
                            </a>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, please ignore this email.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] Reset email sent: ${info.response}`);
        return true;
    } catch (error) {
        console.error('[EMAIL-SERVICE] Error sending reset email:', error);
        return false;
    }
};
