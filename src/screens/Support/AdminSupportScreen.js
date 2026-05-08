import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";

const ADMIN_EMAIL = "admin@servicebridge.com";

export default function AdminSupportScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const q = query(
      collection(db, "supportTickets"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const allTickets = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setTickets(allTickets);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === "all") return true;
    return t.status === filterStatus;
  });

  const openCount       = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in-progress").length;
  const resolvedCount   = tickets.filter((t) => t.status === "resolved").length;

  const getStatusColor = (status) => {
    switch (status) {
      case "open":        return "#FF9500";
      case "in-progress": return "#007AFF";
      case "resolved":    return "#34C759";
      default:            return "#999";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "open":        return "OPEN";
      case "in-progress": return "IN PROGRESS";
      case "resolved":    return "RESOLVED";
      default:            return (status || "unknown").toUpperCase();
    }
  };

  const sendReply = async (ticketId) => {
    if (!reply.trim()) {
      Alert.alert("Required", "Please type a reply");
      return;
    }
    setSending(true);
    try {
      await updateDoc(doc(db, "supportTickets", ticketId), {
        messages: arrayUnion({
          sender: "admin",
          text: reply.trim(),
          timestamp: Date.now(),
        }),
        adminReply: reply.trim(),
        status:     "in-progress",
        repliedAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      });
      setSelectedTicket((prev) => ({
        ...prev,
        status: "in-progress",
        adminReply: reply.trim(),
        messages: [
          ...(prev.messages || []),
          { sender: "admin", text: reply.trim(), timestamp: Date.now() },
        ],
      }));
      setReply("");
      Alert.alert("✅ Reply Sent!", "The user will see your reply.");
    } catch (e) {
      Alert.alert("Error", "Could not send reply: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const markResolved = async (ticketId) => {
    Alert.alert(
      "Mark as Resolved?",
      "This will close the ticket and notify the user.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve ✅",
          onPress: async () => {
            try {
              const resolvedMsg = {
                sender:    "admin",
                text:      "✅ Your ticket has been resolved. Thank you for contacting Service Bridge Support!",
                timestamp: Date.now(),
              };
              await updateDoc(doc(db, "supportTickets", ticketId), {
                status:    "resolved",
                updatedAt: serverTimestamp(),
                messages:  arrayUnion(resolvedMsg),
              });
              setSelectedTicket(null);
              Alert.alert("✅ Ticket Resolved!");
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  // ════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════
  if (selectedTicket) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedTicket(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Ticket Detail</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>📋 Ticket Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Ticket ID</Text>
              <Text style={styles.infoVal}>
                #{(selectedTicket?.id || "000000").slice(-6).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Subject</Text>
              <Text style={styles.infoVal}>{selectedTicket.subject}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>User Email</Text>
              <Text style={styles.infoVal}>{selectedTicket.userEmail}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Status</Text>
              <View style={[
                styles.statusPill,
                { backgroundColor: getStatusColor(selectedTicket.status) },
              ]}>
                <Text style={styles.statusPillText}>
                  {getStatusLabel(selectedTicket.status)}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Created</Text>
              <Text style={styles.infoVal}>
                {selectedTicket.createdAt?.toDate
                  ? new Date(selectedTicket.createdAt.toDate()).toLocaleString("en-IN", {
                      day: "numeric", month: "short",
                      year: "numeric", hour: "2-digit", minute: "2-digit",
                    })
                  : "Just now"}
              </Text>
            </View>
          </View>

          <Text style={styles.convTitle}>💬 Conversation</Text>

          {(selectedTicket.messages || []).map((msg, index) => (
            <View
              key={index}
              style={[
                styles.msgRow,
                msg.sender === "admin" ? styles.msgRowRight : styles.msgRowLeft,
              ]}
            >
              {msg.sender !== "admin" && (
                <View style={styles.avatarUser}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
              <View style={[
                styles.msgBubble,
                msg.sender === "admin" ? styles.bubbleAdmin : styles.bubbleUser,
              ]}>
                <Text style={styles.msgSenderLabel}>
                  {msg.sender === "admin" ? "👨‍💼 You (Admin)" : "👤 User"}
                </Text>
                <Text style={[
                  styles.msgText,
                  msg.sender === "admin" ? styles.msgTextAdmin : styles.msgTextUser,
                ]}>
                  {msg.text}
                </Text>
                <Text style={[
                  styles.msgTime,
                  msg.sender === "admin" ? styles.msgTimeAdmin : styles.msgTimeUser,
                ]}>
                  {new Date(msg.timestamp).toLocaleTimeString("en-IN", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </Text>
              </View>
              {msg.sender === "admin" && (
                <View style={styles.avatarAdmin}>
                  <Text style={styles.avatarText}>👨‍💼</Text>
                </View>
              )}
            </View>
          ))}

          {selectedTicket.status !== "resolved" ? (
            <View style={styles.replyBox}>
              <Text style={styles.replyBoxTitle}>📝 Reply to User</Text>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your reply here..."
                placeholderTextColor="#bbb"
                value={reply}
                onChangeText={setReply}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{reply.length}/1000</Text>
              <View style={styles.replyBtnRow}>
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => markResolved(selectedTicket.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resolveBtnText}>✅ Mark Resolved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sendReplyBtn,
                    !reply.trim() && styles.sendReplyBtnDisabled,
                  ]}
                  onPress={() => sendReply(selectedTicket.id)}
                  disabled={sending || !reply.trim()}
                  activeOpacity={0.8}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendReplyBtnText}>Send Reply →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.resolvedBanner}>
              <Text style={styles.resolvedBannerText}>✅ This ticket has been resolved</Text>
              <Text style={styles.resolvedBannerSub}>No further action required</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════

  // ✅ Filter tab config — each has its own color + emoji
  const FILTER_TABS = [
    {
      key:   "all",
      label: "All",
      emoji: "📋",
      count: tickets.length,
      color: "#1AB7BC",
    },
    {
      key:   "open",
      label: "Open",
      emoji: "🔓",
      count: openCount,
      color: "#FF9500",
    },
    {
      key:   "in-progress",
      label: "Active",
      emoji: "🔄",
      count: inProgressCount,
      color: "#007AFF",
    },
    {
      key:   "resolved",
      label: "Resolved",
      emoji: "✅",
      count: resolvedCount,
      color: "#34C759",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👨‍💼 Admin Support Panel</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ✅ NEW FILTER TABS — each tab is a card with its own color */}
      <View style={styles.filterTabsWrapper}>
        {FILTER_TABS.map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilterStatus(tab.key)}
              activeOpacity={0.75}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? tab.color : "#fff",
                  borderColor: isActive ? tab.color : "#EBEBEB",
                  // ✅ Active tab gets a bottom accent line in its own color
                  borderBottomWidth: isActive ? 3 : 1,
                  borderBottomColor: isActive ? tab.color : "#EBEBEB",
                },
              ]}
            >
              <Text style={styles.filterTabEmoji}>{tab.emoji}</Text>
              <Text
                style={[
                  styles.filterTabCount,
                  { color: isActive ? "#fff" : tab.color },
                ]}
              >
                {tab.count}
              </Text>
              <Text
                style={[
                  styles.filterTabLabel,
                  { color: isActive ? "#fff" : "#555" },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Ticket List ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1AB7BC" size="large" />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      ) : filteredTickets.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No tickets here!</Text>
          <Text style={styles.emptySub}>
            {filterStatus === "all" ? "No support tickets yet" : `No ${filterStatus} tickets`}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredTickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={[
                styles.ticketCard,
                ticket.status === "open" && styles.ticketCardUrgent,
              ]}
              onPress={() => setSelectedTicket(ticket)}
              activeOpacity={0.7}
              delayPressIn={50}
            >
              <View style={styles.ticketCardHeader}>
                <Text style={styles.ticketCardSubject} numberOfLines={1}>
                  {ticket.subject}
                </Text>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: getStatusColor(ticket.status) },
                ]}>
                  <Text style={styles.statusPillText}>
                    {getStatusLabel(ticket.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketCardEmail}>👤 {ticket.userEmail}</Text>

              <Text style={styles.ticketCardMsg} numberOfLines={2}>
                {ticket.message}
              </Text>

              {ticket.adminReply ? (
                <View style={styles.repliedBadge}>
                  <Text style={styles.repliedBadgeText}>✓ Replied</Text>
                </View>
              ) : (
                ticket.status === "open" && (
                  <View style={styles.needsReplyBadge}>
                    <Text style={styles.needsReplyText}>⚠️ Needs Reply</Text>
                  </View>
                )
              )}

              <View style={styles.ticketCardFooter}>
                <Text style={styles.ticketCardDate}>
                  🕐{" "}
                  {ticket.createdAt?.toDate
                    ? new Date(ticket.createdAt.toDate()).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })
                    : "Just now"}
                </Text>
                <Text style={styles.viewDetailText}>View & Reply →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1AB7BC",
    paddingTop: Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 16,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  backBtn: { width: 60 },
  backText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  headerTitle: {
    flex: 1, fontSize: 16, fontWeight: "800",
    color: "#fff", textAlign: "center",
  },

  // ✅ NEW — Filter tabs row
  filterTabsWrapper: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: "#F5F7FA",
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    gap: 2,
  },
  filterTabEmoji: { fontSize: 18 },
  filterTabCount: { fontSize: 18, fontWeight: "900", lineHeight: 22 },
  filterTabLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  // Ticket card
  ticketCard: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  ticketCardUrgent: { borderLeftWidth: 4, borderLeftColor: "#FF9500" },
  ticketCardHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6, gap: 8,
  },
  ticketCardSubject: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  ticketCardEmail: { fontSize: 12, color: "#888", marginBottom: 6 },
  ticketCardMsg: { fontSize: 13, color: "#555", lineHeight: 20, marginBottom: 8 },
  repliedBadge: {
    alignSelf: "flex-start", backgroundColor: "#E8F8EC",
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, marginBottom: 8,
  },
  repliedBadgeText: { fontSize: 12, color: "#34C759", fontWeight: "700" },
  needsReplyBadge: {
    alignSelf: "flex-start", backgroundColor: "#FFF3E0",
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, marginBottom: 8,
  },
  needsReplyText: { fontSize: 12, color: "#FF9500", fontWeight: "700" },
  ticketCardFooter: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", borderTopWidth: 1,
    borderTopColor: "#f0f0f0", paddingTop: 8, marginTop: 4,
  },
  ticketCardDate: { fontSize: 12, color: "#999" },
  viewDetailText: { fontSize: 13, color: "#1AB7BC", fontWeight: "700" },

  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingBottom: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333" },
  emptySub: { fontSize: 14, color: "#888" },

  infoCard: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 16, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 12 },
  infoRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  infoKey: { fontSize: 13, color: "#888", fontWeight: "600" },
  infoVal: {
    fontSize: 13, color: "#111", fontWeight: "700",
    maxWidth: "60%", textAlign: "right",
  },

  convTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  msgRowRight: { justifyContent: "flex-end" },
  msgRowLeft: { justifyContent: "flex-start" },
  avatarUser: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#007AFF20",
    justifyContent: "center", alignItems: "center",
  },
  avatarAdmin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#1AB7BC20",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 16 },
  msgBubble: { maxWidth: "72%", borderRadius: 16, padding: 12 },
  bubbleUser: {
    backgroundColor: "#fff", borderBottomLeftRadius: 4,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  bubbleAdmin: { backgroundColor: "#1AB7BC", borderBottomRightRadius: 4 },
  msgSenderLabel: { fontSize: 11, fontWeight: "800", color: "#1AB7BC", marginBottom: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: "#111" },
  msgTextAdmin: { color: "#fff" },
  msgTime: { fontSize: 10, marginTop: 4 },
  msgTimeUser: { color: "#bbb" },
  msgTimeAdmin: { color: "rgba(255,255,255,0.7)", textAlign: "right" },

  replyBox: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginTop: 16, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  replyBoxTitle: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 12 },
  replyInput: {
    backgroundColor: "#F5F7FA", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E0E0E0",
    padding: 14, fontSize: 14, color: "#111",
    minHeight: 120, textAlignVertical: "top", lineHeight: 22,
  },
  charCount: { textAlign: "right", fontSize: 12, color: "#bbb", marginTop: 4, marginBottom: 12 },
  replyBtnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  resolveBtn: {
    flex: 1, backgroundColor: "#34C759",
    paddingVertical: 13, borderRadius: 12, alignItems: "center",
  },
  resolveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  sendReplyBtn: {
    flex: 1, backgroundColor: "#1AB7BC",
    paddingVertical: 13, borderRadius: 12, alignItems: "center",
  },
  sendReplyBtnDisabled: { backgroundColor: "#B0C4DE" },
  sendReplyBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  resolvedBanner: {
    backgroundColor: "#E8F8EC", borderRadius: 14,
    padding: 16, marginTop: 16, alignItems: "center",
    borderWidth: 1, borderColor: "#34C75930",
  },
  resolvedBannerText: { fontSize: 15, fontWeight: "800", color: "#34C759" },
  resolvedBannerSub: { fontSize: 13, color: "#888", marginTop: 4 },
});