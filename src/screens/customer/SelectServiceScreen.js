import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const SERVICES = [
  { id: "Plumbing", icon: "🚰", desc: "Leaks, pipes, water issues", color: "#007AFF", bg: "#EAF4FF" },
  { id: "Electrical", icon: "💡", desc: "Wiring, outlets, repairs", color: "#FF9500", bg: "#FFF8E8" },
  { id: "AC Repair", icon: "❄️", desc: "Repair & maintenance", color: "#5856D6", bg: "#F0F0FF" },
  { id: "Carpentry", icon: "🪚", desc: "Furniture & woodwork", color: "#FF6B35", bg: "#FFF0EB" },
  { id: "Cleaning", icon: "🧹", desc: "House & office cleaning", color: "#34C759", bg: "#E8FAF0" },
  { id: "CCTV Installation", icon: "📹", desc: "Camera setup & repair", color: "#5856D6", bg: "#F0F0FF" },
  { id: "Internet / WiFi", icon: "📶", desc: "Router & network setup", color: "#007AFF", bg: "#EAF4FF" },
  { id: "RO Water Service", icon: "💧", desc: "Filter & purifier service", color: "#1AB7BC", bg: "#E8FAFA" },
  { id: "Appliance Repair", icon: "🧺", desc: "Fridge, TV, washing machine", color: "#FF2D55", bg: "#FFF0F3" },
  { id: "Others", icon: "✨", desc: "Other service needs", color: "#FF9500", bg: "#FFF8E8" },
];

function ServiceCard({ item, onPress, index }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        width: "48%",
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => onPress(item)}
        style={[styles.card, { backgroundColor: item.bg }]}
      >
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>

        {/* Text */}
        <Text style={[styles.cardTitle, { color: item.color }]}>
          {item.id}
        </Text>
        <Text style={styles.cardSub}>{item.desc}</Text>

        {/* Arrow */}
        <View style={[styles.arrowBadge, { backgroundColor: item.color }]}>
          <Text style={styles.arrowText}>{"›"}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SelectServiceScreen({ navigation }) {
  const handleSelect = (item) => {
    navigation.navigate("CreateTicket", {
      serviceType: item.id,
      serviceIcon: item.icon,
      serviceColor: item.color,
      serviceBg: item.bg,
      serviceDesc: item.desc,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{"🛠️ Book a Service"}</Text>
        <Text style={styles.headerSub}>
          {"Select the type of service you need"}
        </Text>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>{"1"}</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>{"2"}</Text>
          </View>
          <View style={styles.stepLineInactive} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>{"3"}</Text>
          </View>
        </View>

        <View style={styles.stepLabels}>
          <Text style={styles.stepLabelActive}>{"Service"}</Text>
          <Text style={styles.stepLabelInactive}>{"Details"}</Text>
          <Text style={styles.stepLabelInactive}>{"Submit"}</Text>
        </View>
      </View>

      {/* Service Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
        scrollEnabled={true}
      >
        <Text style={styles.hint}>
          {"👆 Tap a service to continue"}
        </Text>

        <View style={styles.grid}>
          {SERVICES.map((item, index) => (
            <ServiceCard
              key={item.id}
              item={item}
              index={index}
              onPress={handleSelect}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // Header
  header: {
    backgroundColor: "#1AB7BC",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 6,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    marginBottom: 16,
  },

  // Step Indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  stepActive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActiveText: { color: "#1AB7BC", fontWeight: "800", fontSize: 14 },
  stepInactive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepInactiveText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    fontSize: 14,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#fff",
    marginHorizontal: 6,
  },
  stepLineInactive: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 6,
  },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepLabelActive: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    width: 60,
  },
  stepLabelInactive: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    width: 60,
    textAlign: "center",
  },

  // Grid
  scrollContainer: { padding: 16, paddingBottom: 40 },
  hint: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginBottom: 14,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  // Card
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 4,
    elevation: 2,
    minHeight: 140,
    position: "relative",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  icon: { fontSize: 24 },
  cardTitle: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
  cardSub: { fontSize: 11, color: "#888", marginTop: 4, lineHeight: 15 },
  arrowBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});