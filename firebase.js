import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCTz_UZiAiG2TYJFwq8uHzpn7f6J4YWtwk",
  authDomain: "servicebridgeapp.firebaseapp.com",
  projectId: "servicebridgeapp",
  storageBucket: "servicebridgeapp.firebasestorage.app",
  messagingSenderId: "231713280952",
  appId: "1:231713280952:android:fc01c03525bc3fccb2754d" // ← Change this to Android appId
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export default app;
