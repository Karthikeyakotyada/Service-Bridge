import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  Alert, Linking, ScrollView,
} from "react-native";
import * as Location from "expo-location";

const CATEGORIES = [
  { id: "all", label: "All", icon: "🔍" },
  { id: "ac", label: "AC Parts", icon: "❄️" },
  { id: "electrical", label: "Electrical", icon: "💡" },
  { id: "plumbing", label: "Plumbing", icon: "🚰" },
  { id: "cctv", label: "CCTV", icon: "📹" },
  { id: "tools", label: "Tools", icon: "🔧" },
];

const SEARCH_QUERIES = {
  all: "spare parts shop",
  ac: "AC spare parts shop",
  electrical: "electrical shop",
  plumbing: "plumbing hardware shop",
  cctv: "CCTV camera shop",
  tools: "hardware tools shop",
};

export default function NearbyShopsScreen() {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Location permission needed.");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (e) {
        Alert.alert("Error", "Could not get location.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Open Google Maps with nearby shop search
  const openGoogleMapsSearch = (category) => {
    if (!coords) {
      Alert.alert("Location not ready", "Please wait for location.");
      return;
    }
    const query = encodeURIComponent(SEARCH_QUERIES[category] || "spare parts shop");
    const url = `https://www.google.com/maps/search/${query}/@${coords.latitude},${coords.longitude},14z`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open Google Maps.")
    );
  };

  // ✅ Open Google Maps for specific shop type
  const openNearbySearch = (query) => {
    if (!coords) {
      Alert.alert("Location not ready", "Please wait for location.");
      return;
    }
    const encoded = encodeURIComponent(query);
    const url = `https://www.google.com/maps/search/${encoded}/@${coords.latitude},${coords.longitude},14z`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open Google Maps.")
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>{"Getting your location..."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{"🛒 Spare Parts & Shops"}</Text>
        <Text style={styles.headerSub}>
          {coords
            ? "📍 Location ready — tap to find shops near you"
            : "📍 Getting location..."}
        </Text>
      </View>

      {/* ✅ Category Filter */}
      <Text style={styles.sectionTitle}>{"Browse by Category"}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryBtn,
              selectedCategory === cat.id && styles.categoryBtnActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ✅ Main Search Button */}
      <TouchableOpacity
        style={styles.mainSearchBtn}
        onPress={() => openGoogleMapsSearch(selectedCategory)}
      >
        <Text style={styles.mainSearchIcon}>{"🗺️"}</Text>
        <View style={styles.mainSearchTextBox}>
          <Text style={styles.mainSearchTitle}>
            {"Find " + (CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Shops") + " Near Me"}
          </Text>
          <Text style={styles.mainSearchSub}>
            {"Opens Google Maps with nearby results"}
          </Text>
        </View>
        <Text style={styles.mainSearchArrow}>{"›"}</Text>
      </TouchableOpacity>

      {/* ✅ Quick Search Options */}
      <Text style={styles.sectionTitle}>{"Quick Search"}</Text>

      {[
        { label: "AC Spare Parts", icon: "❄️", query: "AC spare parts shop near me" },
        { label: "Electrical Shop", icon: "💡", query: "electrical shop near me" },
        { label: "Plumbing Store", icon: "🚰", query: "plumbing hardware store near me" },
        { label: "CCTV & Camera Shop", icon: "📹", query: "CCTV camera shop near me" },
        { label: "Hardware & Tools", icon: "🔧", query: "hardware tools shop near me" },
        { label: "Electronics Store", icon: "📱", query: "electronics store near me" },
        { label: "RO Water Filter Parts", icon: "💧", query: "RO water purifier parts shop near me" },
        { label: "Washing Machine Parts", icon: "🧺", query: "washing machine spare parts near me" },
      ].map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.shopCard}
          onPress={() => openNearbySearch(item.query)}
        >
          <View style={styles.shopIconBox}>
            <Text style={styles.shopIcon}>{item.icon}</Text>
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{item.label}</Text>
            <Text style={styles.shopSub}>{"Tap to find on Google Maps"}</Text>
          </View>
          <View style={styles.shopArrow}>
            <Text style={styles.shopArrowText}>{"🗺️"}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* ✅ Open Full Google Maps */}
      <TouchableOpacity
        style={styles.fullMapBtn}
        onPress={() => {
          if (!coords) return;
          const url = `https://www.google.com/maps/@${coords.latitude},${coords.longitude},15z`;
          Linking.openURL(url);
        }}
      >
        <Text style={styles.fullMapBtnText}>
          {"🌍 Open Full Map Near Me"}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },

  header: {
    backgroundColor: "#FF9500",
    padding: 20,
    paddingTop: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 6 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },

  // Category
  categoryRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 6,
    elevation: 1,
  },
  categoryBtnActive: {
    backgroundColor: "#FF9500",
    borderColor: "#FF9500",
  },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: "600", color: "#333" },
  categoryLabelActive: { color: "#fff" },

  // Main Search Button
  mainSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9500",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    gap: 12,
  },
  mainSearchIcon: { fontSize: 28 },
  mainSearchTextBox: { flex: 1 },
  mainSearchTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  mainSearchSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 },
  mainSearchArrow: { fontSize: 24, color: "#fff", fontWeight: "800" },

  // Shop Cards
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
    gap: 12,
  },
  shopIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  shopIcon: { fontSize: 22 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 14, fontWeight: "700", color: "#111" },
  shopSub: { fontSize: 12, color: "#888", marginTop: 2 },
  shopArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  shopArrowText: { fontSize: 18 },

  // Full Map Button
  fullMapBtn: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF9500",
    elevation: 1,
  },
  fullMapBtnText: { fontSize: 15, fontWeight: "800", color: "#FF9500" },
});