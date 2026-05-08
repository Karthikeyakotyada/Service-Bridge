import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  Linking, Alert
} from "react-native";
import {
  collection, query, where,
  getDocs, orderBy
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

export default function TechnicianWalletScreen() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalFee, setTotalFee] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);

  useEffect(() => {
    fetchAcceptedJobs();
  }, []);

  const fetchAcceptedJobs = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDocs(
        query(
          collection(db, "tickets"),
          where("technicianId", "==", user.uid),
          where("status", "in", ["accepted", "completed"])
        )
      );

      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.clientCreatedAt || 0) - (a.clientCreatedAt || 0));

      setJobs(list);
      setTotalJobs(list.length);
      setTotalFee(list.length * 50);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const openUPI = () => {
    // Opens any UPI app installed on phone
    const upiUrl = "upi://pay?pa=servicebridge@upi&pn=Service Bridge&cu=INR";
    Linking.canOpenURL(upiUrl).then((supported) => {
      if (supported) {
        Linking.openURL(upiUrl);
      } else {
        Alert.alert(
          "UPI Payment",
          "Please pay ₹50 per ticket via UPI:\n\nUPI ID: servicebridge@upi\n\nOr pay via cash to the platform representative.",
          [{ text: "OK" }]
        );
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5856D6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ✅ Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{"💼 My Fee Summary"}</Text>
        <Text style={styles.headerSub}>
          {"Platform fee: ₹50 per accepted ticket"}
        </Text>
      </View>

      {/* ✅ Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: "#EAF4FF" }]}>
          <Text style={[styles.statNum, { color: "#007AFF" }]}>
            {totalJobs}
          </Text>
          <Text style={styles.statLabel}>{"Jobs Taken"}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#FFF0F0" }]}>
          <Text style={[styles.statNum, { color: "#FF3B30" }]}>
            {"₹" + totalFee}
          </Text>
          <Text style={styles.statLabel}>{"Total Fee Due"}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#E8FAF0" }]}>
          <Text style={[styles.statNum, { color: "#34C759" }]}>
            {"₹50"}
          </Text>
          <Text style={styles.statLabel}>{"Per Ticket"}</Text>
        </View>
      </View>

      {/* ✅ Fee Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{"ℹ️ How Platform Fee Works"}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{"1️⃣"}</Text>
          <Text style={styles.infoText}>
            {"You accept a customer ticket"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{"2️⃣"}</Text>
          <Text style={styles.infoText}>
            {"₹50 platform fee is charged for that ticket"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{"3️⃣"}</Text>
          <Text style={styles.infoText}>
            {"Pay the fee via UPI or cash to platform"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{"4️⃣"}</Text>
          <Text style={styles.infoText}>
            {"You keep 100% of service charge from customer"}
          </Text>
        </View>
      </View>

      {/* ✅ Pay Now Button */}
      {totalFee > 0 && (
        <TouchableOpacity
          style={styles.payBtn}
          onPress={openUPI}
        >
          <Text style={styles.payBtnText}>
            {"💳 Pay ₹" + totalFee + " via UPI"}
          </Text>
        </TouchableOpacity>
      )}

      {/* ✅ Contact Support */}
      <TouchableOpacity
        style={styles.supportBtn}
        onPress={() =>
          Linking.openURL("mailto:support@servicebridge.com?subject=Fee Payment Query")
        }
      >
        <Text style={styles.supportBtnText}>
          {"📧 Contact Support for Payment"}
        </Text>
      </TouchableOpacity>

      {/* ✅ Jobs History */}
      <Text style={styles.sectionTitle}>{"📋 Your Accepted Jobs"}</Text>

      {jobs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>{"📭"}</Text>
          <Text style={styles.emptyText}>{"No jobs accepted yet"}</Text>
          <Text style={styles.emptySub}>
            {"Accept tickets to see your job history here"}
          </Text>
        </View>
      ) : (
        jobs.map((job) => (
          <View key={job.id} style={styles.jobCard}>
            <View style={styles.jobLeft}>
              <View style={[
                styles.jobStatus,
                {
                  backgroundColor:
                    job.status === "completed" ? "#E8FAF0" : "#EAF4FF",
                },
              ]}>
                <Text style={styles.jobStatusIcon}>
                  {job.status === "completed" ? "✅" : "🔧"}
                </Text>
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobService}>{job.serviceType}</Text>
                <Text style={styles.jobDesc} numberOfLines={1}>
                  {job.description}
                </Text>
                <Text style={styles.jobDate}>
                  {job.clientCreatedAt
                    ? new Date(job.clientCreatedAt).toLocaleDateString()
                    : ""}
                </Text>
              </View>
            </View>
            <View style={styles.jobFeeBox}>
              <Text style={styles.jobFee}>{"₹50"}</Text>
              <Text style={styles.jobFeeLabel}>{"fee"}</Text>
            </View>
          </View>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    backgroundColor: "#5856D6",
    padding: 24,
    paddingTop: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  infoIcon: { fontSize: 18 },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },

  // Pay Button
  payBtn: {
    backgroundColor: "#5856D6",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
  },
  payBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Support Button
  supportBtn: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#5856D6",
  },
  supportBtnText: {
    color: "#5856D6",
    fontWeight: "700",
    fontSize: 14,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginHorizontal: 16,
    marginBottom: 12,
  },

  // Empty
  emptyBox: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#333" },
  emptySub: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
  },

  // Job Cards
  jobCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
  },
  jobLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  jobStatus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  jobStatusIcon: { fontSize: 20 },
  jobInfo: { flex: 1 },
  jobService: { fontSize: 14, fontWeight: "800", color: "#111" },
  jobDesc: { fontSize: 12, color: "#666", marginTop: 2 },
  jobDate: { fontSize: 11, color: "#999", marginTop: 3 },
  jobFeeBox: { alignItems: "center" },
  jobFee: { fontSize: 16, fontWeight: "800", color: "#FF3B30" },
  jobFeeLabel: { fontSize: 11, color: "#888", marginTop: 2 },
});