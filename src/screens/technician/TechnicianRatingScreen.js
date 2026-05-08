import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

function StarRow({ rating, size = 18 }) {
  return (
    <Text style={{ fontSize: size, color: "#FFB300", letterSpacing: 2 }}>
      {"★".repeat(rating)}
      <Text style={{ color: "#E0E0E0" }}>{"★".repeat(5 - rating)}</Text>
    </Text>
  );
}

function RatingBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

export default function TechnicianRatingScreen({ navigation }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    avg: 0, total: 0,
    counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 },
  });

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const q = query(
      collection(db, "tickets"),
      where("technicianId", "==", user.uid),
      where("customerRating", "!=", null)
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((t) => t.customerRating !== undefined && t.customerRating !== null)
          .sort((a, b) => (b.ratedAt || 0) - (a.ratedAt || 0));

        setRatings(data);

        if (data.length > 0) {
          const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
          let total = 0;
          data.forEach((t) => {
            const r = t.customerRating;
            if (counts[r] !== undefined) counts[r]++;
            total += r;
          });
          setSummary({
            avg: Number((total / data.length).toFixed(2)),
            total: data.length,
            counts,
          });
        } else {
          setSummary({ avg: 0, total: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 } });
        }

        setLoading(false);
      },
      (error) => {
        console.log("Rating fetch error:", error.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const getRatingLabel = (avg) => {
    if (avg >= 4.5) return { label: "⭐ Excellent",  color: "#007AFF" };
    if (avg >= 3.5) return { label: "👍 Very Good",  color: "#34C759" };
    if (avg >= 2.5) return { label: "🙂 Good",       color: "#1AB7BC" };
    if (avg >= 1.5) return { label: "😐 Average",    color: "#FF9500" };
    if (avg >  0  ) return { label: "😕 Needs Work", color: "#FF3B30" };
    return               { label: "🆕 No Ratings",  color: "#888"    };
  };

  const { label: ratingLabel, color: ratingColor } = getRatingLabel(summary.avg);

  const starColor = (star) => {
    if (star === 5) return "#007AFF";
    if (star === 4) return "#34C759";
    if (star === 3) return "#1AB7BC";
    if (star === 2) return "#FF9500";
    return "#FF3B30";
  };

  const ratingEmoji = (r) => {
    const map = { 0: "😞", 1: "😕", 2: "😐", 3: "🙂", 4: "😊", 5: "🤩" };
    return map[r] || "⭐";
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch (e) { return ""; }
  };

  return (
    <View style={styles.container}>

      {/* ✅ StatusBar — teal */}
      <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

      {/* ✅ Header — teal */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⭐ My Ratings</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          {/* ✅ Loader — teal */}
          <ActivityIndicator color="#1AB7BC" size="large" />
          <Text style={styles.loadingText}>Loading ratings...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.scoreBig}>
                <Text style={[styles.scoreNumber, { color: ratingColor }]}>
                  {summary.avg > 0 ? summary.avg : "—"}
                </Text>
                <Text style={styles.scoreOutOf}>/5</Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={[styles.labelBadge, { backgroundColor: ratingColor + "18" }]}>
                  <Text style={[styles.labelBadgeText, { color: ratingColor }]}>
                    {ratingLabel}
                  </Text>
                </View>
                <Text style={styles.totalReviews}>
                  {summary.total} {summary.total === 1 ? "review" : "reviews"}
                </Text>
                {summary.total > 0 && (
                  <Text style={{ fontSize: 22, marginTop: 4, letterSpacing: 2 }}>
                    {"★".repeat(Math.round(summary.avg))}
                    <Text style={{ color: "#E0E0E0" }}>
                      {"★".repeat(5 - Math.round(summary.avg))}
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            {summary.total > 0 && (
              <View style={styles.barsSection}>
                <View style={styles.barsDivider} />
                {[5, 4, 3, 2, 1].map((s) => (
                  <RatingBar
                    key={s}
                    label={`${s}★`}
                    count={summary.counts[s] || 0}
                    total={summary.total}
                    color={starColor(s)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Reviews */}
          <Text style={styles.sectionTitle}>
            📋 Customer Reviews ({summary.total})
          </Text>

          {ratings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyTitle}>No ratings yet</Text>
              <Text style={styles.emptySub}>
                Complete jobs to receive ratings from customers
              </Text>
            </View>
          ) : (
            ratings.map((ticket) => (
              <View key={ticket.id} style={styles.reviewCard}>

                <View style={styles.reviewHeader}>
                  <View style={[
                    styles.avatar,
                    { backgroundColor: starColor(ticket.customerRating) + "20" },
                  ]}>
                    <Text style={styles.avatarEmoji}>
                      {ratingEmoji(ticket.customerRating)}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewService}>
                      🔧 {ticket.serviceType || "Service"}
                    </Text>
                    <StarRow rating={ticket.customerRating} size={16} />
                  </View>
                  <View style={[
                    styles.scoreBadge,
                    { backgroundColor: starColor(ticket.customerRating) },
                  ]}>
                    <Text style={styles.scoreBadgeText}>
                      {ticket.customerRating}★
                    </Text>
                  </View>
                </View>

                {ticket.ratingReason ? (
                  <View style={styles.commentBox}>
                    <Text style={styles.commentQuote}>"</Text>
                    <Text style={styles.commentText}>{ticket.ratingReason}</Text>
                    <Text style={styles.commentQuote}>"</Text>
                  </View>
                ) : (
                  <Text style={styles.noComment}>No comment left</Text>
                )}

                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewDate}>📅 {formatDate(ticket.ratedAt)}</Text>
                  <View style={[
                    styles.ratingPill,
                    { backgroundColor: starColor(ticket.customerRating) + "15" },
                  ]}>
                    <Text style={[
                      styles.ratingPillText,
                      { color: starColor(ticket.customerRating) },
                    ]}>
                      {ticket.customerRating === 5 ? "Excellent" :
                       ticket.customerRating === 4 ? "Very Good" :
                       ticket.customerRating === 3 ? "Good"      :
                       ticket.customerRating === 2 ? "Average"   :
                       ticket.customerRating === 1 ? "Bad"       : "Poor"}
                    </Text>
                  </View>
                </View>

              </View>
            ))
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // ✅ Header — changed to #1AB7BC teal
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1AB7BC",           // ✅ was #5856D6
    paddingTop: Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: "#1AB7BC",               // ✅ was #5856D6
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backBtn: { width: 60 },
  backText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", textAlign: "center" },

  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },

  // ✅ Summary card shadow — changed to teal
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 24, padding: 20, marginBottom: 20,
    elevation: 4,
    shadowColor: "#1AB7BC",               // ✅ was #5856D6
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#D0F5F5",               // ✅ was #EFEFFF
  },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 20 },
  scoreBig: { flexDirection: "row", alignItems: "flex-end" },
  scoreNumber: { fontSize: 56, fontWeight: "900", lineHeight: 60 },
  scoreOutOf: { fontSize: 18, color: "#888", fontWeight: "700", marginBottom: 8 },
  summaryRight: { flex: 1 },
  labelBadge: {
    alignSelf: "flex-start", paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 20, marginBottom: 6,
  },
  labelBadgeText: { fontSize: 13, fontWeight: "800" },
  totalReviews: { fontSize: 13, color: "#888", fontWeight: "600" },

  barsSection: { marginTop: 16 },
  barsDivider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 14 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  barLabel: { width: 28, fontSize: 12, fontWeight: "700", color: "#555", textAlign: "right" },
  barTrack: { flex: 1, height: 8, backgroundColor: "#F0F0F0", borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  barCount: { width: 20, fontSize: 12, color: "#888", fontWeight: "600", textAlign: "right" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 12 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333" },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },

  reviewCard: {
    backgroundColor: "#fff", borderRadius: 18,
    padding: 16, marginBottom: 12, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  avatarEmoji: { fontSize: 24 },
  reviewMeta: { flex: 1 },
  reviewService: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 4 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  scoreBadgeText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  // ✅ Comment box border — changed to teal
  commentBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#F0FFFE",           // ✅ was #F8F8FF
    borderRadius: 12, padding: 12, marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#1AB7BC",           // ✅ was #5856D6
    gap: 4,
  },
  commentQuote: {
    fontSize: 20,
    color: "#1AB7BC",                     // ✅ was #5856D6
    fontWeight: "800", lineHeight: 24,
  },
  commentText: { flex: 1, fontSize: 14, color: "#444", fontStyle: "italic", lineHeight: 22 },
  noComment: { fontSize: 13, color: "#bbb", fontStyle: "italic", marginBottom: 10 },

  reviewFooter: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", borderTopWidth: 1,
    borderTopColor: "#F5F5F5", paddingTop: 8, marginTop: 4,
  },
  reviewDate: { fontSize: 12, color: "#999" },
  ratingPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  ratingPillText: { fontSize: 11, fontWeight: "800" },
});