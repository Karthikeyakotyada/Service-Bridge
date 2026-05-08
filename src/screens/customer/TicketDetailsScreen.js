import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  Linking, TouchableOpacity, TextInput, Alert, Animated,
} from "react-native";
import { doc, onSnapshot, getDoc, updateDoc, runTransaction } from "firebase/firestore";
import * as Location from "expo-location";
import { auth, db } from "../../../firebase";

function StatusBadge({ status }) {
  const color =
    status === "pending"   ? "#FF9500" :
    status === "accepted"  ? "#1AB7BC" :
    status === "completed" ? "#34C759" :
    status === "cancelled" ? "#FF3B30" : "#8E8E93";
  const label =
    status === "pending"   ? "⏳ Waiting for Technician" :
    status === "accepted"  ? "🔧 Technician Assigned"    :
    status === "completed" ? "✅ Completed"               :
    status === "cancelled" ? "❌ Cancelled"               : "Unknown";
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

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

// ✅ FIXED StarButton — separated native and JS animations
function StarButton({ value, selected, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  // ✅ FIX: Use separate Animated.Value for background
  // backgroundColor CANNOT use useNativeDriver: true
  // So we use a plain state for color instead of Animated
  const [isSelected, setIsSelected] = useState(selected);

  useEffect(() => {
    setIsSelected(selected);

    if (selected) {
      // ✅ Scale animation with useNativeDriver: true (safe)
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          useNativeDriver: true, // ✅ only transform uses native
          friction: 4,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
        }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [selected]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* ✅ FIX: Use Animated.View ONLY for scale (native driver) */}
      {/* ✅ FIX: Use plain View style for background color (no native driver) */}
      <Animated.View
        style={[
          styles.starBtn,
          {
            // ✅ Plain style - no animation on backgroundColor
            backgroundColor: selected ? "#1AB7BC" : "#F0F0F0",
            borderColor:     selected ? "#1AB7BC" : "#E0E0E0",
            // ✅ Only transform uses useNativeDriver: true
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[styles.starEmoji, selected && styles.starEmojiSelected]}>
          {value === 0 ? "✕" : "★"}
        </Text>
        <Text style={[styles.starNum, selected && styles.starNumSelected]}>
          {value}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TicketDetailsScreen({ route, navigation }) {
  const ticketId = route?.params?.ticketId;

  const [ticket, setTicket]               = useState(null);
  const [techInfo, setTechInfo]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [editMode, setEditMode]           = useState(false);
  const [editDesc, setEditDesc]           = useState("");
  const [editCoords, setEditCoords]       = useState(null);
  const [saving, setSaving]               = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [selectedStar, setSelectedStar]   = useState(null);
  const [ratingReason, setRatingReason]   = useState("");

  // ✅ Animations — ALL use useNativeDriver: true (only transform/opacity)
  const completionScale   = useRef(new Animated.Value(0.85)).current;
  const completionOpacity = useRef(new Animated.Value(0)).current;
  const ratingCardAnim    = useRef(new Animated.Value(40)).current;
  const ratingCardOpacity = useRef(new Animated.Value(0)).current;
  const previewScale      = useRef(new Animated.Value(0)).current;
  const submitShake       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (ticket?.status === "completed") {
      Animated.parallel([
        Animated.spring(completionScale, {
          toValue: 1, friction: 5, tension: 60,
          useNativeDriver: true, // ✅ transform only
        }),
        Animated.timing(completionOpacity, {
          toValue: 1, duration: 400,
          useNativeDriver: true, // ✅ opacity only
        }),
      ]).start();

      Animated.parallel([
        Animated.spring(ratingCardAnim, {
          toValue: 0, friction: 6, tension: 50,
          delay: 300,
          useNativeDriver: true, // ✅ transform only
        }),
        Animated.timing(ratingCardOpacity, {
          toValue: 1, duration: 500,
          delay: 300,
          useNativeDriver: true, // ✅ opacity only
        }),
      ]).start();
    }
  }, [ticket?.status]);

  useEffect(() => {
    if (selectedStar !== null) {
      Animated.spring(previewScale, {
        toValue: 1, friction: 4, tension: 80,
        useNativeDriver: true, // ✅ transform only
      }).start();
    } else {
      previewScale.setValue(0);
    }
  }, [selectedStar]);

  if (!ticketId) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>Ticket ID missing.</Text>
      </View>
    );
  }

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tickets", ticketId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setTicket(data);
        setEditDesc(data.description || "");
        setEditCoords(data.location || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [ticketId]);

  useEffect(() => {
    if (!ticket?.technicianId) { setTechInfo(null); return; }
    (async () => {
      try {
        const techDoc = await getDoc(doc(db, "users", ticket.technicianId));
        if (techDoc.exists()) setTechInfo(techDoc.data());
      } catch (e) {}
    })();
  }, [ticket?.technicianId]);

  const refreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setEditCoords({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      Alert.alert("Error", "Could not get location.");
    }
  };

  const saveEdits = async () => {
    if (!editDesc.trim()) { Alert.alert("Error", "Description cannot be empty."); return; }
    if (!editCoords)      { Alert.alert("Error", "Location not available.");      return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "tickets", ticketId), {
        description: editDesc.trim(),
        location:    editCoords,
        updatedAt:   Date.now(),
      });
      setEditMode(false);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelTicket = async () => {
    Alert.alert("Cancel Ticket", "Are you sure?", [
      { text: "No" },
      {
        text: "Yes", style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "tickets", ticketId), {
              status:      "cancelled",
              cancelledAt: Date.now(),
            });
            navigation.goBack();
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const shakeSubmit = () => {
    Animated.sequence([
      Animated.timing(submitShake, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(submitShake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(submitShake, { toValue:   8, duration: 60, useNativeDriver: true }),
      Animated.timing(submitShake, { toValue:  -8, duration: 60, useNativeDriver: true }),
      Animated.timing(submitShake, { toValue:   0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const submitRating = async () => {
    const user = auth.currentUser;
    if (!user)                 { Alert.alert("Error", "Not logged in.");           return; }
    if (!ticket?.technicianId) { Alert.alert("Error", "No technician assigned.");  return; }
    if (ticket.customerRating !== undefined && ticket.customerRating !== null) {
      Alert.alert("Already rated", "You already rated this job."); return;
    }
    if (selectedStar === null) {
      shakeSubmit();
      Alert.alert("Select Rating", "Please select a star rating first.");
      return;
    }

    setRatingSubmitting(true);
    try {
      const techRef   = doc(db, "users",   ticket.technicianId);
      const ticketRef = doc(db, "tickets", ticketId);

      await runTransaction(db, async (tx) => {
        const techSnap = await tx.get(techRef);
        if (!techSnap.exists()) throw new Error("Technician not found.");
        const currentAvg   = techSnap.data().ratingAvg   || 0;
        const currentCount = techSnap.data().ratingCount || 0;
        const newCount = currentCount + 1;
        const newAvg   = (currentAvg * currentCount + selectedStar) / newCount;
        tx.update(techRef, {
          ratingAvg:   Number(newAvg.toFixed(2)),
          ratingCount: newCount,
        });
        tx.update(ticketRef, {
          customerRating: selectedStar,
          ratingReason:   ratingReason.trim() || "",
          ratedAt:        Date.now(),
        });
      });

      Alert.alert("Thank you! 🎉", `You rated ${selectedStar} ★`);
      setSelectedStar(null);
      setRatingReason("");
    } catch (e) {
      Alert.alert("Rating Error", e.message);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const openWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() =>
      Alert.alert("Error", "WhatsApp not available.")
    );
  };

  const openTechLocation = () => {
    const loc = ticket?.technicianLocation;
    if (!loc) {
      Alert.alert("Not available", "Technician has not shared location yet.");
      return;
    }
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    );
  };

  const openCustomerLocation = () => {
    const loc = ticket?.location;
    if (!loc) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    );
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1AB7BC" />
    </View>
  );
  if (!ticket) return (
    <View style={styles.center}>
      <Text style={{ color: "#666" }}>Ticket not found.</Text>
    </View>
  );

  const RATING_META = {
    0: { emoji: "😞", label: "Poor",      color: "#FF3B30" },
    1: { emoji: "😕", label: "Bad",       color: "#FF6B35" },
    2: { emoji: "😐", label: "Average",   color: "#FF9500" },
    3: { emoji: "🙂", label: "Good",      color: "#1AB7BC" },
    4: { emoji: "😊", label: "Very Good", color: "#34C759" },
    5: { emoji: "🤩", label: "Excellent", color: "#007AFF" },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBadge status={ticket.status} />

      {/* ── Auto-Cancel ── */}
      {ticket.status === "cancelled" && ticket.cancelReason === "no_technician" ? (
        <View style={styles.autoCancelBox}>
          <Text style={styles.autoCancelIcon}>😔</Text>
          <Text style={styles.autoCancelTitle}>No Technician Available</Text>
          <Text style={styles.autoCancelMsg}>
            All nearby technicians have rejected your request.
            You can contact support or find a nearby shop.
          </Text>
          <TouchableOpacity
            style={styles.findTechBtn}
            onPress={() => navigation.navigate("Support")}
          >
            <Text style={styles.findTechBtnText}>
              🎧 Contact Support for {ticket.serviceType}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.findShopBtn}
            onPress={() => navigation.navigate("NearbyShops")}
          >
            <Text style={styles.findShopBtnText}>
              🛒 Find Spare Parts Shops Nearby
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Service Details ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Service Details</Text>
        <InfoRow label="Service Type" value={ticket.serviceType} />
        {editMode ? (
          <>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              placeholder="Describe your issue..."
              placeholderTextColor="#bbb"
            />
            <Text style={styles.locationText}>
              📍 {editCoords
                ? `${editCoords.latitude.toFixed(4)}, ${editCoords.longitude.toFixed(4)}`
                : "Not set"}
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={refreshLocation}>
              <Text style={styles.secondaryBtnText}>📍 Update Location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveEdits}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "✅ Save Changes"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => setEditMode(false)}
            >
              <Text style={styles.cancelEditText}>Cancel Edit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <InfoRow label="Description" value={ticket.description} />
            <InfoRow
              label="Location"
              value={ticket.location
                ? `${ticket.location.latitude.toFixed(4)}, ${ticket.location.longitude.toFixed(4)}`
                : null}
            />
            <InfoRow label="Created" value={formatTime(ticket.clientCreatedAt)} />
            {ticket.location ? (
              <TouchableOpacity style={styles.mapsBtn} onPress={openCustomerLocation}>
                <Text style={styles.mapsBtnText}>📍 View My Location on Map</Text>
              </TouchableOpacity>
            ) : null}
            {ticket.status === "pending" ? (
              <>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditMode(true)}
                >
                  <Text style={styles.editBtnText}>✏️ Edit Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelTicket}>
                  <Text style={styles.cancelBtnText}>🗑️ Cancel Ticket</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
        )}
      </View>

      {/* ── Technician Info ── */}
      {ticket.technicianId ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🔧 Technician Info</Text>
          <InfoRow label="Name"        value={techInfo?.name  || "Loading..."} />
          <InfoRow label="Phone"       value={techInfo?.phone || "Not provided"} />
          <InfoRow label="Accepted At" value={formatTime(ticket.acceptedAt)} />
          {techInfo?.phone ? (
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${techInfo.phone}`)}
              >
                <Text style={styles.callBtnText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => openWhatsApp(techInfo.phone)}
              >
                <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {ticket.technicianLocation ? (
            <>
              <View style={styles.liveBox}>
                <Text style={styles.liveLabel}>🟢 Technician Live Location</Text>
                <Text style={styles.liveSub}>
                  Updated: {formatTime(ticket.technicianLocation.updatedAt)}
                </Text>
              </View>
              <TouchableOpacity style={styles.mapsBtn} onPress={openTechLocation}>
                <Text style={styles.mapsBtnText}>🗺️ Track Technician on Map</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noLocationBox}>
              <Text style={styles.noLocationText}>
                📍 Waiting for technician to share location...
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.waitingText}>
            ⏳ Waiting for a technician to accept your request...
          </Text>
        </View>
      )}

      {/* ── Inspection Report ── */}
      {ticket.inspectionNote ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Inspection Report</Text>
          <Text style={styles.inspectionNote}>{ticket.inspectionNote}</Text>
          {ticket.partsList ? (
            <>
              <Text style={styles.partsLabel}>🔩 Required Parts:</Text>
              <Text style={styles.partsList}>{ticket.partsList}</Text>
            </>
          ) : null}
          <Text style={styles.inspectionMeta}>
            Updated: {formatTime(ticket.inspectionUpdatedAt)}
          </Text>
        </View>
      ) : null}

      {/* ── Chat Button ── */}
      {(ticket.status === "accepted" || ticket.status === "completed") ? (
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => navigation.navigate("Chat", {
            ticketId:      ticket.id,
            otherUserName: techInfo?.name || "Technician",
          })}
        >
          <Text style={styles.chatBtnText}>💬 Chat with Technician</Text>
        </TouchableOpacity>
      ) : null}

      {/* ══════════════════════════════════════
          ✅ COMPLETION + RATING SECTION
      ══════════════════════════════════════ */}
      {ticket.status === "completed" ? (
        <>
          {/* ✅ Completion Banner */}
          <Animated.View
            style={[
              styles.completionBanner,
              {
                transform: [{ scale: completionScale }],
                opacity:   completionOpacity,
              },
            ]}
          >
            <View style={styles.completionLeft}>
              <Text style={styles.completionEmoji}>✅</Text>
              <View>
                <Text style={styles.completionTitle}>Service Completed!</Text>
                <Text style={styles.completionSub}>
                  {formatTime(ticket.completedAt)}
                </Text>
              </View>
            </View>
            <View style={styles.completionBadge}>
              <Text style={styles.completionBadgeText}>Done</Text>
            </View>
          </Animated.View>

          {/* ── Rating Card ── */}
          <Animated.View
            style={[
              styles.ratingCard,
              {
                transform: [{ translateY: ratingCardAnim }],
                opacity:   ratingCardOpacity,
              },
            ]}
          >
            {ticket.customerRating !== undefined && ticket.customerRating !== null ? (

              // ✅ Already Rated View
              <View style={styles.ratedContainer}>
                <Text style={styles.ratedHeader}>Your Review</Text>
                <View style={[
                  styles.ratedEmojiBox,
                  { backgroundColor: RATING_META[ticket.customerRating]?.color + "18" },
                ]}>
                  <Text style={styles.ratedEmoji}>
                    {RATING_META[ticket.customerRating]?.emoji}
                  </Text>
                  <Text style={[
                    styles.ratedLabel,
                    { color: RATING_META[ticket.customerRating]?.color },
                  ]}>
                    {RATING_META[ticket.customerRating]?.label}
                  </Text>
                </View>
                <View style={styles.ratedStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Text
                      key={s}
                      style={[
                        styles.ratedStar,
                        { color: s <= ticket.customerRating ? "#FFB300" : "#E0E0E0" },
                      ]}
                    >★</Text>
                  ))}
                </View>
                <Text style={styles.ratedScore}>
                  {ticket.customerRating} / 5 Stars
                </Text>
                {ticket.ratingReason ? (
                  <View style={styles.ratedReasonBox}>
                    <Text style={styles.ratedReasonQuote}>"</Text>
                    <Text style={styles.ratedReasonText}>{ticket.ratingReason}</Text>
                    <Text style={styles.ratedReasonQuote}>"</Text>
                  </View>
                ) : null}
              </View>

            ) : (

              // ✅ Rating Input View
              <>
                <Text style={styles.ratingHeader}>⭐ Rate Your Experience</Text>
                <Text style={styles.ratingSubHeader}>
                  How was your service with {techInfo?.name || "the technician"}?
                </Text>

                {/* ✅ Stars Row */}
                <View style={styles.starsRow}>
                  {[0, 1, 2, 3, 4, 5].map((s) => (
                    <StarButton
                      key={s}
                      value={s}
                      selected={selectedStar === s}
                      onPress={() => setSelectedStar(s)}
                      disabled={ratingSubmitting}
                    />
                  ))}
                </View>

                {/* ✅ Preview Box */}
                {selectedStar !== null ? (
                  <Animated.View
                    style={[
                      styles.previewBox,
                      {
                        transform:       [{ scale: previewScale }],
                        borderColor:     RATING_META[selectedStar]?.color + "60",
                        backgroundColor: RATING_META[selectedStar]?.color + "12",
                      },
                    ]}
                  >
                    <Text style={styles.previewEmoji}>
                      {RATING_META[selectedStar]?.emoji}
                    </Text>
                    <View>
                      <Text style={[
                        styles.previewLabel,
                        { color: RATING_META[selectedStar]?.color },
                      ]}>
                        {RATING_META[selectedStar]?.label}
                      </Text>
                      <Text style={styles.previewStars}>
                        {"★".repeat(selectedStar)}{"☆".repeat(5 - selectedStar)}
                      </Text>
                    </View>
                  </Animated.View>
                ) : (
                  <View style={{ height: 12 }} />
                )}

                {/* ── Reason Input ── */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>
                    📝 Share your experience (optional)
                  </Text>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="e.g. Very professional and fixed the issue quickly..."
                    placeholderTextColor="#C0C0C0"
                    value={ratingReason}
                    onChangeText={setRatingReason}
                    multiline
                    maxLength={200}
                  />
                  <Text style={styles.reasonCount}>
                    {ratingReason.length} / 200
                  </Text>
                </View>

                {/* ── Submit Button ── */}
                <Animated.View
                  style={{ transform: [{ translateX: submitShake }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      selectedStar === null && styles.submitBtnDisabled,
                    ]}
                    onPress={submitRating}
                    disabled={ratingSubmitting}
                    activeOpacity={0.85}
                  >
                    {ratingSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {selectedStar === null
                          ? "Select a rating first"
                          : `Submit ${selectedStar}★ Rating`}
                      </Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}
          </Animated.View>
        </>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  badge: {
    alignSelf: "center", paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 16,
    marginBottom: 20, elevation: 4,
  },
  badgeText: {
    color: "#fff", fontSize: 15,
    fontWeight: "800", textAlign: "center",
  },

  section: {
    backgroundColor: "#fff", borderRadius: 20,
    padding: 18, marginBottom: 16, elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "800", color: "#111",
    marginBottom: 12, borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0", paddingBottom: 10,
  },

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

  label:        { marginTop: 10, fontWeight: "700", color: "#444", marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 12,
    padding: 12, minHeight: 90, marginTop: 4,
    textAlignVertical: "top", fontSize: 14,
    color: "#111", backgroundColor: "#F5F7FA",
  },
  locationText: { marginTop: 10, color: "#555", fontSize: 13 },

  editBtn: {
    marginTop: 14, backgroundColor: "#1AB7BC",
    paddingVertical: 13, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  editBtnText:   { color: "#fff", fontWeight: "800", fontSize: 14 },
  cancelBtn: {
    marginTop: 10, backgroundColor: "#FF3B30",
    paddingVertical: 13, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  cancelBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    marginTop: 10, backgroundColor: "#5856D6",
    paddingVertical: 12, borderRadius: 12, alignItems: "center",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "800" },
  saveBtn: {
    marginTop: 12, backgroundColor: "#34C759",
    paddingVertical: 13, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  saveBtnText:    { color: "#fff", fontWeight: "800", fontSize: 14 },
  cancelEditBtn:  { marginTop: 10, alignItems: "center", paddingVertical: 6 },
  cancelEditText: { color: "#1AB7BC", fontWeight: "700", fontSize: 14 },

  contactRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  callBtn: {
    flex: 1, backgroundColor: "#34C759",
    paddingVertical: 13, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  callBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  whatsappBtn: {
    flex: 1, backgroundColor: "#25D366",
    paddingVertical: 13, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  whatsappBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  mapsBtn: {
    marginTop: 12, backgroundColor: "#5856D6",
    paddingVertical: 13, borderRadius: 12,
    alignItems: "center", elevation: 2,
  },
  mapsBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  liveBox: {
    marginTop: 12, backgroundColor: "#E8FAF0",
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#C3F0D0",
  },
  liveLabel: { fontWeight: "800", color: "#34C759", fontSize: 14 },
  liveSub:   { marginTop: 4, fontSize: 12, color: "#555" },
  noLocationBox: {
    marginTop: 12, backgroundColor: "#FFF8E8",
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#FFE0A0",
  },
  noLocationText: { color: "#FF9500", fontWeight: "600", fontSize: 13 },

  inspectionNote: { fontSize: 14, color: "#333", lineHeight: 22 },
  partsLabel:     { marginTop: 12, fontWeight: "700", color: "#333", fontSize: 14 },
  partsList:      { marginTop: 4, fontSize: 14, color: "#555", lineHeight: 22 },
  inspectionMeta: { marginTop: 10, fontSize: 12, color: "#888" },

  chatBtn: {
    backgroundColor: "#1AB7BC", paddingVertical: 15,
    borderRadius: 16, alignItems: "center", marginBottom: 16,
    elevation: 4, shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  chatBtnText:  { color: "#fff", fontWeight: "800", fontSize: 15 },
  waitingText: {
    fontSize: 14, color: "#FF9500",
    fontWeight: "600", textAlign: "center", padding: 8,
  },

  // ── Completion Banner ──
  completionBanner: {
    backgroundColor: "#fff", borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 18,
    marginBottom: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    elevation: 3, shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8,
    borderWidth: 1.5, borderColor: "#C3F0D0",
    borderLeftWidth: 5, borderLeftColor: "#34C759",
  },
  completionLeft: {
    flexDirection: "row", alignItems: "center",
    gap: 12, flex: 1,
  },
  completionEmoji: { fontSize: 28 },
  completionTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  completionSub:   { fontSize: 11, color: "#888", marginTop: 2 },
  completionBadge: {
    backgroundColor: "#E8FAF0", paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: "#C3F0D0",
  },
  completionBadgeText: { color: "#34C759", fontWeight: "800", fontSize: 12 },

  // ── Rating Card ──
  ratingCard: {
    backgroundColor: "#fff", borderRadius: 24,
    padding: 22, marginBottom: 24,
    elevation: 6, shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
    borderWidth: 1.5, borderColor: "#D0F0F2",
  },
  ratingHeader: {
    fontSize: 20, fontWeight: "800",
    color: "#111", textAlign: "center", marginBottom: 4,
  },
  ratingSubHeader: {
    fontSize: 13, color: "#888",
    textAlign: "center", marginBottom: 18, lineHeight: 20,
  },

  // ✅ Star Buttons
  starsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  starBtn: {
    width: 46, height: 54, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5,
    // ✅ No animation on backgroundColor here — handled in component state
  },
  starEmoji:         { fontSize: 18, color: "#999" },
  starEmojiSelected: { color: "#fff" },
  starNum:           { fontSize: 12, color: "#999", fontWeight: "800", marginTop: 2 },
  starNumSelected:   { color: "#fff" },

  // ── Preview ──
  previewBox: {
    flexDirection: "row", alignItems: "center",
    gap: 14, borderRadius: 14, padding: 14,
    borderWidth: 1.5, marginBottom: 16,
  },
  previewEmoji:  { fontSize: 34 },
  previewLabel:  { fontSize: 17, fontWeight: "800" },
  previewStars:  { fontSize: 17, color: "#FFB300", marginTop: 2 },

  // ── Reason ──
  reasonBox: {
    backgroundColor: "#F5F7FA", borderRadius: 16,
    padding: 14, marginBottom: 16,
    borderWidth: 1.5, borderColor: "#E8E8E8",
  },
  reasonLabel: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 8 },
  reasonInput: {
    fontSize: 14, color: "#111",
    minHeight: 75, textAlignVertical: "top", lineHeight: 22,
  },
  reasonCount: {
    fontSize: 11, color: "#C0C0C0",
    textAlign: "right", marginTop: 6,
  },

  // ── Submit ──
  submitBtn: {
    backgroundColor: "#1AB7BC", paddingVertical: 16,
    borderRadius: 16, alignItems: "center",
    elevation: 4, shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#C8C8C8",
    elevation: 0, shadowOpacity: 0,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // ── Already Rated ──
  ratedContainer: { alignItems: "center" },
  ratedHeader:    { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 14 },
  ratedEmojiBox: {
    borderRadius: 20, paddingHorizontal: 28,
    paddingVertical: 16, alignItems: "center", marginBottom: 12,
  },
  ratedEmoji:    { fontSize: 46 },
  ratedLabel:    { fontSize: 17, fontWeight: "800", marginTop: 6 },
  ratedStarsRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  ratedStar:     { fontSize: 26, fontWeight: "800" },
  ratedScore:    { fontSize: 14, fontWeight: "700", color: "#555", marginBottom: 12 },
  ratedReasonBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#F5F7FA", borderRadius: 14,
    padding: 14, borderWidth: 1,
    borderColor: "#E8E8E8", gap: 4,
  },
  ratedReasonQuote: {
    fontSize: 22, color: "#1AB7BC",
    fontWeight: "800", lineHeight: 28,
  },
  ratedReasonText: {
    flex: 1, fontSize: 14, color: "#555",
    fontStyle: "italic", lineHeight: 22, textAlign: "center",
  },

  // ── Auto Cancel ──
  autoCancelBox: {
    backgroundColor: "#FFF3F3", borderRadius: 20,
    padding: 20, marginBottom: 16, alignItems: "center",
    borderWidth: 1, borderColor: "#FFB3B3", elevation: 2,
  },
  autoCancelIcon:  { fontSize: 40 },
  autoCancelTitle: {
    fontSize: 18, fontWeight: "800",
    color: "#FF3B30", marginTop: 8,
  },
  autoCancelMsg: {
    fontSize: 13, color: "#555",
    textAlign: "center", marginTop: 8, lineHeight: 20,
  },
  findTechBtn: {
    marginTop: 14, backgroundColor: "#1AB7BC",
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14, alignItems: "center",
    width: "100%", elevation: 3,
  },
  findTechBtnText: {
    color: "#fff", fontWeight: "800",
    fontSize: 14, textAlign: "center",
  },
  findShopBtn: {
    marginTop: 10, backgroundColor: "#FF9500",
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14, alignItems: "center",
    width: "100%", elevation: 3,
  },
  findShopBtnText: {
    color: "#fff", fontWeight: "800",
    fontSize: 14, textAlign: "center",
  },
});