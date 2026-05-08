import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Animated,
} from "react-native";
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { signOut, deleteUser } from "firebase/auth";

export default function CustomerProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticketStats, setTicketStats] = useState({
    total: 0, pending: 0, accepted: 0, completed: 0, cancelled: 0
  });

  // ✅ Animations
  const headerAnim = useRef(new Animated.Value(0.85)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.spring(contentAnim, { toValue: 0, friction: 6, tension: 50, delay: 200, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      }
      setLoading(false);
    });

    fetchTicketStats(user.uid);
    return () => unsub();
  }, []);

  const fetchTicketStats = async (uid) => {
    try {
      const snap = await getDocs(
        query(collection(db, "tickets"), where("customerId", "==", uid))
      );
      const stats = { total: 0, pending: 0, accepted: 0, completed: 0, cancelled: 0 };
      snap.forEach((d) => {
        stats.total++;
        const status = d.data().status || "pending";
        if (stats[status] !== undefined) stats[status]++;
      });
      setTicketStats(stats);
    } catch (e) {}
  };

  const saveProfile = async () => {
    if (!name.trim()) { Alert.alert("Error", "Name cannot be empty."); return; }
    if (!phone.trim()) { Alert.alert("Error", "Phone cannot be empty."); return; }
    setSaving(true);
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        phone: phone.trim(),
        profileUpdatedAt: Date.now(),
      });
      setEditMode(false);
      Alert.alert("✅ Saved", "Profile updated successfully.");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;
              await deleteDoc(doc(db, "users", user.uid));
              await deleteUser(user);
              Alert.alert("✅ Account Deleted", "Your account has been deleted.");
            } catch (e) {
              Alert.alert("Error", "Please logout and login again before deleting.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
      </View>
    );
  }

  const user = auth.currentUser;
  const initial = (profile?.name || user?.email || "C").charAt(0).toUpperCase();

  // ✅ Avatar color based on name
  const avatarColors = ["#1AB7BC", "#5856D6", "#FF9500", "#34C759", "#FF2D55", "#007AFF"];
  const avatarColor = avatarColors[(profile?.name || "C").charCodeAt(0) % avatarColors.length];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ✅ Teal Header with Avatar */}
      <Animated.View style={[
        styles.header,
        { transform: [{ scale: headerAnim }], opacity: headerOpacity }
      ]}>
        {/* Floating circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={[styles.avatar, { backgroundColor: avatarColor + "33", borderColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{profile?.name || "Customer"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>

        {/* ✅ Account type badge */}
        <View style={styles.accountBadge}>
          <Text style={styles.accountBadgeText}>👤 Customer Account</Text>
        </View>
      </Animated.View>

      <Animated.View style={{
        transform: [{ translateY: contentAnim }],
        opacity: contentOpacity,
        paddingHorizontal: 18,
        paddingTop: 18,
      }}>

        {/* ✅ Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderTopColor: "#1AB7BC" }]}>
            <Text style={[styles.statNum, { color: "#1AB7BC" }]}>{ticketStats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#FF9500" }]}>
            <Text style={[styles.statNum, { color: "#FF9500" }]}>{ticketStats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#5856D6" }]}>
            <Text style={[styles.statNum, { color: "#5856D6" }]}>{ticketStats.accepted}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#34C759" }]}>
            <Text style={[styles.statNum, { color: "#34C759" }]}>{ticketStats.completed}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {/* ✅ Profile Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 My Info</Text>

          {editMode ? (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#bbb"
              />
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Your phone number"
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "💾 Save Changes"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditMode(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoRow label="Name" value={profile?.name || "Not set"} />
              <InfoRow label="Phone" value={profile?.phone || "Not set"} />
              <InfoRow label="Email" value={user?.email || ""} />
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ✅ Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("MyTickets")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#EAF4FF" }]}>
              <Text style={styles.actionEmoji}>🎫</Text>
            </View>
            <Text style={styles.actionLabel}>My Tickets</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("Support")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E8FAFA" }]}>
              <Text style={styles.actionEmoji}>🎧</Text>
            </View>
            <Text style={styles.actionLabel}>Support Center</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("PrivacyPolicy")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#F5F0FF" }]}>
              <Text style={styles.actionEmoji}>📄</Text>
            </View>
            <Text style={styles.actionLabel}>Privacy Policy</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 Logout</Text>
        </TouchableOpacity>

        {/* ✅ Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>🗑️ Delete My Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Service Bridge v1.0.0</Text>

      </Animated.View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ✅ Header
  header: {
    backgroundColor: "#1AB7BC",
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: "hidden",
    position: "relative",
  },

  // Floating circles
  circle1: {
    position: "absolute", width: 180, height: 180,
    borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)",
    top: -60, left: -40,
  },
  circle2: {
    position: "absolute", width: 130, height: 130,
    borderRadius: 65, backgroundColor: "rgba(255,255,255,0.08)",
    top: 10, right: -30,
  },

  // Avatar
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  userName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  accountBadge: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  accountBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // ✅ Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 3, fontWeight: "600" },

  // ✅ Section
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "800", color: "#111",
    marginBottom: 14, borderBottomWidth: 1,
    borderBottomColor: "#F5F7FA", paddingBottom: 10,
  },

  // Info Row
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F7FA",
  },
  infoLabel: { fontSize: 14, color: "#888", fontWeight: "600" },
  infoValue: { fontSize: 14, color: "#111", fontWeight: "700", maxWidth: "60%", textAlign: "right" },

  // Edit Mode
  label: { marginTop: 12, marginBottom: 6, fontWeight: "700", color: "#444", fontSize: 13 },
  input: {
    borderWidth: 1.5, borderColor: "#E0E0E0",
    borderRadius: 12, padding: 13,
    backgroundColor: "#F5F7FA", fontSize: 14, color: "#111",
  },

  editBtn: {
    marginTop: 14, backgroundColor: "#1AB7BC",
    paddingVertical: 13, borderRadius: 12, alignItems: "center", elevation: 2,
  },
  editBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  saveBtn: {
    marginTop: 14, backgroundColor: "#34C759",
    paddingVertical: 13, borderRadius: 12, alignItems: "center", elevation: 2,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  cancelEditBtn: { marginTop: 10, alignItems: "center", paddingVertical: 6 },
  cancelEditText: { color: "#1AB7BC", fontWeight: "700", fontSize: 14 },

  // ✅ Quick Actions
  actionRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: "#F5F7FA", gap: 12,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111" },
  actionArrow: { fontSize: 20, color: "#CCC", fontWeight: "300" },

  // ✅ Logout
  logoutBtn: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#FF3B30",
    elevation: 1,
  },
  logoutBtnText: { color: "#FF3B30", fontWeight: "800", fontSize: 15 },

  // ✅ Delete
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  deleteBtnText: { color: "#FF3B30", fontWeight: "600", fontSize: 13 },

  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#CCC",
    marginBottom: 10,
  },
});