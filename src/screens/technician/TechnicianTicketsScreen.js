import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Pressable,
  Linking, Animated,
} from "react-native";
import * as Location from "expo-location";
import {
  collection, onSnapshot, query, where,
  doc, updateDoc, getDoc, runTransaction,
  getDocs, addDoc,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

const HANDLING_FEE = 50;
const RADIUS_KM = 10;

const REJECT_REASONS = [
  "Too far from my location",
  "Currently busy with another job",
  "Outside my service area",
  "Other",
];

// Notifications removed — push helper deleted

function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function countRemainingTechnicians(ticket) {
  try {
    const customerLat = ticket.location?.latitude;
    const customerLon = ticket.location?.longitude;
    const serviceType = ticket.serviceType;
    const rejectedBy = ticket.rejectedBy || [];
    const snap = await getDocs(
      query(
        collection(db, "users"),
        where("userType", "==", "technician"),
        where("specializations", "array-contains", serviceType)
      )
    );
    let remaining = 0;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const techId = docSnap.id;
      if (rejectedBy.includes(techId)) return;
      const offLat = data.officeLocation?.latitude;
      const offLon = data.officeLocation?.longitude;
      if (!offLat || !offLon) return;
      const km = distanceKm(customerLat, customerLon, offLat, offLon);
      if (km !== null && km <= RADIUS_KM) remaining++;
    });
    return remaining;
  } catch (e) {
    return 1;
  }
}

