import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, ScrollView
} from "react-native";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const FILTERS = ["All", "pending", "accepted", "completed", "cancelled"];

export default function AdminTicketsScreen() {
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [customerMap, setCustomerMap] = useState({});
  const [techMap, setTechMap] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [ticketSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "tickets")),
        getDocs(collection(db, "users")),
      ]);

      const cMap = {}, tMap = {};
      userSnap.forEach((d) => {
        const data = d.data();
        if (data.userType === "customer") cMap[d.id] = data;
        if (data.userType === "technician") tMap[d.id] = data;
      });
      setCustomerMap(cMap);
      setTechMap(tMap);

      const list = ticketSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.clientCreatedAt || 0) - (a.clientCreatedAt || 0));

      setTickets(list);
      setFiltered(list);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (f) => {
    setSelectedFilter(f);
    setFiltered(f === "All" ? tickets : tickets.filter((t) => t.status === f));
  };

  const statusColor = (s) =>
    s === "pending" ? "#FF9500" :
    s === "accepted" ? "#007AFF" :
    s === "completed" ? "#34C759" : "#FF3B30";

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, selectedFilter === f && styles.filterBtnActive]}
            onPress={() => applyFilter(f)}
          >
            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === "All" ? tickets.length : tickets.filter((t) => t.status === f).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const customer = customerMap[item.customerId];
          const tech = techMap[item.technicianId];
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.service}>{item.serviceType}</Text>
                <View style={[styles.pill, { backgroundColor: statusColor(item.status) }]}>
                  <Text style={styles.pillText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.desc}>{item.description}</Text>
              <View style={styles.divider} />
              <Text style={styles.meta}>👤 Customer: {customer?.name || "Unknown"} ({customer?.phone || "N/A"})</Text>
              {tech ? (
                <Text style={styles.meta}>🔧 Technician: {tech?.name || "Unknown"} ({tech?.phone || "N/A"})</Text>
              ) : null}
              <Text style={styles.meta}>
                🕐 {item.clientCreatedAt ? new Date(item.clientCreatedAt).toLocaleString() : ""}
              </Text>
            </View>
          );
        }}
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
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#eee" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  service: { fontSize: 15, fontWeight: "800", color: "#111" },
  desc: { marginTop: 6, color: "#555", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },
  meta: { fontSize: 12, color: "#666", marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
});