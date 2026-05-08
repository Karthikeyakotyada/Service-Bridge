import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width, height } = Dimensions.get("window");

const USER_TYPES = [
  { id: "customer", label: "Customer", icon: "👤", desc: "I need services" },
  { id: "technician", label: "Technician", icon: "🔧", desc: "I provide services" },
];

const SPECIALIZATIONS = [
  { id: "Plumbing", icon: "🚰", color: "#007AFF", bg: "#EAF4FF" },
  { id: "Electrical", icon: "💡", color: "#FF9500", bg: "#FFF8E8" },
  { id: "AC Repair", icon: "❄️", color: "#5856D6", bg: "#F0F0FF" },
  { id: "Carpentry", icon: "🪚", color: "#FF6B35", bg: "#FFF0EB" },
  { id: "Cleaning", icon: "🧹", color: "#34C759", bg: "#E8FAF0" },
  { id: "CCTV Installation", icon: "📹", color: "#5856D6", bg: "#F0F0FF" },
  { id: "Internet / WiFi", icon: "📶", color: "#007AFF", bg: "#EAF4FF" },
  { id: "RO Water Service", icon: "💧", color: "#1AB7BC", bg: "#E8FAFA" },
  { id: "Appliance Repair", icon: "🧺", color: "#FF2D55", bg: "#FFF0F3" },
  { id: "Others", icon: "✨", color: "#FF9500", bg: "#FFF8E8" },
];

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState("customer");
  const [specializations, setSpecializations] = useState([]);
  const [experience, setExperience] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [step, setStep] = useState(1);

  // Animations
  const headerAnim = useRef(new Animated.Value(-80)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating circles
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle1, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(circle1, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(circle2, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(circle2, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();

    // Header
    Animated.parallel([
      Animated.spring(headerAnim, {
        toValue: 0, tension: 50,
        friction: 8, delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1, duration: 600,
        delay: 200, useNativeDriver: true,
      }),
    ]).start();

    // Card
    Animated.parallel([
      Animated.spring(cardAnim, {
        toValue: 0, tension: 50,
        friction: 8, delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 600,
        delay: 400, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate step transition
  const animateNextStep = (direction = "next") => {
    const startX = direction === "next" ? 60 : -60;
    stepSlide.setValue(startX);
    Animated.spring(stepSlide, {
      toValue: 0,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const circle1Y = circle1.interpolate({
    inputRange: [0, 1], outputRange: [0, -18],
  });
  const circle2Y = circle2.interpolate({
    inputRange: [0, 1], outputRange: [0, 14],
  });

  const onPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95, useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1, friction: 3, useNativeDriver: true,
    }).start();
  };

  // Toggle specialization
  const toggleSpecialization = (id) => {
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const goToStep2 = () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert("Required", "Please enter a valid 10-digit phone number.");
      return;
    }
    animateNextStep("next");
    setStep(2);
  };

  const goToStep3 = () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your email.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    animateNextStep("next");
    setStep(3);
  };

  const goBack = (toStep) => {
    animateNextStep("back");
    setStep(toStep);
  };

  const handleSignup = async () => {
    if (userType === "technician" && specializations.length === 0) {
      Alert.alert(
        "Required",
        "Please select at least one specialization."
      );
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth, email.trim(), password
      );
      await setDoc(doc(db, "users", cred.user.uid), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        userType,
        specializations: userType === "technician" ? specializations : [],
        experience: userType === "technician" ? experience.trim() : "",
        createdAt: serverTimestamp(),
        isBlocked: false,
        location: null,
      });
    } catch (e) {
      Alert.alert(
        "Signup Failed",
        e.code === "auth/email-already-in-use"
          ? "This email is already registered. Please login."
          : e.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Total steps depend on userType
  const totalSteps = userType === "technician" ? 3 : 2;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

          {/* ✅ Animated Header */}
          <View style={styles.bgTop}>
            <Animated.View
              style={[
                styles.circle, styles.circle1,
                { transform: [{ translateY: circle1Y }] },
              ]}
            />
            <Animated.View
              style={[
                styles.circle, styles.circle2,
                { transform: [{ translateY: circle2Y }] },
              ]}
            />
            <Animated.View
              style={[
                styles.headerContent,
                {
                  transform: [{ translateY: headerAnim }],
                  opacity: headerOpacity,
                },
              ]}
            >
              <View style={styles.logoCircle}>
                <Text style={styles.logoIcon}>{"✨"}</Text>
              </View>
              <Text style={styles.headerTitle}>{"Create Account"}</Text>
              <Text style={styles.headerSub}>{"Join Service Bridge today"}</Text>
            </Animated.View>
          </View>

          {/* ✅ Card */}
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ translateY: cardAnim }],
                opacity: cardOpacity,
              },
            ]}
          >

            {/* ✅ Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={styles.stepRow}>
                {[1, 2, ...(userType === "technician" ? [3] : [])].map(
                  (s, i, arr) => (
                    <React.Fragment key={s}>
                      <View
                        style={[
                          styles.stepDot,
                          {
                            backgroundColor:
                              step >= s ? "#1AB7BC" : "#eee",
                          },
                        ]}
                      >
                        {step > s ? (
                          <Text style={styles.stepDotText}>{"✓"}</Text>
                        ) : (
                          <Text
                            style={[
                              styles.stepDotText,
                              { color: step >= s ? "#fff" : "#bbb" },
                            ]}
                          >
                            {s}
                          </Text>
                        )}
                      </View>
                      {i < arr.length - 1 && (
                        <View
                          style={[
                            styles.stepConnector,
                            {
                              backgroundColor:
                                step > s ? "#1AB7BC" : "#eee",
                            },
                          ]}
                        />
                      )}
                    </React.Fragment>
                  )
                )}
              </View>
              <View style={styles.stepTextRow}>
                <Text style={[
                  styles.stepText,
                  { color: step >= 1 ? "#1AB7BC" : "#bbb" },
                ]}>
                  {"Personal"}
                </Text>
                <Text style={[
                  styles.stepText,
                  { color: step >= 2 ? "#1AB7BC" : "#bbb" },
                ]}>
                  {"Account"}
                </Text>
                {userType === "technician" && (
                  <Text style={[
                    styles.stepText,
                    { color: step >= 3 ? "#1AB7BC" : "#bbb" },
                  ]}>
                    {"Skills"}
                  </Text>
                )}
              </View>
            </View>

            {/* ======================== */}
            {/* ✅ STEP 1 — Personal Info */}
            {/* ======================== */}
            {step === 1 && (
              <Animated.View
                style={{ transform: [{ translateX: stepSlide }] }}
              >
                {/* User Type */}
                <Text style={styles.fieldLabel}>{"I am a..."}</Text>
                <View style={styles.typeRow}>
                  {USER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeCard,
                        userType === type.id && styles.typeCardActive,
                      ]}
                      onPress={() => {
                        setUserType(type.id);
                        setSpecializations([]);
                      }}
                    >
                      <Text style={styles.typeIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.typeLabel,
                        userType === type.id && styles.typeLabelActive,
                      ]}>
                        {type.label}
                      </Text>
                      <Text style={[
                        styles.typeDesc,
                        userType === type.id && styles.typeDescActive,
                      ]}>
                        {type.desc}
                      </Text>
                      {userType === type.id && (
                        <View style={styles.typeCheck}>
                          <Text style={styles.typeCheckText}>{"✓"}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Name */}
                <Text style={styles.fieldLabel}>{"Full Name"}</Text>
                <View style={[
                  styles.inputBox,
                  focusedField === "name" && styles.inputBoxFocused,
                ]}>
                  <Text style={styles.inputIcon}>{"👤"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#bbb"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Phone */}
                <Text style={styles.fieldLabel}>{"Phone Number"}</Text>
                <View style={[
                  styles.inputBox,
                  focusedField === "phone" && styles.inputBoxFocused,
                ]}>
                  <Text style={styles.inputIcon}>{"📱"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit phone number"
                    placeholderTextColor="#bbb"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                  />
                  {phone.length === 10 && (
                    <Text style={{ fontSize: 16 }}>{"✅"}</Text>
                  )}
                </View>

                {/* Next Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={goToStep2}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    activeOpacity={1}
                  >
                    <Text style={styles.nextBtnText}>
                      {"Next →"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            )}

            {/* ========================= */}
            {/* ✅ STEP 2 — Account Setup */}
            {/* ========================= */}
            {step === 2 && (
              <Animated.View
                style={{ transform: [{ translateX: stepSlide }] }}
              >
                {/* Email */}
                <Text style={styles.fieldLabel}>{"Email Address"}</Text>
                <View style={[
                  styles.inputBox,
                  focusedField === "email" && styles.inputBoxFocused,
                ]}>
                  <Text style={styles.inputIcon}>{"📧"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#bbb"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Password */}
                <Text style={styles.fieldLabel}>{"Password"}</Text>
                <View style={[
                  styles.inputBox,
                  focusedField === "password" && styles.inputBoxFocused,
                ]}>
                  <Text style={styles.inputIcon}>{"🔒"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor="#bbb"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeIcon}>
                      {showPassword ? "🙈" : "👁️"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text style={styles.fieldLabel}>{"Confirm Password"}</Text>
                <View style={[
                  styles.inputBox,
                  focusedField === "confirm" && styles.inputBoxFocused,
                  confirmPassword && password !== confirmPassword
                    ? styles.inputBoxError : null,
                ]}>
                  <Text style={styles.inputIcon}>{"🔑"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#bbb"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                  />
                  {confirmPassword.length > 0 && (
                    <Text style={{ fontSize: 16 }}>
                      {password === confirmPassword ? "✅" : "❌"}
                    </Text>
                  )}
                </View>

                {/* Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => goBack(1)}
                  >
                    <Text style={styles.backBtnText}>{"← Back"}</Text>
                  </TouchableOpacity>

                  <Animated.View
                    style={{ flex: 1, transform: [{ scale: buttonScale }] }}
                  >
                    <TouchableOpacity
                      style={styles.nextBtn}
                      onPress={
                        userType === "technician" ? goToStep3 : handleSignup
                      }
                      onPressIn={onPressIn}
                      onPressOut={onPressOut}
                      disabled={loading}
                      activeOpacity={1}
                    >
                      <Text style={styles.nextBtnText}>
                        {userType === "technician"
                          ? "Next →"
                          : loading
                          ? "⏳ Creating..."
                          : "Create Account ✓"}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </Animated.View>
            )}

            {/* ================================= */}
            {/* ✅ STEP 3 — Technician Skills Only */}
            {/* ================================= */}
            {step === 3 && userType === "technician" && (
              <Animated.View
                style={{ transform: [{ translateX: stepSlide }] }}
              >
                {/* Header */}
                <View style={styles.skillHeader}>
                  <Text style={styles.skillTitle}>
                    {"🔧 Your Specializations"}
                  </Text>
                  <Text style={styles.skillSub}>
                    {"Select all services you can provide"}
                  </Text>
                </View>

                {/* Selected count */}
                <View style={styles.selectedCountBox}>
                  <Text style={styles.selectedCountText}>
                    {specializations.length === 0
                      ? "No specialization selected"
                      : specializations.length + " selected ✓"}
                  </Text>
                </View>

                {/* Specialization Grid */}
                <View style={styles.specGrid}>
                  {SPECIALIZATIONS.map((spec) => {
                    const isSelected = specializations.includes(spec.id);
                    return (
                      <TouchableOpacity
                        key={spec.id}
                        style={[
                          styles.specCard,
                          {
                            backgroundColor: isSelected
                              ? spec.bg
                              : "#F5F7FA",
                            borderColor: isSelected
                              ? spec.color
                              : "#eee",
                          },
                        ]}
                        onPress={() => toggleSpecialization(spec.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.specIcon}>{spec.icon}</Text>
                        <Text
                          style={[
                            styles.specLabel,
                            { color: isSelected ? spec.color : "#555" },
                          ]}
                          numberOfLines={2}
                        >
                          {spec.id}
                        </Text>
                        {isSelected && (
                          <View
                            style={[
                              styles.specCheck,
                              { backgroundColor: spec.color },
                            ]}
                          >
                            <Text style={styles.specCheckText}>{"✓"}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Experience */}
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                  {"Years of Experience (Optional)"}
                </Text>
                <View style={[
                  styles.inputBox,
                  focusedField === "experience" && styles.inputBoxFocused,
                ]}>
                  <Text style={styles.inputIcon}>{"⭐"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 3 years"
                    placeholderTextColor="#bbb"
                    value={experience}
                    onChangeText={setExperience}
                    onFocus={() => setFocusedField("experience")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                {/* Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => goBack(2)}
                  >
                    <Text style={styles.backBtnText}>{"← Back"}</Text>
                  </TouchableOpacity>

                  <Animated.View
                    style={{
                      flex: 1,
                      transform: [{ scale: buttonScale }],
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.nextBtn,
                        loading && { opacity: 0.7 },
                        specializations.length === 0 && { opacity: 0.5 },
                      ]}
                      onPress={handleSignup}
                      onPressIn={onPressIn}
                      onPressOut={onPressOut}
                      disabled={loading || specializations.length === 0}
                      activeOpacity={1}
                    >
                      <Text style={styles.nextBtnText}>
                        {loading ? "⏳ Creating..." : "Create Account ✓"}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                {specializations.length === 0 && (
                  <Text style={styles.specHint}>
                    {"⚠️ Please select at least one specialization"}
                  </Text>
                )}
              </Animated.View>
            )}

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginLinkText}>
                {"Already have an account? "}
                <Text style={styles.loginLinkBold}>{"Login"}</Text>
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  bgTop: {
    backgroundColor: "#1AB7BC",
    height: height * 0.30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  circle1: { width: 220, height: 220, top: -80, left: -60 },
  circle2: { width: 160, height: 160, bottom: -40, right: -30 },

  headerContent: { alignItems: "center" },
  logoCircle: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 10,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  logoIcon: { fontSize: 30 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  // Card
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 28,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    marginBottom: 30,
  },

  // Step Indicator
  stepIndicator: { marginBottom: 18 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  stepDotText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepConnector: {
    flex: 1, height: 3,
    marginHorizontal: 6, borderRadius: 2,
  },
  stepTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepText: { fontSize: 12, fontWeight: "700" },

  // User Type
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  typeCard: {
    flex: 1, backgroundColor: "#F5F7FA",
    borderRadius: 16, padding: 14,
    alignItems: "center", borderWidth: 2,
    borderColor: "#eee", position: "relative",
  },
  typeCardActive: { borderColor: "#1AB7BC", backgroundColor: "#F0FFFE" },
  typeIcon: { fontSize: 28, marginBottom: 6 },
  typeLabel: { fontSize: 14, fontWeight: "800", color: "#333" },
  typeLabelActive: { color: "#1AB7BC" },
  typeDesc: { fontSize: 11, color: "#999", marginTop: 3 },
  typeDescActive: { color: "#1AB7BC" },
  typeCheck: {
    position: "absolute", top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#1AB7BC",
    justifyContent: "center", alignItems: "center",
  },
  typeCheckText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  // Field
  fieldLabel: {
    fontSize: 13, fontWeight: "700",
    color: "#555", marginBottom: 6, marginTop: 4,
  },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 4, marginBottom: 12,
    borderWidth: 1.5, borderColor: "#F0F0F0",
  },
  inputBoxFocused: {
    borderColor: "#1AB7BC", backgroundColor: "#F0FFFE",
  },
  inputBoxError: {
    borderColor: "#FF3B30", backgroundColor: "#FFF5F5",
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1, fontSize: 15,
    color: "#111", paddingVertical: 12,
  },
  eyeIcon: { fontSize: 18, padding: 4 },

  // Buttons
  nextBtn: {
    backgroundColor: "#1AB7BC",
    borderRadius: 16, padding: 16,
    alignItems: "center", elevation: 4,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  backBtn: {
    backgroundColor: "#F5F7FA",
    borderRadius: 16, padding: 16,
    alignItems: "center", borderWidth: 1,
    borderColor: "#eee", paddingHorizontal: 20,
  },
  backBtnText: { color: "#555", fontSize: 15, fontWeight: "700" },

  // ✅ Specialization
  skillHeader: { marginBottom: 10 },
  skillTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  skillSub: { fontSize: 13, color: "#888", marginTop: 4 },

  selectedCountBox: {
    backgroundColor: "#F0FFFE",
    borderRadius: 10, padding: 10,
    marginBottom: 12, alignItems: "center",
    borderWidth: 1, borderColor: "#1AB7BC",
  },
  selectedCountText: {
    fontSize: 13, fontWeight: "700", color: "#1AB7BC",
  },

  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  specCard: {
    width: "48%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    position: "relative",
  },
  specIcon: { fontSize: 26, marginBottom: 6 },
  specLabel: {
    fontSize: 12, fontWeight: "700",
    textAlign: "center", lineHeight: 16,
  },
  specCheck: {
    position: "absolute", top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  specCheckText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  specHint: {
    textAlign: "center", fontSize: 13,
    color: "#FF9500", marginTop: 8, fontWeight: "600",
  },

  // Login link
  loginLink: {
    alignItems: "center", marginTop: 20,
    paddingTop: 16, borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  loginLinkText: { fontSize: 14, color: "#888" },
  loginLinkBold: { color: "#1AB7BC", fontWeight: "800" },
});