import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../../firebase";

function StatusPill({ status }) {
  const color =
    status === "completed" ? "#34C759" : "#8E8E93";

  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.pillText}>{String(status || "")}</Text>
    </View>
  );
}

export default function TechnicianCompletedScreen() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "tickets"),
      where("technicianId", "==", user.uid),
      where("status", "==", "completed")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTickets(list);
        setLoading(false);
      },
      (err) => {
        Alert.alert("Firestore Error", err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [tickets]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!sortedTickets.length) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>No completed jobs yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedTickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.service}>{item.serviceType || "Service"}</Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={styles.desc}>{item.description || ""}</Text>
            <Text style={styles.meta}>
              Completed: {item.completedAt ? new Date(item.completedAt).toLocaleString() : ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#eee" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  service: { fontSize: 16, fontWeight: "800", color: "#111" },
  desc: { marginTop: 8, color: "#333" },
  meta: { marginTop: 10, fontSize: 12, color: "#777" },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "800", textTransform: "capitalize" },
});