# Setup Guide

## Quick Start

### 1. Firebase Configuration (Already Done)
Your Firebase project is already configured with:
- Project ID: billing-dashboard-e6353
- Realtime Database in Asia Southeast region
- Authentication enabled

### 2. Database Setup
Your database already contains:
- Admin user: yogesh.nandhakumar@gmail.com (role: Admin)
- Sample client: Default Client with TMS product
- Sample billing data with 5 fields

### 3. Environment Variables
The `.env.local` file is already configured with your Firebase credentials.

### 4. Running the Application

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

### 5. First Login
Use your existing admin account to sign in:
- Email: yogesh.nandhakumar@gmail.com
- Password: (your existing password)

## Features to Try

### As Admin:

1. **User Management**
   - Go to Settings > User Management
   - Click "Add New User"
   - Enter email and select role
   - New user gets default password: `user123`

2. **Invoice Settings**
   - Go to Settings > Invoice Settings
   - Click "Add New Client"
   - Enter client name and select product
   - Build template with custom fields
   - Set permissions for Accounts and Support roles

3. **Dashboard**
   - Select a client from dropdown
   - View existing billing records
   - Add new records
   - Edit any field (Admin has full access)
   - Click "Save Data" to persist changes
   - Click "Export" to download Excel file

4. **Change Password**
   - Go to Change Password
   - Enter current password
   - Enter new password (min 6 characters)
   - Confirm new password

## Testing Different Roles

1. Create test users with different roles:
   - accounts@test.com (Role: Accounts)
   - support@test.com (Role: Support)
   - member@test.com (Role: Member)

2. Sign in as each user to see different permissions:
   - Accounts: Can edit fields with "accounts permission"
   - Support: Can edit fields with "support permission"
   - Member: Read-only access to dashboard

## Customization

### Adding New Products
Edit the template builder to add more product options beyond TMS/RMS.

### Mandatory Fields
The system enforces three mandatory fields:
- Month (f1)
- Invoice Status (f2)
- Payment Status (f3)

These cannot be deleted but can be customized.

### Field Types
Available field types:
- String: Free text input
- Number: Numeric input
- Date: Date picker
- Month: Month picker
- Dropdown: Select from predefined values

## Troubleshooting

### Can't Sign In
- Verify email and password are correct
- Check that user exists in Firebase Database under `/users`
- Ensure user has a valid role assigned

### Can't Edit Fields
- Check your role (Member role is read-only)
- Verify field permissions match your role
- Admin can always edit all fields

### Data Not Saving
- Ensure you click "Save Data" button
- Check Firebase Database Rules are properly set
- Verify you have write permissions for the field

### Template Not Loading
- Ensure client has a valid template structure
- Check that all mandatory fields (f1, f2, f3) exist
- Verify field indices are sequential

## Firebase Rules Deployment

Your Firebase Rules are already configured in the Firebase Console. If you need to update them:

1. Go to Firebase Console > Realtime Database > Rules
2. Copy the rules from `user_read_only_context/text_attachments/pasted-text-vs4vg.txt`
3. Click "Publish"

## Support

For issues or questions:
1. Check the Firebase Console for authentication errors
2. Review the browser console for JavaScript errors
3. Verify database structure matches the schema in README.md