function TicketCard({
  item, index, techCoords, customerInfoMap,
  expandedId, setExpandedId,
  actioningId, acceptTicket, openRejectModal,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300,
        delay: index * 70, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, friction: 7, tension: 60,
        delay: index * 70, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const km = distanceKm(
    techCoords?.latitude, techCoords?.longitude,
    item.location?.latitude, item.location?.longitude
  );
  const alreadyRejected = item.rejectedBy?.includes(auth.currentUser?.uid);
  const customerInfo = customerInfoMap[item.customerId];
  const isExpanded = expandedId === item.id;
  const isActioning = actioningId === item.id;

  const openDirections = () => {
    if (!item.location) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.location.latitude},${item.location.longitude}`;
    Linking.openURL(url);
  };

  const distColor = km == null ? "#888" : km <= 3 ? "#34C759" : km <= 7 ? "#FF9500" : "#FF3B30";

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }}>
      <View style={styles.card}>

        {/* ── Top Row ── */}
        <View style={styles.cardTop}>
          <View style={[styles.serviceIconBox, { backgroundColor: "#E8FAFA" }]}>
            <Text style={styles.serviceIcon}>🔧</Text>
          </View>
          <View style={styles.cardTopInfo}>
            <Text style={styles.serviceType}>{item.serviceType}</Text>
            <Text style={styles.ticketTime}>
              🕐 {item.clientCreatedAt
                ? new Date(item.clientCreatedAt).toLocaleString()
                : ""}
            </Text>
          </View>
          <View style={[styles.distBadge, { backgroundColor: distColor + "18", borderColor: distColor + "40" }]}>
            <Text style={[styles.distText, { color: distColor }]}>
              {km != null ? `${km.toFixed(1)} km` : "? km"}
            </Text>
          </View>
        </View>

        {/* ── Description ── */}
        <Text style={styles.desc} numberOfLines={2}>
          💬 {item.description}
        </Text>

        {/* ── Expand Customer Info ── */}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandBtnText}>
            {isExpanded ? "▲ Hide Customer Info" : "▼ View Customer Info"}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.customerBox}>
            <Text style={styles.customerBoxTitle}>👤 Customer Info</Text>
            <View style={styles.customerRow}>
              <View style={[styles.customerIconBox, { backgroundColor: "#E8FAFA" }]}>
                <Text style={styles.customerRowIcon}>👤</Text>
              </View>
              <View style={styles.customerRowInfo}>
                <Text style={styles.customerRowLabel}>Customer Name</Text>
                <Text style={styles.customerRowValue}>
                  {customerInfo?.name || "Unknown"}
                </Text>
              </View>
            </View>
            <View style={[styles.customerRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.customerIconBox, { backgroundColor: "#FFF0E8" }]}>
                <Text style={styles.customerRowIcon}>📍</Text>
              </View>
              <View style={styles.customerRowInfo}>
                <Text style={styles.customerRowLabel}>Customer Location</Text>
                <Text style={styles.customerRowValue}>
                  {item.location
                    ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                    : "Not available"}
                </Text>
              </View>
            </View>
            {item.location ? (
              <TouchableOpacity style={styles.directionBtn} onPress={openDirections}>
                <Text style={styles.directionBtnText}>🗺️ Get Directions</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={styles.divider} />

        {/* ── Accept / Reject ── */}
        {alreadyRejected ? (
          <View style={styles.rejectedBadge}>
            <Text style={styles.rejectedText}>✕ Already Rejected</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.acceptBtn, isActioning && { opacity: 0.6 }]}
              onPress={() => acceptTicket(item)}
              disabled={isActioning}
              activeOpacity={0.85}
            >
              {isActioning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>
                  ✅ Accept  •  -₹{HANDLING_FEE}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, isActioning && { opacity: 0.6 }]}
              onPress={() => openRejectModal(item)}
              disabled={isActioning}
              activeOpacity={0.85}
            >
              <Text style={styles.rejectBtnText}>✕ Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function TechnicianTicketsScreen() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [customerInfoMap, setCustomerInfoMap] = useState({});
  const [specializations, setSpecializations] = useState([]);
  const [techCoords, setTechCoords] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setSpecializations(snap.data().specializations || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        setTechCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "tickets"), where("status", "==", "pending"));
    const unsub = onSnapshot(q,
      async (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTickets(list);
        setLoading(false);
        const infoMap = {};
        await Promise.all(
          list.map(async (ticket) => {
            if (!ticket.customerId || infoMap[ticket.customerId]) return;
            try {
              const customerSnap = await getDoc(doc(db, "users", ticket.customerId));
              if (customerSnap.exists()) infoMap[ticket.customerId] = customerSnap.data();
            } catch (e) {}
          })
        );
        setCustomerInfoMap(infoMap);
      },
      (err) => { Alert.alert("Error", err.message); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const filteredTickets = useMemo(() => {
    if (!specializations.length) return [];
    const currentUid = auth.currentUser?.uid;
    return tickets.filter((t) =>
      specializations.includes(t.serviceType) &&
      !(t.rejectedBy || []).includes(currentUid)
    );
  }, [tickets, specializations]);

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort(
      (a, b) => (b.clientCreatedAt || 0) - (a.clientCreatedAt || 0)
    );
  }, [filteredTickets]);

  // ✅ acceptTicket with push notification
  const acceptTicket = async (ticket) => {
    const user = auth.currentUser;
    if (!user) return;
    setActioningId(ticket.id);
    try {
      const walletRef = doc(db, "wallets", user.uid);
      const ticketRef = doc(db, "tickets", ticket.id);

      await runTransaction(db, async (tx) => {
        const walletSnap = await tx.get(walletRef);
        const currentBalance = walletSnap.exists() ? walletSnap.data().balance ?? 500 : 500;
        const totalDeducted = walletSnap.exists() ? walletSnap.data().totalDeducted ?? 0 : 0;
        if (currentBalance < HANDLING_FEE) {
          throw new Error(`Insufficient balance. You need ₹${HANDLING_FEE} to accept a ticket.`);
        }
        tx.set(walletRef, {
          balance: Number((currentBalance - HANDLING_FEE).toFixed(2)),
          totalDeducted: Number((totalDeducted + HANDLING_FEE).toFixed(2)),
          updatedAt: Date.now(),
        }, { merge: true });
        tx.update(ticketRef, {
          status: "accepted",
          technicianId: user.uid,
          acceptedAt: Date.now(),
        });
      });

      await addDoc(collection(db, "walletTransactions"), {
        technicianId: user.uid,
        ticketId: ticket.id,
        serviceType: ticket.serviceType,
        description: "Platform handling fee for ticket acceptance",
        amount: HANDLING_FEE,
        type: "debit",
        createdAt: Date.now(),
      });

      // Notifications disabled: skip sending push to customer

      Alert.alert("✅ Ticket Accepted", `₹${HANDLING_FEE} handling fee deducted.`);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setActioningId(null);
    }
  };

  const openRejectModal = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedReason(null);
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedReason) { Alert.alert("Select a reason", "Please select a reason."); return; }
    const user = auth.currentUser;
    if (!user || !selectedTicket) return;
    setRejectModalVisible(false);
    setActioningId(selectedTicket.id);
    try {
      const ticketRef = doc(db, "tickets", selectedTicket.id);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticketData = { id: ticketSnap.id, ...ticketSnap.data() };
      const rejectedBy = ticketData.rejectedBy || [];
      const updatedRejectedBy = [...rejectedBy, user.uid];
      await updateDoc(ticketRef, {
        rejectedBy: updatedRejectedBy,
        lastRejectedAt: Date.now(),
        lastRejectReason: selectedReason,
      });
      const updatedTicket = { ...ticketData, rejectedBy: updatedRejectedBy };
      const remaining = await countRemainingTechnicians(updatedTicket);
      if (remaining === 0) {
        await updateDoc(ticketRef, {
          status: "cancelled", cancelledAt: Date.now(),
          cancelReason: "no_technician",
          cancelMessage: "No technician is available in your area.",
        });
        Alert.alert("Ticket Auto-Cancelled", "All nearby technicians rejected. Customer notified.");
      } else {
        Alert.alert("Rejected", `Ticket rejected. ${remaining} technician(s) still available.`);
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setActioningId(null);
      setSelectedTicket(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
      </View>
    );
  }

  if (!sortedTickets.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Pending Tickets</Text>
        <Text style={styles.emptySub}>
          No tickets available for your specialization right now.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedTickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TicketCard
            item={item}
            index={index}
            techCoords={techCoords}
            customerInfoMap={customerInfoMap}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            actioningId={actioningId}
            acceptTicket={acceptTicket}
            openRejectModal={openRejectModal}
          />
        )}
      />

      {/* ✅ Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Why are you rejecting?</Text>
            <Text style={styles.modalSub}>
              ⚠️ If all nearby technicians reject, the ticket will be auto-cancelled.
            </Text>
            {REJECT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={[
                  styles.reasonBtn,
                  selectedReason === reason && styles.reasonBtnActive,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={styles.reasonRow}>
                  <View style={[
                    styles.reasonRadio,
                    selectedReason === reason && styles.reasonRadioActive,
                  ]}>
                    {selectedReason === reason && (
                      <View style={styles.reasonRadioDot} />
                    )}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextActive,
                  ]}>
                    {reason}
                  </Text>
                </View>
              </Pressable>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmReject}
              >
                <Text style={styles.modalConfirmText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 8 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    elevation: 3, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  serviceIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  serviceIcon: { fontSize: 20 },
  cardTopInfo: { flex: 1 },
  serviceType: { fontSize: 16, fontWeight: "800", color: "#111" },
  ticketTime: { fontSize: 11, color: "#AAA", marginTop: 2, fontWeight: "600" },
  distBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  distText: { fontSize: 12, fontWeight: "800" },
  desc: { fontSize: 13, color: "#555", lineHeight: 20, marginBottom: 10 },
  expandBtn: {
    backgroundColor: "#F0FFFE", borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14,
    alignSelf: "flex-start", borderWidth: 1,
    borderColor: "#C3EFF1", marginBottom: 10,
  },
  expandBtnText: { fontSize: 12, color: "#1AB7BC", fontWeight: "700" },
  customerBox: {
    backgroundColor: "#F5F7FA", borderRadius: 14,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#E8E8E8",
  },
  customerBoxTitle: { fontSize: 13, fontWeight: "800", color: "#1AB7BC", marginBottom: 10 },
  customerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  customerIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  customerRowIcon: { fontSize: 16 },
  customerRowInfo: { flex: 1 },
  customerRowLabel: { fontSize: 11, color: "#AAA", fontWeight: "600" },
  customerRowValue: { fontSize: 14, color: "#111", fontWeight: "700", marginTop: 1 },
  directionBtn: {
    marginTop: 10, backgroundColor: "#1AB7BC",
    paddingVertical: 11, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  directionBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#F5F7FA", marginVertical: 10 },
  actionRow: { flexDirection: "row", gap: 10 },
  acceptBtn: {
    flex: 2, backgroundColor: "#34C759",
    paddingVertical: 13, borderRadius: 14,
    alignItems: "center", elevation: 2,
    shadowColor: "#34C759", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  acceptBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  rejectBtn: {
    flex: 1, backgroundColor: "#FFF0F0",
    paddingVertical: 13, borderRadius: 14,
    alignItems: "center", borderWidth: 1.5, borderColor: "#FF3B30",
  },
  rejectBtnText: { color: "#FF3B30", fontWeight: "800", fontSize: 14 },
  rejectedBadge: { backgroundColor: "#F5F5F5", borderRadius: 10, padding: 10, alignItems: "center" },
  rejectedText: { color: "#AAA", fontWeight: "700", fontSize: 13 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "800", textTransform: "capitalize" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#fff", borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, elevation: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 6 },
  modalSub: {
    fontSize: 13, color: "#FF9500", fontWeight: "600", marginBottom: 18,
    backgroundColor: "#FFF8E8", padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: "#FFE5A0",
  },
  reasonBtn: {
    padding: 14, borderRadius: 12, borderWidth: 1.5,
    borderColor: "#E8E8E8", marginBottom: 8, backgroundColor: "#fff",
  },
  reasonBtnActive: { backgroundColor: "#FFF0F0", borderColor: "#FF3B30" },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reasonRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "#CCC",
    justifyContent: "center", alignItems: "center",
  },
  reasonRadioActive: { borderColor: "#FF3B30" },
  reasonRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF3B30" },
  reasonText: { color: "#333", fontWeight: "600", fontSize: 14, flex: 1 },
  reasonTextActive: { color: "#FF3B30" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1, backgroundColor: "#F5F7FA", padding: 14,
    borderRadius: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#E0E0E0",
  },
  modalCancelText: { fontWeight: "700", color: "#555", fontSize: 14 },
  modalConfirmBtn: {
    flex: 2, backgroundColor: "#FF3B30",
    padding: 14, borderRadius: 14,
    alignItems: "center", elevation: 2,
  },
  modalConfirmText: { fontWeight: "800", color: "#fff", fontSize: 14 },
});