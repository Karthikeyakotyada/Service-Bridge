import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";
// expo-notifications removed — notifications handled via dev build or removed

const { width } = Dimensions.get("window");

const HEADER_MAX_HEIGHT = 220;
const HEADER_MIN_HEIGHT = 70;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const MENU_ITEMS = [
  {
    icon: "🛠️",
    title: "Book a Service",
    sub: "AC, Plumbing, Electrical & more",
    screen: "SelectService",
    color: "#1AB7BC",
    lightColor: "#E8FAFA",
  },
  {
    icon: "🎫",
    title: "My Tickets",
    sub: "Track your service requests",
    screen: "MyTickets",
    color: "#007AFF",
    lightColor: "#EAF4FF",
  },
  {
    icon: "💬",
    title: "My Chats",
    sub: "Chat with your technician",
    screen: "ChatList",
    color: "#34C759",
    lightColor: "#E8FAF0",
  },
  {
    icon: "👨‍🔧",
    title: "Support",
    sub: "Contact us for help",
    screen: "Support",
    color: "#5856D6",
    lightColor: "#F0F0FF",
  },
  {
    icon: "🛒",
    title: "Spare Parts & Shops",
    sub: "Find stores near you",
    screen: "NearbyShops",
    color: "#FF9500",
    lightColor: "#FFF8E8",
  },
  {
    icon: "👤",
    title: "My Profile",
    sub: "View & edit your details",
    screen: "CustomerProfile",
    color: "#FF2D55",
    lightColor: "#FFF0F3",
  },
];

// Push notification helpers removed (we removed `expo-notifications`).
// If you want push notifications, use a development build and re-enable these helpers.

function MenuCard({ item, navigation }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ width: "48%", transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => navigation.navigate(item.screen)}
        style={[styles.card, { backgroundColor: item.lightColor }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
        <Text style={styles.cardSub}>{item.sub}</Text>
        <View style={[styles.arrowBadge, { backgroundColor: item.color }]}>
          <Text style={styles.arrowText}>{"›"}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CustomerHomeScreen({ navigation }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [customerName, setCustomerName] = useState("there");
  const [firstLetter, setFirstLetter] = useState("S");

  // ✅ Fetch customer name
  useEffect(() => {
    const init = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch name
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const name = snap.data().name || "there";
          setCustomerName(name);
          setFirstLetter((name || "S").charAt(0).toUpperCase());
        }
      } catch (e) {
        console.log("Init error:", e.message);
      }
    };

    init();
  }, []);

  // Notification response handling removed with `expo-notifications`.
  // Re-add this listener if you re-enable notifications in a development build.

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const miniTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const bannerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -30],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>

      {/* ✅ Collapsing Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>

        {/* Mini Header */}
        <Animated.View style={[styles.miniHeader, { opacity: miniTitleOpacity }]}>
          <Text style={styles.miniTitle}>{"👋 " + customerName}</Text>
          <TouchableOpacity
            style={styles.miniBookBtn}
            onPress={() => navigation.navigate("SelectService")}
          >
            <Text style={styles.miniBookBtnText}>{"+ Book"}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Full Header */}
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: headerContentOpacity,
              transform: [{ translateY: bannerTranslate }],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.hello}>{"Hello 👋"}</Text>
              <Text style={styles.brand}>{customerName}</Text>
            </View>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{firstLetter}</Text>
            </View>
          </View>

          <View style={styles.bannerCard}>
            <View style={styles.bannerLeft}>
              <Text style={styles.bannerTitle}>{"Need a repair?"}</Text>
              <Text style={styles.bannerSub}>{"Fast • Reliable • Affordable"}</Text>
              <TouchableOpacity
                style={styles.bannerBtn}
                onPress={() => navigation.navigate("SelectService")}
              >
                <Text style={styles.bannerBtnText}>{"Book Now →"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bannerEmoji}>{"🔧"}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ✅ Scrollable Content */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={{ height: HEADER_MAX_HEIGHT }} />

        <Text style={styles.sectionTitle}>{"Quick Actions"}</Text>

        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <MenuCard key={item.screen} item={item} navigation={navigation} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => signOut(auth)}
        >
          <Text style={styles.logoutIcon}>{"🚪"}</Text>
          <Text style={styles.logoutText}>{"Logout"}</Text>
        </TouchableOpacity>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    backgroundColor: "#1AB7BC",
    zIndex: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  miniHeader: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: HEADER_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  miniTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  miniBookBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  miniBookBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  hello: { fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  brand: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 2 },
  avatarBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  bannerCard: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16, padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  bannerLeft: { flex: 1 },
  bannerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  bannerSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 },
  bannerBtn: {
    marginTop: 10, backgroundColor: "#fff",
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, alignSelf: "flex-start",
  },
  bannerBtnText: { color: "#1AB7BC", fontWeight: "800", fontSize: 13 },
  bannerEmoji: { fontSize: 48, marginLeft: 10 },
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18, fontWeight: "800",
    color: "#111", marginBottom: 14, marginTop: 16,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", gap: 12,
  },
  card: {
    borderRadius: 20, padding: 16,
    marginBottom: 4, elevation: 2,
    minHeight: 145, position: "relative",
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  icon: { fontSize: 22 },
  cardTitle: { fontSize: 14, fontWeight: "800", lineHeight: 18 },
  cardSub: { fontSize: 11, color: "#888", marginTop: 4, lineHeight: 15 },
  arrowBadge: {
    position: "absolute", bottom: 12, right: 12,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  arrowText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  logoutBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#FFD0D0",
    gap: 8, elevation: 1, marginBottom: 10,
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#FF3B30" },
});