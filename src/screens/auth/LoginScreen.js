import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase";

const { width, height } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Animations
  const logoAnim = useRef(new Animated.Value(-100)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(60)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const circle3 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background circles float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(circle1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(circle2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(circle2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(circle3, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(circle3, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo slide down
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Form slide up
    Animated.parallel([
      Animated.spring(formAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const circle1TranslateY = circle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });
  const circle2TranslateY = circle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });
  const circle3TranslateY = circle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const onPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    } catch (e) {
      Alert.alert("Login Failed", "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

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

          {/* ✅ Animated Background */}
          <View style={styles.bgTop}>
            {/* Floating circles */}
            <Animated.View
              style={[
                styles.circle,
                styles.circle1,
                { transform: [{ translateY: circle1TranslateY }] },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                styles.circle2,
                { transform: [{ translateY: circle2TranslateY }] },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                styles.circle3,
                { transform: [{ translateY: circle3TranslateY }] },
              ]}
            />

            {/* ✅ Logo */}
            <Animated.View
              style={[
                styles.logoBox,
                {
                  transform: [{ translateY: logoAnim }],
                  opacity: logoOpacity,
                },
              ]}
            >
              <View style={styles.logoCircle}>
                <Text style={styles.logoIcon}>{"🔧"}</Text>
              </View>
              <Text style={styles.logoText}>{"Service Bridge"}</Text>
              <Text style={styles.logoSub}>
                {"Your trusted home service partner"}
              </Text>
            </Animated.View>
          </View>

          {/* ✅ Form Card */}
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ translateY: formAnim }],
                opacity: formOpacity,
              },
            ]}
          >
            <Text style={styles.cardTitle}>{"Welcome Back 👋"}</Text>
            <Text style={styles.cardSub}>{"Login to your account"}</Text>

            {/* Email */}
            <View
              style={[
                styles.inputBox,
                focusedField === "email" && styles.inputBoxFocused,
              ]}
            >
              <Text style={styles.inputIcon}>{"📧"}</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
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
            <View
              style={[
                styles.inputBox,
                focusedField === "password" && styles.inputBoxFocused,
              ]}
            >
              <Text style={styles.inputIcon}>{"🔒"}</Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
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

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={loading}
                activeOpacity={1}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? "⏳ Logging in..." : "Login →"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{"OR"}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Signup */}
            <TouchableOpacity
              style={styles.signupBtn}
              onPress={() => navigation.navigate("Signup")}
            >
              <Text style={styles.signupBtnText}>
                {"Don't have an account? "}
                <Text style={styles.signupBtnBold}>{"Sign Up"}</Text>
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

  // Background top
  bgTop: {
    backgroundColor: "#1AB7BC",
    height: height * 0.42,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // Floating circles
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  circle1: {
    width: 200, height: 200,
    top: -60, left: -60,
  },
  circle2: {
    width: 150, height: 150,
    top: 20, right: -40,
  },
  circle3: {
    width: 100, height: 100,
    bottom: -20, left: width * 0.3,
  },

  // Logo
  logoBox: { alignItems: "center" },
  logoCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  logoIcon: { fontSize: 38 },
  logoText: {
    fontSize: 28, fontWeight: "800",
    color: "#fff", letterSpacing: 0.5,
  },
  logoSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 28,
    padding: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  cardTitle: {
    fontSize: 22, fontWeight: "800",
    color: "#111", marginBottom: 4,
  },
  cardSub: { fontSize: 14, color: "#888", marginBottom: 24 },

  // Input
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
  },
  inputBoxFocused: {
    borderColor: "#1AB7BC",
    backgroundColor: "#F0FFFE",
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1, fontSize: 15,
    color: "#111", paddingVertical: 12,
  },
  eyeIcon: { fontSize: 18, padding: 4 },

  // Login Button
  loginBtn: {
    backgroundColor: "#1AB7BC",
    borderRadius: 16,
    padding: 17,
    alignItems: "center",
    marginTop: 6,
    elevation: 4,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loginBtnText: {
    color: "#fff", fontSize: 17,
    fontWeight: "800", letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1, height: 1,
    backgroundColor: "#F0F0F0",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#bbb",
    fontSize: 13,
    fontWeight: "600",
  },

  // Signup
  signupBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  signupBtnText: { fontSize: 14, color: "#888" },
  signupBtnBold: {
    color: "#1AB7BC",
    fontWeight: "800",
  },
});