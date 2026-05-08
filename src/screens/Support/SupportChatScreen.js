import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

export default function SupportChatScreen({ navigation, route }) {
  // ✅ All hooks at the top — NO conditional returns before hooks
  const ticketId = route?.params?.ticketId || null;

  const [ticket, setTicket]         = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const scrollRef                   = useRef(null);
  const user                        = auth.currentUser;

  useEffect(() => {
    // ✅ Guard inside useEffect — safe
    if (!ticketId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "supportTickets", ticketId),
      (snap) => {
        if (snap.exists()) {
          setTicket({ id: snap.id, ...snap.data() });
        } else {
          setTicket(null);
        }
        setLoading(false);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      },
      (error) => {
        console.log("SupportChat error:", error.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [ticketId]);

  useEffect(() => {
    if (ticket?.messages?.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [ticket?.messages?.length]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }
    setSending(true);
    try {
      await updateDoc(doc(db, "supportTickets", ticketId), {
        messages: arrayUnion({
          sender:    "user",
          text:      newMessage.trim(),
          timestamp: Date.now(),
        }),
        updatedAt: serverTimestamp(),
        status:    ticket?.status === "resolved" ? "open" : (ticket?.status || "open"),
      });
      setNewMessage("");
    } catch (e) {
      Alert.alert("Error", "Could not send message: " + e.message);
    } finally {
      setSending(false);
    }
  };

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
      case "open":        return "⏳ Open";
      case "in-progress": return "🔄 In Progress";
      case "resolved":    return "✅ Resolved";
      default:            return status || "Unknown";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      return new Date(timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  // ✅ All conditional returns AFTER hooks
  if (!ticketId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMsg}>
          Ticket ID is missing. Please go back and try again.
        </Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1AB7BC" size="large" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🎫</Text>
        <Text style={styles.errorTitle}>Ticket Not Found</Text>
        <Text style={styles.errorMsg}>
          This support ticket may have been deleted.
        </Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ticket.subject || "Support Chat"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(ticket.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusLabel(ticket.status)}
              </Text>
            </View>
          </View>

          <View style={{ width: 60 }} />
        </View>

        {/* ── Messages ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              🎫 Ticket #{(ticketId || "").slice(-6).toUpperCase()}
            </Text>
            <Text style={styles.infoBannerSub}>
              {ticket.status === "resolved"
                ? "This ticket is resolved. Send a message to reopen."
                : "Our support team will reply within 24 hours"}
            </Text>
          </View>

          {/* ── Messages List ── */}
          {(!ticket.messages || ticket.messages.length === 0) ? (
            <View style={styles.noMessagesBox}>
              <Text style={styles.noMessagesIcon}>💬</Text>
              <Text style={styles.noMessagesText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            ticket.messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  msg.sender === "user"
                    ? styles.messageRowRight
                    : styles.messageRowLeft,
                ]}
              >
                {msg.sender !== "user" && (
                  <View style={styles.avatarAdmin}>
                    <Text style={styles.avatarText}>👨‍💼</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    msg.sender === "user"
                      ? styles.bubbleUser
                      : styles.bubbleAdmin,
                  ]}
                >
                  {msg.sender !== "user" && (
                    <Text style={styles.adminLabel}>Support Team</Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === "user"
                        ? styles.messageTextUser
                        : styles.messageTextAdmin,
                    ]}
                  >
                    {msg.text || ""}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      msg.sender === "user"
                        ? styles.messageTimeUser
                        : styles.messageTimeAdmin,
                    ]}
                  >
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>

                {msg.sender === "user" && (
                  <View style={styles.avatarUser}>
                    <Text style={styles.avatarText}>👤</Text>
                  </View>
                )}
              </View>
            ))
          )}

          {ticket.status === "resolved" && (
            <View style={styles.resolvedBanner}>
              <Text style={styles.resolvedText}>
                ✅ This ticket has been resolved
              </Text>
              <Text style={styles.resolvedSub}>
                Send a message below if you need further help
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Message Input ── */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type your message..."
            placeholderTextColor="#bbb"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !newMessage.trim() && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: {
    flex: 1, justifyContent: "center",
    alignItems: "center", gap: 12, backgroundColor: "#F5F7FA",
  },
  loadingText: { fontSize: 14, color: "#888" },
  errorContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    padding: 32, backgroundColor: "#F5F7FA", gap: 12,
  },
  errorIcon:  { fontSize: 60, marginBottom: 8 },
  errorTitle: { fontSize: 20, fontWeight: "800", color: "#333" },
  errorMsg:   { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
  errorBtn: {
    marginTop: 16, backgroundColor: "#1AB7BC",
    paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12,
  },
  errorBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1AB7BC",
    paddingTop: Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 14, paddingHorizontal: 12, gap: 8,
    elevation: 4, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  backBtn:      { width: 60 },
  backText:     { color: "#fff", fontSize: 15, fontWeight: "700" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle:  { fontSize: 15, fontWeight: "800", color: "#fff", textAlign: "center" },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText:   { fontSize: 11, fontWeight: "700", color: "#fff" },
  messagesContainer: { flex: 1 },
  infoBanner: {
    backgroundColor: "#EAF8F8", borderRadius: 12, padding: 12,
    marginBottom: 16, alignItems: "center",
    borderWidth: 1, borderColor: "#1AB7BC30",
  },
  infoBannerText: { fontSize: 13, fontWeight: "800", color: "#1AB7BC" },
  infoBannerSub:  { fontSize: 12, color: "#888", marginTop: 2, textAlign: "center" },
  noMessagesBox:  { alignItems: "center", paddingVertical: 40, gap: 12 },
  noMessagesIcon: { fontSize: 48 },
  noMessagesText: { fontSize: 14, color: "#888", textAlign: "center" },
  messageRow: {
    flexDirection: "row", alignItems: "flex-end",
    marginBottom: 12, gap: 8,
  },
  messageRowRight: { justifyContent: "flex-end" },
  messageRowLeft:  { justifyContent: "flex-start" },
  avatarAdmin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#1AB7BC20",
    justifyContent: "center", alignItems: "center",
  },
  avatarUser: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#007AFF20",
    justifyContent: "center", alignItems: "center",
  },
  avatarText:   { fontSize: 16 },
  messageBubble: { maxWidth: "70%", borderRadius: 16, padding: 12 },
  bubbleUser:  { backgroundColor: "#007AFF", borderBottomRightRadius: 4 },
  bubbleAdmin: {
    backgroundColor: "#fff", borderBottomLeftRadius: 4,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  adminLabel:       { fontSize: 11, fontWeight: "800", color: "#1AB7BC", marginBottom: 4 },
  messageText:      { fontSize: 14, lineHeight: 20 },
  messageTextUser:  { color: "#fff" },
  messageTextAdmin: { color: "#111" },
  messageTime:      { fontSize: 10, marginTop: 4 },
  messageTimeUser:  { color: "rgba(255,255,255,0.7)", textAlign: "right" },
  messageTimeAdmin: { color: "#bbb" },
  resolvedBanner: {
    backgroundColor: "#E8F8EC", borderRadius: 12, padding: 12,
    marginTop: 8, alignItems: "center",
    borderWidth: 1, borderColor: "#34C75930",
  },
  resolvedText: { fontSize: 14, fontWeight: "800", color: "#34C759" },
  resolvedSub:  { fontSize: 12, color: "#888", marginTop: 4, textAlign: "center" },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: "#fff", padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    elevation: 8, shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  messageInput: {
    flex: 1, backgroundColor: "#F5F7FA", borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: "#111", maxHeight: 100,
    borderWidth: 1, borderColor: "#E0E0E0",
  },
  sendBtn: {
    backgroundColor: "#1AB7BC", width: 44, height: 44,
    borderRadius: 22, justifyContent: "center", alignItems: "center",
    elevation: 2,
  },
  sendBtnDisabled: { backgroundColor: "#B0C4DE" },
  sendBtnText:     { color: "#fff", fontSize: 18, fontWeight: "800" },
});