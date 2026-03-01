import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "pizzamango-376923.firebaseapp.com",
  projectId: "pizzamango-376923",
  storageBucket: "pizzamango-376923.appspot.com",
  messagingSenderId: "778990538357",
  appId: "1:778990538357:web:4cdf9eb1392cc4a621f23c",
  measurementId: "G-ST4RE96MMR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

let messaging = null;

export const initMessaging = async () => {
  if (messaging) return messaging;
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (e) {
    console.error("Messaging is not supported", e);
    return null;
  }
};

export { app, auth, db, messaging };