import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ScrollView, ActivityIndicator, Animated,
} from "react-native";
import * as Location from "expo-location";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { signOut, deleteUser } from "firebase/auth";

export default function TechnicianProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [officeCoords, setOfficeCoords] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // ✅ Animations
  const headerScale = useRef(new Animated.Value(0.88)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.parallel([
      Animated.spring(contentSlide, { toValue: 0, friction: 6, delay: 180, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setOfficeAddress(data.officeAddress || "");
        setOfficeCoords(data.officeLocation || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const setCurrentAsOffice = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setOfficeCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      Alert.alert("✅ Location Set", "Current location set as office location.");
    } catch (e) {
      Alert.alert("Error", "Could not get location.");
    }
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
        officeAddress: officeAddress.trim(),
        officeLocation: officeCoords || null,
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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: () => signOut(auth).catch((e) => Alert.alert("Error", e.message)),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Delete Account",
      "This will permanently delete your account. This cannot be undone.",
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
            } catch (e) {
              Alert.alert("Error", "Please logout and login again, then try.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
      </View>
    );
  }

  const user = auth.currentUser;
  const initial = (profile?.name || "T").charAt(0).toUpperCase();
  const avatarColors = ["#1AB7BC", "#5856D6", "#FF9500", "#34C759", "#FF2D55"];
  const avatarColor = avatarColors[(profile?.name || "T").charCodeAt(0) % avatarColors.length];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ════════════════��═════════
          ✅ TEAL HEADER
      ══════════════════════════ */}
      <Animated.View style={[
        styles.header,
        { transform: [{ scale: headerScale }], opacity: headerOpacity }
      ]}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <Text style={styles.headerName}>{profile?.name || "Technician"}</Text>
        <Text style={styles.headerEmail}>{user?.email || ""}</Text>

        {/* Specializations */}
        {profile?.specializations?.length ? (
          <View style={styles.specRow}>
            {profile.specializations.map((s, i) => (
              <View key={i} style={styles.specChip}>
                <Text style={styles.specChipText}>🔧 {s}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      <Animated.View style={{
        transform: [{ translateY: contentSlide }],
        opacity: contentOpacity,
        paddingHorizontal: 18,
        paddingTop: 18,
      }}>

        {/* ══════════════════════════
            ✅ PROFILE INFO / EDIT
        ══════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 My Info</Text>

          {editMode ? (
            <>
              {/* Name */}
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#CCC"
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Your phone"
                placeholderTextColor="#CCC"
              />

              {/* Office Address */}
              <Text style={styles.inputLabel}>Office / Store Address</Text>
              <TextInput
                style={styles.input}
                value={officeAddress}
                onChangeText={setOfficeAddress}
                placeholder="e.g. Shop 12, Main Street"
                placeholderTextColor="#CCC"
              />

              {/* GPS */}
              <Text style={styles.inputLabel}>Office GPS Location</Text>
              {officeCoords ? (
                <View style={styles.coordsBox}>
                  <Text style={styles.coordsIcon}>📍</Text>
                  <Text style={styles.coordsText}>
                    {officeCoords.latitude.toFixed(5)}, {officeCoords.longitude.toFixed(5)}
                  </Text>
                </View>
              ) : (
                <View style={styles.noCoordsBox}>
                  <Text style={styles.noCoordsText}>No location set yet</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.locationBtn}
                onPress={setCurrentAsOffice}
              >
                <Text style={styles.locationBtnText}>📍  Use Current Location</Text>
              </TouchableOpacity>

              {/* Save / Cancel */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>💾  Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoRow label="Name" value={profile?.name || "—"} />
              <InfoRow label="Phone" value={profile?.phone || "—"} />
              <InfoRow label="Email" value={user?.email || "—"} />
              <InfoRow
                label="Office Address"
                value={profile?.officeAddress || "Not set"}
              />
              <InfoRow
                label="Office GPS"
                value={
                  profile?.officeLocation
                    ? `${profile.officeLocation.latitude.toFixed(4)}, ${profile.officeLocation.longitude.toFixed(4)}`
                    : "Not set"
                }
              />

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditMode(true)}
              >
                <Text style={styles.editBtnText}>✏️  Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ══════════════════════════
            ✅ QUICK ACTIONS
        ══════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>

          <ActionRow
            icon="💬"
            label="My Chats"
            bg="#E8FAFA"
            onPress={() => navigation.navigate("ChatList")}
          />
          <ActionRow
            icon="📋"
            label="My Jobs"
            bg="#EAF4FF"
            onPress={() => navigation.navigate("TechnicianMyJobs")}
          />
          <ActionRow
            icon="⭐"
            label="My Ratings"
            bg="#FFF8E8"
            onPress={() => navigation.navigate("TechnicianRating")}
          />
          <ActionRow
            icon="🎧"
            label="Support Center"
            bg="#F5F0FF"
            onPress={() => navigation.navigate("Support")}
          />
          <ActionRow
            icon="📄"
            label="Privacy Policy"
            bg="#F5F7FA"
            onPress={() => navigation.navigate("PrivacyPolicy")}
            last
          />
        </View>

        {/* ✅ Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪  Logout</Text>
        </TouchableOpacity>

        {/* ✅ Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>🗑️  Delete My Account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Service Bridge v1.0.0</Text>

      </Animated.View>
    </ScrollView>
  );
}

// ── Reusable Info Row ─────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Reusable Action Row ───────────────────────────────────────────────────────
function ActionRow({ icon, label, bg, onPress, last }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Text style={styles.actionEmoji}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ✅ Header
  header: {
    backgroundColor: "#1AB7BC",
    paddingTop: 60, paddingBottom: 32,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  circle1: {
    position: "absolute", width: 180, height: 180,
    borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)",
    top: -50, left: -40,
  },
  circle2: {
    position: "absolute", width: 120, height: 120,
    borderRadius: 60, backgroundColor: "rgba(255,255,255,0.07)",
    top: 10, right: -30,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  headerName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },

  // Spec chips
  specRow: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "center", gap: 8,
    marginTop: 12, paddingHorizontal: 20,
  },
  specChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  specChipText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // ✅ Section
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 15, fontWeight: "800", color: "#111",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "#F5F7FA",
  },

  // Info rows
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: "#F5F7FA",
  },
  infoLabel: { fontSize: 13, color: "#999", fontWeight: "600" },
  infoValue: {
    fontSize: 13, color: "#111", fontWeight: "700",
    maxWidth: "58%", textAlign: "right",
  },

  // Edit mode inputs
  inputLabel: {
    fontSize: 13, fontWeight: "700",
    color: "#555", marginTop: 14, marginBottom: 6,
  },
  input: {
    borderWidth: 1.5, borderColor: "#E8E8E8",
    borderRadius: 12, padding: 13,
    fontSize: 14, color: "#111",
    backgroundColor: "#FAFAFA",
  },

  // GPS
  coordsBox: {
    flexDirection: "row", alignItems: "center",
    gap: 8, backgroundColor: "#F0FFFE",
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#C3EFF1",
  },
  coordsIcon: { fontSize: 16 },
  coordsText: { fontSize: 13, color: "#1AB7BC", fontWeight: "700" },
  noCoordsBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#EBEBEB",
    alignItems: "center",
  },
  noCoordsText: { fontSize: 13, color: "#CCC", fontWeight: "600" },

  // Location button
  locationBtn: {
    marginTop: 10,
    backgroundColor: "#F5F0FF",
    borderRadius: 12, paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1, borderColor: "#E0D0FF",
  },
  locationBtnText: { color: "#5856D6", fontWeight: "800", fontSize: 13 },

  // Save button
  saveBtn: {
    marginTop: 16,
    backgroundColor: "#1AB7BC",
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", elevation: 3,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  cancelBtn: { marginTop: 10, alignItems: "center", paddingVertical: 6 },
  cancelBtnText: { color: "#1AB7BC", fontWeight: "700", fontSize: 14 },

  // Edit button
  editBtn: {
    marginTop: 14,
    backgroundColor: "#1AB7BC",
    borderRadius: 12, paddingVertical: 13,
    alignItems: "center", elevation: 2,
  },
  editBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Action rows
  actionRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F5F7FA",
    gap: 12,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111" },
  actionArrow: { fontSize: 20, color: "#CCC" },

  // Logout
  logoutBtn: {
    backgroundColor: "#fff",
    paddingVertical: 15, borderRadius: 16,
    alignItems: "center", marginBottom: 12,
    borderWidth: 1.5, borderColor: "#FF3B30",
    elevation: 1,
  },
  logoutBtnText: { color: "#FF3B30", fontWeight: "800", fontSize: 15 },

  // Delete
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 16, alignItems: "center",
    marginBottom: 16,
  },
  deleteBtnText: { color: "#FF3B30", fontWeight: "600", fontSize: 13 },

  version: {
    textAlign: "center", fontSize: 12,
    color: "#CCC", marginBottom: 10,
  },
});
