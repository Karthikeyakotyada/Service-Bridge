import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  Alert, ScrollView
} from "react-native";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const FILTERS = ["All", "customer", "technician"];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.userType !== "admin")
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(list);
      setFiltered(list);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (f) => {
    setSelectedFilter(f);
    setFiltered(f === "All" ? users : users.filter((u) => u.userType === f));
  };

  const toggleBlock = async (user) => {
    const action = user.blocked ? "Unblock" : "Block";
    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${action.toLowerCase()} ${user.name || "this user"}?`,
      [
        { text: "Cancel" },
        {
          text: action, style: user.blocked ? "default" : "destructive",
          onPress: async () => {
            setUpdatingId(user.id);
            try {
              await updateDoc(doc(db, "users", user.id), {
                blocked: !user.blocked,
                blockedAt: !user.blocked ? Date.now() : null,
              });
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, blocked: !u.blocked } : u
                )
              );
              setFiltered((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, blocked: !u.blocked } : u
                )
              );
              Alert.alert("✅ Done", `User ${action.toLowerCase()}ed successfully.`);
            } catch (e) {
              Alert.alert("Error", e.message);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, selectedFilter === f && styles.filterBtnActive]}
            onPress={() => applyFilter(f)}
          >
            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)} (
              {f === "All" ? users.length : users.filter((u) => u.userType === f).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={[styles.card, item.blocked && styles.cardBlocked]}>
            <View style={styles.row}>
              {/* Avatar */}
              <View style={[styles.avatar, {
                backgroundColor: item.userType === "technician" ? "#34C759" : "#007AFF"
              }]}>
                <Text style={styles.avatarText}>
                  {(item.name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name || "Unknown"}</Text>
                  {item.blocked && (
                    <View style={styles.blockedBadge}>
                      <Text style={styles.blockedBadgeText}>BLOCKED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.phone}>📞 {item.phone || "Not provided"}</Text>
                <View style={[styles.typePill, {
                  backgroundColor: item.userType === "technician" ? "#E8FAF0" : "#EAF4FF"
                }]}>
                  <Text style={[styles.typeText, {
                    color: item.userType === "technician" ? "#34C759" : "#007AFF"
                  }]}>
                    {item.userType === "technician" ? "🔧 Technician" : "👤 Customer"}
                  </Text>
                </View>
                {item.userType === "technician" && item.specializations?.length ? (
                  <Text style={styles.specs}>
                    🛠️ {item.specializations.join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Block/Unblock Button */}
            <TouchableOpacity
              style={[styles.blockBtn, item.blocked ? styles.unblockBtn : styles.blockBtnRed]}
              onPress={() => toggleBlock(item)}
              disabled={updatingId === item.id}
            >
              <Text style={styles.blockBtnText}>
                {updatingId === item.id ? "..." : item.blocked ? "✅ Unblock User" : "🚫 Block User"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F0F0", borderWidth: 1, borderColor: "#ddd" },
  filterBtnActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  filterText: { fontWeight: "600", color: "#333", fontSize: 13 },
  filterTextActive: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#eee" },
  cardBlocked: { backgroundColor: "#FFF5F5", borderColor: "#FFB3B3" },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#111" },
  blockedBadge: { backgroundColor: "#FF3B30", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  blockedBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  email: { fontSize: 12, color: "#666", marginTop: 2 },
  phone: { fontSize: 12, color: "#666", marginTop: 2 },
  typePill: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontSize: 12, fontWeight: "700" },
  specs: { fontSize: 12, color: "#888", marginTop: 4 },
  blockBtn: { paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  blockBtnRed: { backgroundColor: "#FF3B30" },
  unblockBtn: { backgroundColor: "#34C759" },
  blockBtnText: { color: "#fff", fontWeight: "800" },
});