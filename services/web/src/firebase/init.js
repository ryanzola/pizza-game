import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";

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
initializeApp(firebaseConfig);

const auth = getAuth();

export default auth;