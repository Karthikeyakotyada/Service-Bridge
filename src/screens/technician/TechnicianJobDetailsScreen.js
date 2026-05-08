import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Animated, Linking,
} from "react-native";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatTime(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString();
}

export default function TechnicianJobDetailsScreen({ route, navigation }) {
  const ticketId = route?.params?.ticketId;

  const [ticket, setTicket] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspectionNote, setInspectionNote] = useState("");
  const [partsList, setPartsList] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // ✅ Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  }, [loading]);

  if (!ticketId) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>Ticket ID missing.</Text>
      </View>
    );
  }

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tickets", ticketId), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setTicket(data);
        setInspectionNote(data.inspectionNote || "");
        setPartsList(data.partsList || "");

        // ✅ Fetch customer info
        if (data.customerId) {
          try {
            const custSnap = await getDoc(doc(db, "users", data.customerId));
            if (custSnap.exists()) setCustomerInfo(custSnap.data());
          } catch (e) {}
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [ticketId]);

const saveInspection = async () => {
  if (!inspectionNote.trim()) {
    Alert.alert("Error", "Please enter inspection notes.");
    return;
  }
  setSaving(true);
  try {
    await updateDoc(doc(db, "tickets", ticketId), {
      inspectionNote: inspectionNote.trim(),
      partsList: partsList.trim(),
      inspectionUpdatedAt: Date.now(),
    });

    // ✅ Clear the input boxes after successful send
    setInspectionNote("");
    setPartsList("");

    Alert.alert("✅ Updated", "Inspection details sent to customer.");
  } catch (e) {
    Alert.alert("Error", e.message);
  } finally {
    setSaving(false);
  }
};

  const markCompleted = async () => {
    Alert.alert("Complete Job", "Mark this job as completed?", [
      { text: "No" },
      {
        text: "Yes",
        onPress: async () => {
          setCompleting(true);
          try {
            await updateDoc(doc(db, "tickets", ticketId), {
              status: "completed",
              completedAt: Date.now(),
            });
            Alert.alert("✅ Job Completed", "Job marked as completed.");
            navigation.goBack();
          } catch (e) {
            Alert.alert("Error", e.message);
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  const openWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() =>
      Alert.alert("Error", "WhatsApp not available.")
    );
  };

  const openDirections = () => {
    const loc = ticket?.location;
    if (!loc) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>Ticket not found.</Text>
      </View>
    );
  }

  // ✅ Avatar color based on name
  const avatarColors = ["#1AB7BC", "#5856D6", "#FF9500", "#34C759", "#FF2D55"];
  const avatarColor = avatarColors[(customerInfo?.name || "C").charCodeAt(0) % avatarColors.length];
  const initial = (customerInfo?.name || "C").charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ══════════════════════════════
            ✅ 1. CUSTOMER DETAILS FIRST
        ══════════════════════════════ */}
        <View style={styles.customerCard}>
          <Text style={styles.customerCardTitle}>👤 Customer Details</Text>

          {/* Avatar + Name */}
          <View style={styles.customerHeader}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.customerHeaderInfo}>
              <Text style={styles.customerName}>
                {customerInfo?.name || "Unknown Customer"}
              </Text>
              <Text style={styles.customerPhone}>
                📞 {customerInfo?.phone || "Not provided"}
              </Text>
            </View>
          </View>

          {/* Location */}
          {ticket.location ? (
            <View style={styles.locationBox}>
              <Text style={styles.locationLabel}>📍 Customer Location</Text>
              <Text style={styles.locationValue}>
                {ticket.location.latitude.toFixed(5)}, {ticket.location.longitude.toFixed(5)}
              </Text>
            </View>
          ) : null}

          {/* Contact Buttons */}
          <View style={styles.contactRow}>
            {customerInfo?.phone ? (
              <>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${customerInfo.phone}`)}
                >
                  <Text style={styles.callBtnText}>📞 Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => openWhatsApp(customerInfo.phone)}
                >
                  <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {ticket.location ? (
              <TouchableOpacity style={styles.directionsBtn} onPress={openDirections}>
                <Text style={styles.directionsBtnText}>🗺️ Directions</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ══════════════════════════════
            ✅ 2. JOB DETAILS
        ══════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Job Details</Text>
          <InfoRow label="Service Type" value={ticket.serviceType} />
          <InfoRow label="Description" value={ticket.description} />
          <InfoRow label="Created" value={formatTime(ticket.clientCreatedAt)} />
          <InfoRow label="Accepted At" value={formatTime(ticket.acceptedAt)} />

          {/* Ticket ID */}
          <View style={styles.ticketIdBox}>
            <Text style={styles.ticketIdLabel}>Ticket ID</Text>
            <Text style={styles.ticketIdValue}>
              #{ticketId.slice(-8).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════
            ✅ 3. PREVIOUS INSPECTION
        ══════════════════════════════ */}
        {ticket.inspectionUpdatedAt ? (
          <View style={styles.previousBox}>
            <View style={styles.previousHeader}>
              <Text style={styles.previousTitle}>📤 Last Sent to Customer</Text>
              <Text style={styles.previousMeta}>
                {formatTime(ticket.inspectionUpdatedAt)}
              </Text>
            </View>
            <Text style={styles.previousNote}>{ticket.inspectionNote}</Text>
            {ticket.partsList ? (
              <>
                <Text style={styles.partsLabel}>🔩 Parts Required:</Text>
                <Text style={styles.partsText}>{ticket.partsList}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {/* ══════════════════════════════
            ✅ 4. INSPECTION FORM
        ══════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Inspection Update</Text>
          <Text style={styles.sectionSub}>
            Describe your findings — this will be shared with the customer
          </Text>

          <Text style={styles.label}>Inspection Notes *</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe what you found after inspection..."
            placeholderTextColor="#C0C0C0"
            value={inspectionNote}
            onChangeText={setInspectionNote}
            multiline
          />

          <Text style={styles.label}>Required Parts / Components</Text>
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            placeholder="e.g. Capacitor 25uF, Copper pipe 2m..."
            placeholderTextColor="#C0C0C0"
            value={partsList}
            onChangeText={setPartsList}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveInspection}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>📤 Send Inspection to Customer</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════
            ✅ 5. COMPLETE JOB
        ══════════════════════════════ */}
        {ticket.status !== "completed" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Complete Job</Text>
            <View style={styles.completeHintBox}>
              <Text style={styles.completeHintText}>
                ⚠️ Only mark as completed after finishing the service.
                The customer will be asked to rate your service.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.completeBtn, completing && { opacity: 0.6 }]}
              onPress={markCompleted}
              disabled={completing}
              activeOpacity={0.85}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeBtnText}>
                  ✅ Mark Job as Completed
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerEmoji}>🎉</Text>
            <View>
              <Text style={styles.completedBannerTitle}>Job Completed!</Text>
              <Text style={styles.completedBannerSub}>
                Completed on {formatTime(ticket.completedAt)}
              </Text>
            </View>
          </View>
        )}

      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ✅ Customer Card
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D0F0F2",
  },
  customerCardTitle: {
    fontSize: 14, fontWeight: "800",
    color: "#1AB7BC", marginBottom: 14,
  },
  customerHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 12, marginBottom: 14,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  customerHeaderInfo: { flex: 1 },
  customerName: { fontSize: 17, fontWeight: "800", color: "#111" },
  customerPhone: { fontSize: 13, color: "#888", marginTop: 3 },

  locationBox: {
    backgroundColor: "#F5F7FA",
    borderRadius: 12, padding: 12,
    marginBottom: 14,
    borderWidth: 1, borderColor: "#E8E8E8",
  },
  locationLabel: { fontSize: 11, color: "#AAA", fontWeight: "700", marginBottom: 3 },
  locationValue: { fontSize: 13, color: "#555", fontWeight: "600" },

  contactRow: { flexDirection: "row", gap: 8 },
  callBtn: {
    flex: 1, backgroundColor: "#34C759",
    paddingVertical: 11, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  callBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  whatsappBtn: {
    flex: 1, backgroundColor: "#25D366",
    paddingVertical: 11, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  whatsappBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  directionsBtn: {
    flex: 1, backgroundColor: "#1AB7BC",
    paddingVertical: 11, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  directionsBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // ✅ Section
  section: {
    backgroundColor: "#fff", borderRadius: 20,
    padding: 18, marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "800", color: "#111",
    marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: "#F5F7FA",
    paddingBottom: 10,
  },
  sectionSub: {
    fontSize: 12, color: "#AAA",
    marginBottom: 12, marginTop: 4,
  },

  // Info Row
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 9, borderBottomWidth: 1,
    borderBottomColor: "#F5F7FA",
  },
  infoLabel: { fontSize: 14, color: "#888", fontWeight: "600" },
  infoValue: {
    fontSize: 14, color: "#111", fontWeight: "700",
    maxWidth: "60%", textAlign: "right",
  },

  // Ticket ID
  ticketIdBox: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0FFFE",
    borderRadius: 10, padding: 12, marginTop: 10,
    borderWidth: 1, borderColor: "#C3EFF1",
  },
  ticketIdLabel: { fontSize: 13, color: "#888", fontWeight: "600" },
  ticketIdValue: { fontSize: 13, fontWeight: "800", color: "#1AB7BC", letterSpacing: 1 },

  // Previous Inspection
  previousBox: {
    backgroundColor: "#F0FFFE",
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: "#C3EFF1",
    borderLeftWidth: 4, borderLeftColor: "#1AB7BC",
  },
  previousHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  previousTitle: { fontWeight: "800", color: "#1AB7BC", fontSize: 14 },
  previousMeta: { fontSize: 11, color: "#AAA", fontWeight: "600" },
  previousNote: { fontSize: 14, color: "#333", lineHeight: 22 },
  partsLabel: { marginTop: 10, fontWeight: "700", color: "#555", fontSize: 13 },
  partsText: { fontSize: 13, color: "#777", lineHeight: 20, marginTop: 3 },

  // Form
  label: {
    marginTop: 14, marginBottom: 6,
    fontWeight: "700", color: "#444", fontSize: 13,
  },
  input: {
    borderWidth: 1.5, borderColor: "#E0E0E0",
    borderRadius: 14, padding: 14,
    minHeight: 110, textAlignVertical: "top",
    backgroundColor: "#F5F7FA",
    fontSize: 14, color: "#111", lineHeight: 22,
  },

  saveBtn: {
    marginTop: 16, backgroundColor: "#1AB7BC",
    paddingVertical: 15, borderRadius: 14,
    alignItems: "center", elevation: 4,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Complete
  completeHintBox: {
    backgroundColor: "#FFF8E8",
    borderRadius: 12, padding: 12,
    marginBottom: 14,
    borderWidth: 1, borderColor: "#FFE5A0",
  },
  completeHintText: { fontSize: 13, color: "#AA7700", lineHeight: 20 },
  completeBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 15, borderRadius: 14,
    alignItems: "center", elevation: 3,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  completeBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Completed Banner
  completedBanner: {
    backgroundColor: "#fff",
    borderRadius: 18, padding: 20,
    flexDirection: "row", alignItems: "center",
    gap: 14, marginBottom: 16,
    borderWidth: 1.5, borderColor: "#C3F0D0",
    elevation: 3,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8,
    borderLeftWidth: 5, borderLeftColor: "#34C759",
  },
  completedBannerEmoji: { fontSize: 32 },
  completedBannerTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  completedBannerSub: { fontSize: 12, color: "#888", marginTop: 2 },
});