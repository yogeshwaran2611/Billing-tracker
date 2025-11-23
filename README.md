# Billing Tracker Application

A professional, full-featured billing and invoice management system built with Next.js 16 and Firebase. Features role-based access control, dynamic data entry tables, template management, and Excel export capabilities.

## Features

### Authentication & Authorization
- Secure email/password authentication via Firebase
- Role-based access control (Admin, Accounts, Support, Member)
- Protected routes with automatic redirects
- User session management

### Dashboard
- Dynamic, spreadsheet-like data entry interface
- Role-based field editing permissions
- Real-time filtering by client, date range, and status
- Add, edit, and save billing records
- Export data to Excel (.xlsx)

### User Management (Admin Only)
- Create and manage user accounts
- Assign roles with specific permissions
- Default password: `user123` for new users
- Edit and delete users

### Invoice Settings (Admin Only)
- Create and manage clients
- Assign products (TMS/RMS)
- Build custom invoice templates
- Define field types (String, Number, Date, Dropdown)
- Set role-based edit permissions per field
- Drag-and-drop field reordering

### Change Password
- Secure password update for all users
- Current password verification
- Password strength validation

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Firebase Realtime Database, Firebase Authentication
- **UI**: Tailwind CSS v4, shadcn/ui components
- **Export**: XLSX library for Excel exports

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Firebase project created

### Installation

1. Clone the repository
2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment variables:
   - Copy `.env.local` and update with your Firebase credentials
   - All Firebase config values are prefixed with `NEXT_PUBLIC_`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000)

### Initial Setup

1. Your Firebase project should already have at least one admin user configured in the database
2. Sign in with the admin credentials
3. Navigate to User Management to add more users
4. Navigate to Invoice Settings to create clients and templates

## Database Structure

\`\`\`
/users
  /{userId}
    email: string
    role: "Admin" | "Accounts" | "Support" | "Member"

/clients
  /{clientId}
    clientName: string
    product: "TMS" | "RMS"
    template:
      fields:
        /{fieldId}
          name: string
          type: "string" | "number" | "date" | "month" | "dropdown"
          values?: string[]
          index: number
          permissions:
            accounts: boolean
            support: boolean

/billingData
  /{clientId}
    /{monthId}
      /{recordId}
        /{fieldId}
          value: any
\`\`\`

## Firebase Rules

The application uses comprehensive Firebase Realtime Database security rules to enforce:
- Authentication required for all operations
- Admin-only access for user and client management
- Role-based field editing permissions on billing data
- Read access for all authenticated users

## Role Permissions

| Feature | Admin | Accounts | Support | Member |
|---------|-------|----------|---------|--------|
| Dashboard (View) | ✓ | ✓ | ✓ | ✓ |
| Dashboard (Edit) | All Fields | Permission-based | Permission-based | Read-only |
| User Management | ✓ | ✗ | ✗ | ✗ |
| Invoice Settings | ✓ | ✗ | ✗ | ✗ |
| Change Password | ✓ | ✓ | ✓ | ✓ |
| Export Data | ✓ | ✓ | ✓ | ✓ |

## Key Components

- `AuthProvider`: Global authentication context
- `ProtectedRoute`: Route guard with role checking
- `AppLayout`: Main layout with navigation drawer
- `DashboardContent`: Dynamic table with role-based editing
- `UserManagementContent`: User CRUD operations
- `InvoiceSettingsContent`: Client management
- `TemplateBuilder`: Template creation and editing
- `ChangePasswordContent`: Password update form

## Design

The application features a professional dark theme inspired by modern SaaS platforms:
- Clean, minimalist interface
- High contrast for readability
- Responsive design for all screen sizes
- Mobile-friendly navigation drawer
- Professional color scheme with blue accents

## Security

- All Firebase credentials stored in environment variables
- Role-based access control at both UI and database levels
- Password re-authentication required for password changes
- Firebase Security Rules enforce server-side validation
- Protected API routes and components

## License

Private and confidential. All rights reserved.
