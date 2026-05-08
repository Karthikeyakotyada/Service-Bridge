import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,           // ✅ REPLACED ALL TouchableOpacity with Pressable
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../firebase";

export default function CreateTicketScreen({ navigation, route }) {
  const {
    serviceType,
    serviceIcon,
    serviceColor,
    serviceBg,
    serviceDesc,
  } = route.params;

  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationAddress, setLocationAddress] = useState("");

  // ✅ KEY FIX: useState instead of useRef so Pressable's disabled prop re-renders
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    getLocation();

    return () => {
      // ✅ Cleanup timeout on unmount
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // ✅ FIX: Scroll start — immediately disable all buttons
  const handleScrollBegin = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    setIsScrolling(true);
  };

  // ✅ FIX: Scroll end — wait 300ms before re-enabling buttons
  const handleScrollEnd = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  };

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed to create a ticket.");
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (address.length > 0) {
          const a = address[0];
          const readable = [a.name, a.street, a.district, a.city]
            .filter(Boolean)
            .join(", ");
          setLocationAddress(readable);
        }
      } catch (e) {}
    } catch (e) {
      Alert.alert("Error", "Could not get location. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  };

  const submitTicket = async () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please describe your issue.");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert("Too short", "Please describe your issue in more detail.");
      return;
    }
    if (!coords) {
      Alert.alert("Location", "Location not available yet. Please wait.");
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      const docRef = await addDoc(collection(db, "tickets"), {
        customerId: user.uid,
        serviceType,
        serviceIcon: serviceIcon || "🔧",
        description: description.trim(),
        status: "pending",
        location: coords,
        locationAddress: locationAddress || "",
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        technicianId: null,
        rejectedBy: [],
      });

      Alert.alert(
        "✅ Ticket Submitted!",
        "Your request has been submitted. A nearby technician will accept it shortly.",
        [
          {
            text: "View Ticket",
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: "CustomerHome" },
                  { name: "TicketDetails", params: { ticketId: docRef.id } },
                ],
              });
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || !coords || !description.trim() || isScrolling;

  return (
    // ✅ FIX: Use SafeAreaView concept with just View — header is FIXED (not in ScrollView)
    <View style={styles.root}>

      {/* ══════════════════════════════════════
          FIXED HEADER — never scrolls
      ══════════════════════════════════════ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 Service Details</Text>
        <Text style={styles.headerSub}>
          Describe your problem so we can help you better
        </Text>
        <View style={styles.stepRow}>
          <View style={styles.stepDone}>
            <Text style={styles.stepDoneText}>✓</Text>
          </View>
          <View style={styles.stepLineDone} />
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>2</Text>
          </View>
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>3</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={styles.stepLabelDone}>Service ✓</Text>
          <Text style={styles.stepLabelActive}>Details</Text>
          <Text style={styles.stepLabelInactive}>Submit</Text>
        </View>
      </View>

      {/* ══════════════════════════════════════
          SCROLLABLE BODY
      ══════════════════════════════════════ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // ✅ These 4 are the most important scroll fix props
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        // ✅ Android-specific fixes
        overScrollMode="never"
        bounces={false}
        decelerationRate="normal"
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >

          {/* ── Selected Service Banner ── */}
          <View style={[styles.selectedBanner, { backgroundColor: serviceBg || "#EAF4FF" }]}>
            <View style={[styles.selectedIconCircle, { backgroundColor: serviceColor || "#007AFF" }]}>
              <Text style={styles.selectedIcon}>{serviceIcon || "🔧"}</Text>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedLabel}>Selected Service</Text>
              <Text style={[styles.selectedTitle, { color: serviceColor || "#007AFF" }]}>
                {serviceType}
              </Text>
              <Text style={styles.selectedSub}>{serviceDesc}</Text>
            </View>

            {/* ✅ Pressable with disabled={isScrolling} */}
            <Pressable
              style={({ pressed }) => [
                styles.changeBtn,
                pressed && !isScrolling && { opacity: 0.6 },
              ]}
              onPress={() => navigation.goBack()}
              disabled={isScrolling}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </Pressable>
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Describe Your Problem</Text>
            <Text style={styles.sectionSub}>
              Be specific so the technician can come prepared
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Example: My AC is making a loud noise and not cooling properly..."
              placeholderTextColor="#bbb"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* ── Location ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Your Location</Text>
            <Text style={styles.sectionSub}>This helps the technician reach you</Text>
            <View style={[
              styles.locationBox,
              {
                borderColor: coords
                  ? "#34C759"
                  : locationLoading
                  ? "#FF9500"
                  : "#FF3B30",
              },
            ]}>
              {locationLoading ? (
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>⏳</Text>
                  <View>
                    <Text style={styles.locationStatus}>Getting your location...</Text>
                    <Text style={styles.locationSub}>Please wait a moment</Text>
                  </View>
                </View>
              ) : coords ? (
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationGot}>Location Captured ✓</Text>
                    {locationAddress ? (
                      <Text style={styles.locationAddress} numberOfLines={2}>
                        {locationAddress}
                      </Text>
                    ) : (
                      <Text style={styles.locationCoords}>
                        {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>❌</Text>
                  <View>
                    <Text style={styles.locationError}>Location unavailable</Text>
                    {/* ✅ Pressable retry with disabled={isScrolling} */}
                    <Pressable
                      onPress={getLocation}
                      disabled={isScrolling}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.retryText}>Tap to retry →</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* ── Submit Button ── */}
          <View style={styles.section}>
            {/* ✅ Pressable submit — disabled during scroll, loading, or missing data */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: serviceColor || "#1AB7BC" },
                isSubmitDisabled && styles.submitBtnDisabled,
                pressed && !isSubmitDisabled && { opacity: 0.85 },
              ]}
              onPress={submitTicket}
              disabled={isSubmitDisabled}
            >
              <Text style={styles.submitBtnText}>
                {loading ? "⏳ Submitting..." : "🚀 Submit Ticket"}
              </Text>
            </Pressable>

            {(!coords || !description.trim()) && (
              <Text style={styles.submitHint}>
                {!coords
                  ? "⏳ Waiting for location..."
                  : "✏️ Please describe your problem first"}
              </Text>
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ Root fills full screen
  root: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  // ✅ Header is position-fixed via being OUTSIDE ScrollView
  header: {
    backgroundColor: "#1AB7BC",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    // ✅ Ensure header stays on top of scroll content
    zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    marginBottom: 16,
  },

  // Step Indicator
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  stepDone: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },
  stepDoneText: { color: "#34C759", fontWeight: "800", fontSize: 14 },
  stepActive: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },
  stepActiveText: { color: "#1AB7BC", fontWeight: "800", fontSize: 14 },
  stepInactive: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  stepInactiveText: { color: "rgba(255,255,255,0.8)", fontWeight: "700", fontSize: 14 },
  stepLineDone: { flex: 1, height: 2, backgroundColor: "#fff", marginHorizontal: 6 },
  stepLineInactive: {
    flex: 1, height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 6,
  },
  stepLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  stepLabelDone: { color: "#fff", fontSize: 12, fontWeight: "800", width: 60 },
  stepLabelActive: { color: "#fff", fontSize: 12, fontWeight: "800", width: 60, textAlign: "center" },
  stepLabelInactive: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600", width: 60, textAlign: "right" },

  // ScrollView
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  // Selected Banner
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    gap: 12,
  },
  selectedIconCircle: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: "center", alignItems: "center",
  },
  selectedIcon: { fontSize: 24 },
  selectedInfo: { flex: 1 },
  selectedLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
  selectedTitle: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  selectedSub: { fontSize: 12, color: "#888", marginTop: 2 },
  changeBtn: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeBtnText: { fontSize: 13, fontWeight: "700", color: "#555" },

  // Section
  section: { paddingHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 4 },
  sectionSub: { fontSize: 12, color: "#888", marginBottom: 10 },

  // Input
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
    fontSize: 15,
    color: "#111",
    lineHeight: 22,
  },
  charCount: { textAlign: "right", fontSize: 12, color: "#bbb", marginTop: 6 },

  // Location
  locationBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  locationIcon: { fontSize: 24 },
  locationStatus: { fontSize: 14, fontWeight: "700", color: "#FF9500" },
  locationSub: { fontSize: 12, color: "#888", marginTop: 3 },
  locationGot: { fontSize: 14, fontWeight: "700", color: "#34C759" },
  locationAddress: { fontSize: 13, color: "#555", marginTop: 3, lineHeight: 18 },
  locationCoords: { fontSize: 12, color: "#888", marginTop: 3 },
  locationError: { fontSize: 14, fontWeight: "700", color: "#FF3B30" },
  retryText: { fontSize: 13, color: "#007AFF", marginTop: 4, fontWeight: "600" },

  // Submit
  submitBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    elevation: 0,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  submitHint: { textAlign: "center", fontSize: 13, color: "#999", marginTop: 10 },
});