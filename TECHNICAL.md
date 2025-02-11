# Technical Documentation

This document provides technical details for setting up, developing, and deploying the FastBooking application.

## Technology Stack

- **Frontend**
  - React 18.3
  - TypeScript
  - Vite
  - Tailwind CSS
  - Lucide React (icons)
  - FullCalendar
  - Recharts

- **Backend & Services**
  - Firebase
    - Authentication
    - Firestore
    - Storage
  - Node.js

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Firebase account

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/fastbooking.git
cd fastbooking
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── dashboard/    # Dashboard-specific components
│   └── ...
├── contexts/         # React context providers
├── lib/             # Utility functions and configurations
├── pages/           # Application pages/routes
├── types/           # TypeScript type definitions
└── main.tsx         # Application entry point
```

## Firebase Setup

1. Create a new Firebase project
2. Enable Authentication with email/password and Google providers
3. Create a Firestore database
4. Set up Storage rules
5. Configure Firebase in the application

### Firestore Collections

- `users`: User profiles and settings
- `appointments`: Scheduled appointments
- `groups`: User groups and teams
- `notifications`: System notifications
- `shareableLinks`: Profile sharing links

## Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Deployment

The application can be deployed to any static hosting service. We recommend Netlify or Firebase Hosting.

### Netlify Deployment

1. Connect your repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard

## Testing

Run tests:
```bash
npm run test
```

## Code Style

- ESLint configuration is provided
- Prettier is recommended for code formatting
- Follow the existing code style and patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Common Issues

### Firebase Authentication

If you encounter CORS issues:
- Add your domain to Firebase Authentication authorized domains
- Check your API key restrictions

### Storage Issues

- Verify Storage rules are correctly configured
- Check file size limits
- Ensure correct CORS configuration

## Performance Optimization

- Use React.memo for expensive components
- Implement virtualization for long lists
- Optimize Firebase queries
- Use appropriate indexes in Firestore

## Security Considerations

- Implement proper Firebase Security Rules
- Use environment variables for sensitive data
- Validate user input
- Implement rate limiting
- Regular security audits

## Monitoring

- Set up Firebase Analytics
- Configure Error Reporting
- Monitor performance with Firebase Performance Monitoring

## Support

For technical support:
1. Check the documentation
2. Search existing issues
3. Create a new issue with:
   - Detailed description
   - Steps to reproduce
   - Error messages
   - Environment details