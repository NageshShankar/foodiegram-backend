## Testing Admin Verification Email

### Steps to Test:

1. **Start the backend server** (already running)
   - Check terminal for logs starting with `[EMAIL-SERVICE]` and `[CREATOR]`

2. **Register a new creator account** or use an existing one

3. **Complete the registration flow:**
   - Fill in business details (restaurant name, address, GST, etc.)
   - Select a price mode (POS or MANUAL)

4. **Check the backend terminal** for these logs:
   ```
   [CREATOR] User <email> is setting price mode to <POS/MANUAL>
   [CREATOR] Restaurant <name> updated with price mode <POS/MANUAL>
   [CREATOR] Verification token created for restaurant <id>
   [CREATOR] Sending verification email to admin for restaurant: <name>
   [EMAIL-SERVICE] ========================================
   [EMAIL-SERVICE] SENDING ADMIN VERIFICATION EMAIL
   [EMAIL-SERVICE] Restaurant: <name>
   [EMAIL-SERVICE] Creator: <email>
   [EMAIL-SERVICE] Admin Email: nageshshankar183@gmail.com
   [EMAIL-SERVICE] Verification URL: <url>
   [EMAIL-SERVICE] ========================================
   [EMAIL-SERVICE] Calling transporter.sendMail()...
   [EMAIL-SERVICE] ✅ SUCCESS! Email sent to admin
   [EMAIL-SERVICE] Message ID: <id>
   [EMAIL-SERVICE] Response: <response>
   [EMAIL-SERVICE] ========================================
   [CREATOR] Verification email sent successfully to admin
   ```

5. **Check your email** at nageshshankar183@gmail.com
   - Check inbox
   - Check spam/junk folder
   - Check "All Mail" folder

### If Email Still Not Received:

1. **Gmail Security Settings:**
   - Go to https://myaccount.google.com/security
   - Check "Less secure app access" (if available)
   - Check "2-Step Verification" status

2. **Gmail Filters:**
   - Check if any filters are auto-archiving emails
   - Search for "from:nageshshankar183@gmail.com" in Gmail

3. **App Password:**
   - The current password in .env might need to be regenerated
   - Go to https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
   - Update EMAIL_PASS in .env file

### Current Configuration:
- EMAIL_USER: nageshshankar183@gmail.com
- EMAIL_PASS: qznuryuotzkimgqs (App Password)
- Admin Email: nageshshankar183@gmail.com
- BACKEND_URL: http://localhost:5000
