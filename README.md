# VitaDex MVP

## Installation

1. Copy `env.local.example` to `.env.local` and fill in your Firebase configuration values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

2. In the Firebase Console, under **Authentication > Sign-in method**, ensure **Google** is enabled and add `http://localhost:3000` (or your deployed domain) in **Authorized domains**.

3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

Now open `http://localhost:3000` in your browser and sign in with Google. If you still see `configuration-not-found`, double-check your `.env.local` values and authorized domains settings.
