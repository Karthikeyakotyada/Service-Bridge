import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import * as SplashScreen from "expo-splash-screen";

// ✅ Auth
import LoginScreen from "./src/screens/auth/LoginScreen";
import SignupScreen from "./src/screens/auth/SignupScreen";

// ✅ Customer
import CustomerHomeScreen from "./src/screens/customer/CustomerHomeScreen";
import SelectServiceScreen from "./src/screens/customer/SelectServiceScreen";
import CreateTicketScreen from "./src/screens/customer/CreateTicketScreen";
import MyTicketsScreen from "./src/screens/customer/MyTicketsScreen";
import TicketDetailsScreen from "./src/screens/customer/TicketDetailsScreen";
import NearbyShopsScreen from "./src/screens/customer/NearbyShopsScreen";
import CustomerProfileScreen from "./src/screens/customer/CustomerProfileScreen";

// ✅ Technician
import TechnicianHomeScreen from "./src/screens/technician/TechnicianHomeScreen";
import TechnicianTicketsScreen from "./src/screens/technician/TechnicianTicketsScreen";
import TechnicianMyJobsScreen from "./src/screens/technician/TechnicianMyJobsScreen";
import TechnicianCompletedScreen from "./src/screens/technician/TechnicianCompletedScreen";
import TechnicianProfileScreen from "./src/screens/technician/TechnicianProfileScreen";
import TechnicianJobDetailsScreen from "./src/screens/technician/TechnicianJobDetailsScreen";
import TechnicianRatingScreen from "./src/screens/technician/TechnicianRatingScreen";

// ✅ Admin
import AdminHomeScreen from "./src/screens/admin/AdminHomeScreen";
import AdminTicketsScreen from "./src/screens/admin/AdminTicketsScreen";
import AdminUsersScreen from "./src/screens/admin/AdminUsersScreen";

// ✅ Chat
import ChatListScreen from "./src/screens/chat/ChatListScreen";
import ChatScreen from "./src/screens/chat/ChatScreen";

// ✅ Common
import PrivacyPolicyScreen from "./src/screens/common/PrivacyPolicyScreen";

// ✅ Support
import SupportScreen from "./src/screens/Support/SupportScreen";
import SupportChatScreen from "./src/screens/Support/SupportChatScreen";
import AdminSupportScreen from "./src/screens/Support/AdminSupportScreen";

// ✅ Keep splash visible until ready
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"  component={LoginScreen}  />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// ── Admin Stack ───────────────────────────────────────────────────────────────
function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: "Admin Dashboard" }}
      />
      <Stack.Screen
        name="AdminTickets"
        component={AdminTicketsScreen}
        options={{ title: "All Tickets" }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: "All Users" }}
      />
      <Stack.Screen
        name="AdminSupport"
        component={AdminSupportScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ── Customer Stack ────────────────────────────────────────────────────────────
function CustomerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{ title: "Service Bridge" }}
      />
      <Stack.Screen
        name="SelectService"
        component={SelectServiceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTicket"
        component={CreateTicketScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{ title: "My Tickets" }}
      />
      <Stack.Screen
        name="TicketDetails"
        component={TicketDetailsScreen}
        options={{ title: "Ticket Details" }}
      />
      <Stack.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{ title: "My Profile" }}
      />
      <Stack.Screen
        name="NearbyShops"
        component={NearbyShopsScreen}
        options={{ title: "Spare Parts & Shops" }}
      />
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "My Chats" }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.otherUserName || "Chat",
        })}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SupportChat"
        component={SupportChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ── Technician Stack ──────────────────────────────────────────────────────────
function TechnicianStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TechnicianHome"
        component={TechnicianHomeScreen}
        options={{ title: "Service Bridge" }}
      />
      <Stack.Screen
        name="TechnicianTickets"
        component={TechnicianTicketsScreen}
        options={{ title: "Pending Tickets" }}
      />
      <Stack.Screen
        name="TechnicianMyJobs"
        component={TechnicianMyJobsScreen}
        options={{ title: "My Accepted Jobs" }}
      />
      <Stack.Screen
        name="TechnicianCompleted"
        component={TechnicianCompletedScreen}
        options={{ title: "Completed Jobs" }}
      />
      <Stack.Screen
        name="TechnicianProfile"
        component={TechnicianProfileScreen}
        options={{ title: "My Profile" }}
      />
      <Stack.Screen
        name="TechnicianJobDetails"
        component={TechnicianJobDetailsScreen}
        options={{ title: "Job Details & Inspection" }}
      />
      <Stack.Screen
        name="TechnicianRating"
        component={TechnicianRatingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "My Chats" }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.otherUserName || "Chat",
        })}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SupportChat"
        component={SupportChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appReady, setAppReady]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userType, setUserType]         = useState(null);

  // ✅ Step 1 — Splash screen preload
  useEffect(() => {
    async function prepare() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  // ✅ Step 2 — Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setUserType(null);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const type = snap.exists() ? snap.data().userType : "customer";
        setUserType(type);
      } catch (e) {
        console.warn("Firestore error:", e);
        setUserType("customer");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // ✅ Step 3 — Hide splash when both ready
  useEffect(() => {
    async function hideSplash() {
      if (appReady && !loading) {
        await SplashScreen.hideAsync();
      }
    }
    hideSplash();
  }, [appReady, loading]);

  // ✅ Keep loading screen visible until app + firebase both ready
  if (!appReady || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1AB7BC" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        {!firebaseUser ? (
          <AuthStack />
        ) : userType === "admin" ? (
          <AdminStack />
        ) : userType === "technician" ? (
          <TechnicianStack />
        ) : (
          <CustomerStack />
        )}
      </NavigationContainer>
    </View>
  );
}