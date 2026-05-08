import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../../firebase";

function StatusPill({ status }) {
  const color =
    status === "pending" ? "#FF9500" :
    status === "accepted" ? "#007AFF" :
    status === "completed" ? "#34C759" : "#8E8E93";

  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.pillText}>{String(status || "pending")}</Text>
    </View>
  );
}

export default function MyTicketsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "tickets"), where("customerId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTickets(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => (b.clientCreatedAt || 0) - (a.clientCreatedAt || 0));
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
        <Text style={{ color: "#666" }}>No tickets yet.</Text>
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
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("TicketDetails", { ticketId: item.id })}
          >
            <View style={styles.row}>
              <Text style={styles.service}>{item.serviceType || "Service"}</Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description || ""}
            </Text>
            <Text style={styles.meta}>
              Created: {item.clientCreatedAt ? new Date(item.clientCreatedAt).toLocaleString() : ""}
            </Text>
            <Text style={styles.meta}>Ticket ID: {item.id}</Text>
            <Text style={styles.tapHint}>Tap for details →</Text>
          </TouchableOpacity>
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
  tapHint: { marginTop: 8, fontSize: 12, color: "#007AFF", fontWeight: "600" },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "800", textTransform: "capitalize" },
});