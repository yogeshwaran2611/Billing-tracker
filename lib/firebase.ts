import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const database = getDatabase(app)

let secondaryApp: FirebaseApp | null = null
let secondaryAuth: Auth | null = null

export const getSecondaryAuth = () => {
  if (!secondaryAuth) {
    // Create a secondary app instance if it doesn't exist
    const existingSecondaryApp = getApps().find((app) => app.name === "secondary")

    if (existingSecondaryApp) {
      secondaryApp = existingSecondaryApp
    } else {
      secondaryApp = initializeApp(firebaseConfig, "secondary")
    }

    secondaryAuth = getAuth(secondaryApp)
  }

  return secondaryAuth
}
