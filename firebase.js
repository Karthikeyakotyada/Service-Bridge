import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDkj12zo5C7J_Xe4ePo2kJCjyqRuUChpmc",
  authDomain: "servicebridge-bef0a.firebaseapp.com",
  projectId: "servicebridge-bef0a",
  storageBucket: "servicebridge-bef0a.firebasestorage.app",
  messagingSenderId: "506721705710",
  appId: "1:506721705710:android:292969f08369834d765dff"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
