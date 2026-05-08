import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { doc, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");

const HEADER_MAX = 150;
const HEADER_MIN = 56;
const SCROLL_DIST = HEADER_MAX - HEADER_MIN;

function Stars({ value }) {
  const rounded = Math.round(value || 0);
  return (
    <Text style={styles.stars}>
      {"★".repeat(rounded)}{"☆".repeat(5 - rounded)}
    </Text>
  );
}

function AnimatedCard({ item, index, navigation }) {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0, duration: 400,
        delay: index * 80, useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 400,
        delay: index * 80, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();

  return (
    <Animated.View style={[
      styles.cardWrapper,
      { opacity, transform: [{ translateY }, { scale }] }
    ]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => navigation.navigate(item.screen)}
        style={[styles.card, { borderTopColor: item.color }]}
      >
        <View style={[styles.cardIconBox, { backgroundColor: item.color + "20" }]}>
          <Text style={styles.cardIcon}>{item.icon}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.label}</Text>
        <Text style={styles.cardSub}>{item.desc}</Text>
        <View style={[styles.arrowBox, { backgroundColor: item.color }]}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedCounter({ value, decimals = 2 }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState("0.00");

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value, duration: 1200, useNativeDriver: false,
    }).start();
    const listener = animVal.addListener(({ value: v }) =>
      setDisplay(v.toFixed(decimals))
    );
    return () => animVal.removeListener(listener);
  }, [value]);

  return <Text style={styles.ratingValue}>{display} / 5</Text>;
}

