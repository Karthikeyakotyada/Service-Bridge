import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from "react-native";
import * as Location from "expo-location";
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";
// Notifications removed — push helper deleted

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

function JobCard({ item, index, sharingId, startSharingLocation, stopSharing, navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400,
        delay: index * 100, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, friction: 8, tension: 50,
        delay: index * 100, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isSharing = sharingId === item.id;

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const handleInspection = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      navigation.navigate("TechnicianJobDetails", { ticketId: item.id });
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    });
  };

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🔧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceType}>{item.serviceType}</Text>
            <Text style={styles.timeText}>Accepted {formatTime(item.acceptedAt)}</Text>
          </View>
          <View style={[styles.statusPill, isSharing && styles.statusPillLive]}>
            <View style={[styles.statusDot, isSharing && styles.statusDotLive]} />
            <Text style={[styles.statusText, isSharing && styles.statusTextLive]}>
              {isSharing ? "Live" : "Active"}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {item.inspectionNote ? (
          <View style={styles.inspectionBox}>
            <Text style={styles.inspectionTitle}>🔍 Inspection Sent</Text>
            <Text style={styles.inspectionNote} numberOfLines={1}>
              {item.inspectionNote}
            </Text>
          </View>
        ) : (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>📋  No inspection sent yet</Text>
          </View>
        )}

        {isSharing ? (
          <TouchableOpacity style={styles.stopBtn} onPress={stopSharing} activeOpacity={0.8}>
            <View style={styles.stopDot} />
            <Text style={styles.stopText}>Stop Sharing Location</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => startSharingLocation(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.locationText}>📍  Share Live Location</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.inspectBtn}
            onPress={handleInspection}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
          >
            <Text style={styles.inspectBtnText}>🔍  Inspect & Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate("Chat", {
              ticketId: item.id,
              otherUserName: item.customerName || "Customer",
            })}
            activeOpacity={0.8}
          >
            <Text style={styles.chatBtnText}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function TechnicianMyJobsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [sharingId, setSharingId] = useState(null);
  const locationWatcher = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(
      collection(db, "tickets"),
      where("technicianId", "==", user.uid),
      where("status", "==", "accepted")
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => { unsub(); stopSharing(); };
  }, []);

  const startSharingLocation = async (ticketId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Location permission is needed.");
      return;
    }
    setSharingId(ticketId);
    locationWatcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      async (loc) => {
        try {
          await updateDoc(doc(db, "tickets", ticketId), {
            technicianLocation: {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              updatedAt: Date.now(),
            },
          });
        } catch (e) {}
      }
    );
    Alert.alert("📍 Location Sharing", "Your live location is now shared with the customer.");
  };

  const stopSharing = async () => {
    if (locationWatcher.current) {
      locationWatcher.current.remove();
      locationWatcher.current = null;
    }
    setSharingId(null);
  };

  // ✅ Complete job with push notification to customer
  const completeJob = async (ticket) => {
    Alert.alert(
      "Complete Job?",
      "Mark this job as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete ✅",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "tickets", ticket.id), {
                status: "completed",
                completedAt: Date.now(),
              });

              // Notifications disabled: skip sending push

              Alert.alert("✅ Job Completed!", "The job has been marked as completed.");
            } catch (e) {
              Alert.alert("Error", e.message);
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

  if (jobs.length === 0) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyEmoji}>🔧</Text>
        <Text style={styles.emptyTitle}>No Active Jobs</Text>
        <Text style={styles.emptySub}>Accepted tickets will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <View style={styles.listHeaderDot} />
            <Text style={styles.listHeaderText}>
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} in progress
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <JobCard
            item={item}
            index={index}
            sharingId={sharingId}
            startSharingLocation={startSharingLocation}
            stopSharing={stopSharing}
            navigation={navigation}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 40 },
  listHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  listHeaderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1AB7BC" },
  listHeaderText: { fontSize: 14, fontWeight: "700", color: "#888" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18,
    elevation: 3, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10,
    borderWidth: 1, borderColor: "#EFEFEF",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#E8FAFA",
    justifyContent: "center", alignItems: "center",
  },
  iconEmoji: { fontSize: 22 },
  serviceType: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 3 },
  timeText: { fontSize: 11, color: "#BBB", fontWeight: "600" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F0FFF5", paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: "#C8F0D8",
  },
  statusPillLive: { backgroundColor: "#FFF0F0", borderColor: "#FFD0D0" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34C759" },
  statusDotLive: { backgroundColor: "#FF3B30" },
  statusText: { fontSize: 11, fontWeight: "800", color: "#34C759" },
  statusTextLive: { color: "#FF3B30" },
  desc: { fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 12 },
  inspectionBox: {
    backgroundColor: "#F0FFFE", borderRadius: 12, padding: 12,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "#1AB7BC",
  },
  inspectionTitle: { fontSize: 12, fontWeight: "800", color: "#1AB7BC", marginBottom: 3 },
  inspectionNote: { fontSize: 13, color: "#555" },
  pendingBox: {
    backgroundColor: "#FAFAFA", borderRadius: 10, padding: 10,
    marginBottom: 12, alignItems: "center",
    borderWidth: 1, borderColor: "#EFEFEF",
  },
  pendingText: { fontSize: 12, color: "#CCC", fontWeight: "600" },
  locationBtn: {
    backgroundColor: "#F5F0FF", borderRadius: 12, paddingVertical: 12,
    alignItems: "center", marginBottom: 12,
    borderWidth: 1, borderColor: "#E0D0FF",
  },
  locationText: { color: "#5856D6", fontWeight: "800", fontSize: 13 },
  stopBtn: {
    backgroundColor: "#FFF5F5", borderRadius: 12, paddingVertical: 12,
    alignItems: "center", marginBottom: 12,
    flexDirection: "row", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#FFE0E0",
  },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" },
  stopText: { color: "#FF3B30", fontWeight: "800", fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  inspectBtn: {
    flex: 1, backgroundColor: "#1AB7BC",
    paddingVertical: 14, borderRadius: 14,
    alignItems: "center", elevation: 2,
    shadowColor: "#1AB7BC", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6,
  },
  inspectBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  chatBtn: {
    width: 52, backgroundColor: "#F5F7FA",
    paddingVertical: 14, borderRadius: 14,
    alignItems: "center", borderWidth: 1.5, borderColor: "#E0E0E0",
  },
  chatBtnText: { fontSize: 20 },
  emptyScreen: {
    flex: 1, justifyContent: "center",
    alignItems: "center", padding: 40, backgroundColor: "#F5F7FA",
  },
  emptyEmoji: { fontSize: 58, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#AAA", textAlign: "center" },
});