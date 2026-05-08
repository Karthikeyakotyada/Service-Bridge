import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, ActivityIndicator,
  Alert, Platform, StatusBar, RefreshControl,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { signOut } from "firebase/auth";

const HEADER_HEIGHT = 100;

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statCardIcon}>{icon}</Text>
      <Text style={[styles.statCardNum, { color }]}>{String(value ?? "0")}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ── Manage Row ────────────────────────────────────────────────────────────────
function ManageRow({ icon, label, desc, color, onPress }) {
  return (
    <TouchableOpacity style={styles.manageRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.manageIconBox, { backgroundColor: color + "18" }]}>
        <Text style={styles.manageIcon}>{icon}</Text>
      </View>
      <View style={styles.manageInfo}>
        <Text style={styles.manageLabel}>{label}</Text>
        <Text style={styles.manageDesc}>{desc}</Text>
      </View>
      <View style={[styles.manageArrow, { backgroundColor: color + "18" }]}>
        <Text style={[styles.manageArrowText, { color }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminHomeScreen({ navigation }) {
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [usersSnap, ticketsSnap, supportSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "tickets")),
        getDocs(collection(db, "supportTickets")),
      ]);

      let customers = 0, technicians = 0, blocked = 0;
      usersSnap.forEach((d) => {
        const data = d.data();
        if (data.userType === "customer")   customers++;
        if (data.userType === "technician") technicians++;
        if (data.blocked === true)          blocked++;
      });

      let pending = 0, accepted = 0, completed = 0;
      ticketsSnap.forEach((d) => {
        const s = d.data().status || "pending";
        if      (s === "pending")   pending++;
        else if (s === "accepted")  accepted++;
        else if (s === "completed") completed++;
      });

      let supportOpen = 0, supportInProgress = 0, supportResolved = 0;
      supportSnap.forEach((d) => {
        const s = d.data().status || "open";
        if      (s === "open")        supportOpen++;
        else if (s === "in-progress") supportInProgress++;
        else if (s === "resolved")    supportResolved++;
      });

      setStats({
        customers, technicians, blocked,
        totalUsers:   customers + technicians,
        totalTickets: ticketsSnap.size,
        pending, accepted, completed,
        supportOpen, supportInProgress, supportResolved,
        totalSupport: supportSnap.size,
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          try { await signOut(auth); }
          catch (e) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  // ✅ Header slides up completely with scroll
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

      {/* ✅ SIMPLE HEADER — slides fully up on scroll */}
      <Animated.View style={[
        styles.header,
        { transform: [{ translateY: headerTranslateY }] }
      ]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreet}>Welcome back 👋</Text>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        {/* ✅ Red logout button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutBtnText}>🚪  Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ✅ Content scrolls under header */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: HEADER_HEIGHT + 10 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            colors={["#1AB7BC"]}
            tintColor="#1AB7BC"
            progressViewOffset={HEADER_HEIGHT}
          />
        }
      >

        {/* Urgent banner */}
        {stats.supportOpen > 0 && (
          <TouchableOpacity
            style={styles.urgentBanner}
            onPress={() => navigation.navigate("AdminSupport")}
            activeOpacity={0.85}
          >
            <Text style={styles.urgentEmoji}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.urgentTitle}>
                {stats.supportOpen} ticket{stats.supportOpen > 1 ? "s" : ""} need reply
              </Text>
              <Text style={styles.urgentSub}>Tap to open Support Panel</Text>
            </View>
            <Text style={styles.urgentArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Users */}
        <SectionTitle title="👥 Users" />
        <View style={styles.cardRow}>
          <StatCard icon="👥" label="Total"       value={stats.totalUsers}  color="#1AB7BC" />
          <StatCard icon="👤" label="Customers"   value={stats.customers}   color="#007AFF" />
          <StatCard icon="🔧" label="Technicians" value={stats.technicians} color="#34C759" />
          <StatCard icon="🚫" label="Blocked"     value={stats.blocked}     color="#FF3B30" />
        </View>

        {/* Tickets */}
        <SectionTitle title="🎫 Tickets" />
        <View style={styles.cardRow}>
          <StatCard icon="📋" label="Total"     value={stats.totalTickets} color="#1AB7BC" />
          <StatCard icon="⏳" label="Pending"   value={stats.pending}      color="#FF9500" />
          <StatCard icon="✋" label="Accepted"  value={stats.accepted}     color="#5856D6" />
          <StatCard icon="✅" label="Completed" value={stats.completed}    color="#34C759" />
        </View>

        {/* Support */}
        <SectionTitle title="🎧 Support" />
        <View style={styles.cardRow}>
          <StatCard icon="🔓" label="Open"        value={stats.supportOpen}       color="#FF9500" />
          <StatCard icon="🔄" label="In Progress" value={stats.supportInProgress} color="#007AFF" />
          <StatCard icon="✅" label="Resolved"    value={stats.supportResolved}   color="#34C759" />
          <StatCard icon="🎫" label="Total"       value={stats.totalSupport}      color="#1AB7BC" />
        </View>

        {/* Manage */}
        <SectionTitle title="⚙️ Manage" />
        <View style={styles.manageCard}>
          <ManageRow
            icon="🎫" label="All Tickets"
            desc="View & manage service tickets"
            color="#1AB7BC"
            onPress={() => navigation.navigate("AdminTickets")}
          />
          <View style={styles.manageDiv} />
          <ManageRow
            icon="👥" label="All Users"
            desc="Manage customers & technicians"
            color="#007AFF"
            onPress={() => navigation.navigate("AdminUsers")}
          />
          <View style={styles.manageDiv} />
          <ManageRow
            icon="🎧" label="Support Panel"
            desc="Reply to support tickets"
            color="#34C759"
            onPress={() => navigation.navigate("AdminSupport")}
          />
        </View>

        {/* Quick Status */}
        <SectionTitle title="📊 Quick Status" />
        <View style={styles.statusCard}>
          {[
            { label: "🟡 Pending Tickets", val: stats.pending,     color: "#FF9500", bg: "#FFF8E8" },
            { label: "🔵 Active Jobs",      val: stats.accepted,    color: "#5856D6", bg: "#F0F0FF" },
            { label: "🟠 Open Support",     val: stats.supportOpen, color: "#FF6B35", bg: "#FFF0E8" },
            { label: "🟢 Completed Jobs",   val: stats.completed,   color: "#34C759", bg: "#E8FAF0" },
            { label: "🚫 Blocked Users",    val: stats.blocked,     color: "#FF3B30", bg: "#FFF0F0" },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{row.label}</Text>
                <View style={[styles.statusBadge, { backgroundColor: row.bg }]}>
                  <Text style={[styles.statusVal, { color: row.color }]}>{row.val}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={styles.statusDiv} />}
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },

  // ✅ Simple clean header
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: HEADER_HEIGHT,
    backgroundColor: "#1AB7BC",
    paddingTop: Platform.OS === "ios" ? 48 : (StatusBar.currentHeight || 24) + 10,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerLeft: { flex: 1 },
  headerGreet: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginTop: 1,
  },

  // ✅ Red logout button
  logoutBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logoutBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 15, fontWeight: "800",
    color: "#222", marginTop: 20, marginBottom: 10,
  },

  // Stat cards
  cardRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1, backgroundColor: "#fff",
    borderRadius: 14, padding: 12,
    alignItems: "center", borderTopWidth: 3,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  statCardIcon: { fontSize: 20, marginBottom: 4 },
  statCardNum: { fontSize: 20, fontWeight: "900" },
  statCardLabel: {
    fontSize: 10, color: "#888",
    marginTop: 3, fontWeight: "600", textAlign: "center",
  },

  // Urgent
  urgentBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 14, padding: 14,
    marginBottom: 4, gap: 12,
    elevation: 3, shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  urgentEmoji: { fontSize: 22 },
  urgentTitle: { fontSize: 14, fontWeight: "800", color: "#fff" },
  urgentSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  urgentArrow: { fontSize: 20, color: "#fff", fontWeight: "800" },

  // Manage
  manageCard: {
    backgroundColor: "#fff", borderRadius: 18,
    overflow: "hidden", elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6,
    borderWidth: 1, borderColor: "#EFEFEF",
  },
  manageRow: {
    flexDirection: "row", alignItems: "center",
    padding: 16, gap: 14,
  },
  manageIconBox: {
    width: 44, height: 44, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
  },
  manageIcon: { fontSize: 20 },
  manageInfo: { flex: 1 },
  manageLabel: { fontSize: 15, fontWeight: "800", color: "#111" },
  manageDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  manageArrow: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  manageArrowText: { fontSize: 22, fontWeight: "800" },
  manageDiv: { height: 1, backgroundColor: "#F5F5F5", marginLeft: 74 },

  // Status
  statusCard: {
    backgroundColor: "#fff", borderRadius: 18,
    padding: 16, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6,
    borderWidth: 1, borderColor: "#EFEFEF",
  },
  statusRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 10,
  },
  statusDiv: { height: 1, backgroundColor: "#F8F8F8" },
  statusLabel: { fontSize: 14, color: "#333", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  statusVal: { fontSize: 14, fontWeight: "800" },
});