export default function TechnicianHomeScreen({ navigation }) {
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [techName, setTechName] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;
  const ratingScale = useRef(new Animated.Value(0.8)).current;
  const ratingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRatingAvg(data.ratingAvg || 0);
        setRatingCount(data.ratingCount || 0);
        setTechName(data.name || "");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ratingScale, {
        toValue: 1, friction: 5, delay: 300, useNativeDriver: true,
      }),
      Animated.timing(ratingOpacity, {
        toValue: 1, duration: 400, delay: 300, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ✅ Header slides up as user scrolls
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DIST],
    outputRange: [0, -SCROLL_DIST],
    extrapolate: "clamp",
  });

  const greetingOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DIST * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const subOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DIST * 0.35],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // ✅ "Service Bridge" fades in as header collapses
  const titleOpacity = scrollY.interpolate({
    inputRange: [SCROLL_DIST * 0.5, SCROLL_DIST],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, SCROLL_DIST],
    outputRange: [1, 0.85],
    extrapolate: "clamp",
  });

  const actions = [
    { label: "Pending Tickets", desc: "Browse & accept new jobs",  screen: "TechnicianTickets",  color: "#34C759", icon: "🔧" },
    { label: "Accepted Jobs",   desc: "View jobs you accepted",    screen: "TechnicianMyJobs",   color: "#5856D6", icon: "📋" },
    { label: "Completed Jobs",  desc: "View your job history",     screen: "TechnicianCompleted",color: "#007AFF", icon: "✅" },
    { label: "My Profile",      desc: "Update location & info",    screen: "TechnicianProfile",  color: "#FF9500", icon: "👤" },
    { label: "Support",         desc: "Get help & raise tickets",  screen: "Support",            color: "#1AB7BC", icon: "🎧" },
    { label: "My Chats",        desc: "Chat with customers",       screen: "ChatList",           color: "#00C7BE", icon: "💬" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

      {/* ✅ Collapsing Header */}
      <Animated.View style={[
        styles.header,
        { transform: [{ translateY: headerTranslateY }] }
      ]}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        {/* ── Always visible collapsed row ── */}
        <View style={styles.collapsedRow}>
          {/* "Service Bridge" fades in when collapsed */}
          <Animated.Text style={[styles.collapsedTitle, { opacity: titleOpacity }]}>
            Service Bridge
          </Animated.Text>
          {/* Avatar */}
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => navigation.navigate("TechnicianProfile")}
            >
              <Text style={styles.avatarText}>
                {techName ? techName.charAt(0).toUpperCase() : "T"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Expanded greeting — fades out ── */}
        <Animated.View style={[styles.expandedContent, { opacity: greetingOpacity }]}>
          <Text style={styles.helloSmall}>Welcome back 👋</Text>
          <Text style={styles.hello}>{techName || "Technician"}</Text>
        </Animated.View>

        {/* ── Sub text — fades out ── */}
        <Animated.Text style={[styles.subText, { opacity: subOpacity }]}>
          Manage your jobs & earnings
        </Animated.Text>
      </Animated.View>

      {/* ✅ Scroll View */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: HEADER_MAX + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={1}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >

        {/* ✅ Clickable Animated Rating Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("TechnicianRating")}
        >
          <Animated.View style={[
            styles.ratingCard,
            { transform: [{ scale: ratingScale }], opacity: ratingOpacity }
          ]}>
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <Stars value={ratingAvg} />
              <Text style={styles.ratingReviews}>{ratingCount} reviews</Text>
            </View>
            <View style={styles.ratingRight}>
              <AnimatedCounter value={ratingAvg} />
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>
                  {ratingAvg >= 4.5 ? "⭐ Top Rated" :
                   ratingAvg >= 3.5 ? "👍 Good"      :
                   ratingAvg >= 2   ? "📈 Growing"   : "🆕 New"}
                </Text>
              </View>
              {/* ✅ Tap hint */}
              <Text style={styles.tapHint}>Tap to see reviews →</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.grid}>
          {actions.map((item, index) => (
            <AnimatedCard
              key={item.screen}
              item={item}
              index={index}
              navigation={navigation}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => signOut(auth).catch((e) => console.warn(e))}
        >
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // ✅ Header
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: HEADER_MAX,
    backgroundColor: "#1AB7BC",
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    elevation: 10,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },

  circle1: {
    position: "absolute", width: 200, height: 200,
    borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)",
    top: -60, right: -50,
  },
  circle2: {
    position: "absolute", width: 130, height: 130,
    borderRadius: 65, backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -30, left: 10,
  },
  circle3: {
    position: "absolute", width: 80, height: 80,
    borderRadius: 40, backgroundColor: "rgba(255,255,255,0.07)",
    top: 20, left: width * 0.42,
  },

  // Collapsed row
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  collapsedTitle: {
    fontSize: 20, fontWeight: "800",
    color: "#fff", letterSpacing: 0.3,
  },

  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  expandedContent: {
    position: "absolute",
    bottom: 46, left: 20,
  },
  helloSmall: {
    fontSize: 13, color: "rgba(255,255,255,0.85)",
    fontWeight: "500", marginBottom: 2,
  },
  hello: { fontSize: 22, fontWeight: "800", color: "#fff" },

  subText: {
    fontSize: 13, color: "rgba(255,255,255,0.75)",
    position: "absolute",
    bottom: 16, left: 20,
  },

  scrollContainer: { padding: 16, paddingBottom: 40 },

  // ✅ Rating Card
  ratingCard: {
    backgroundColor: "#fff", borderRadius: 20,
    padding: 20, marginBottom: 24,
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", elevation: 4,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12,
    borderWidth: 1, borderColor: "#D0F5F5",
  },
  ratingLeft: { flex: 1 },
  ratingLabel: { fontSize: 13, fontWeight: "700", color: "#888" },
  stars: { fontSize: 24, color: "#FFB300", marginTop: 6, letterSpacing: 3 },
  ratingReviews: { marginTop: 4, fontSize: 12, color: "#aaa" },
  ratingRight: { alignItems: "flex-end" },
  ratingValue: { fontSize: 28, fontWeight: "800", color: "#1AB7BC" },
  ratingBadge: {
    marginTop: 6, backgroundColor: "#E8FAFA",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  ratingBadgeText: { fontSize: 11, color: "#1AB7BC", fontWeight: "700" },

  // ✅ Tap hint
  tapHint: {
    fontSize: 10, color: "#A0D4D6",
    marginTop: 6, fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 18, fontWeight: "800",
    color: "#111", marginBottom: 12,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cardWrapper: { width: "48%", marginBottom: 16 },
  card: {
    backgroundColor: "#fff", borderRadius: 20,
    padding: 18, borderTopWidth: 4, elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  cardSub: { marginTop: 4, fontSize: 12, color: "#888", lineHeight: 16 },
  arrowBox: {
    marginTop: 12, alignSelf: "flex-end",
    width: 28, height: 28, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  arrowText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  logoutButton: {
    marginTop: 8, backgroundColor: "#fff",
    padding: 16, borderRadius: 16, alignItems: "center",
    borderWidth: 1.5, borderColor: "#FF3B30", elevation: 1,
  },
  logoutText: { color: "#FF3B30", fontSize: 15, fontWeight: "700" },
});