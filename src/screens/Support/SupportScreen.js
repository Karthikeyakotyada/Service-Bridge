import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

// ✅ YOUR CONTACT DETAILS
const SUPPORT_CONTACTS = {
  phone: "+91 7032042390",
  email: "karthikeyakotyada@gmail.com",
  whatsapp: "7032042390",
};

const FAQ_DATA = [
  {
    id: "1",
    question: "How do I create a service ticket?",
    answer:
      "Go to Home → Select a service category → Describe your issue → Submit ticket. A technician will be assigned shortly.",
  },
  {
    id: "2",
    question: "How long does it take to get a technician?",
    answer:
      "Usually within 30-60 minutes depending on your location and technician availability.",
  },
  {
    id: "3",
    question: "How do I track my service request?",
    answer:
      "Go to 'My Tickets' from the home screen to see the status of all your service requests.",
  },
  {
    id: "4",
    question: "Can I cancel a ticket?",
    answer:
      "Yes! You can cancel a ticket before a technician accepts it. Go to My Tickets → Select ticket → Cancel.",
  },
  {
    id: "5",
    question: "How do I rate a technician?",
    answer:
      "After the service is completed, you'll receive a prompt to rate the technician from 1-5 stars.",
  },
  {
    id: "6",
    question: "What if the technician doesn't show up?",
    answer:
      "Please raise a support ticket with details and our team will resolve it within 24 hours.",
  },
  {
    id: "7",
    question: "How is the service charge calculated?",
    answer:
      "Service charges depend on the type of work and technician. You'll get a quote before work begins.",
  },
  {
    id: "8",
    question: "Is my payment secure?",
    answer:
      "Yes! All payments are processed through secure payment gateways with encryption.",
  },
];

export default function SupportScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("contact");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // ✅ Change 1 & 2: Removed orderBy, added manual sort + error handler
    const q = query(
      collection(db, "supportTickets"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const tickets = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // ✅ Sort manually — newest first
        const sorted = tickets.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? (a.clientCreatedAt || 0);
          const bTime = b.createdAt?.seconds ?? (b.clientCreatedAt || 0);
          return bTime - aTime;
        });
        setMyTickets(sorted);
        setLoadingTickets(false);
      },
      (error) => {
        // ✅ Error handler added
        console.log("Support error:", error.message);
        setLoadingTickets(false);
      }
    );

    return () => unsub();
  }, []);

  const openWhatsApp = () => {
    const url = `whatsapp://send?phone=${SUPPORT_CONTACTS.whatsapp}&text=Hi, I need help with Service Bridge app.`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            "WhatsApp not found",
            "Please install WhatsApp or contact us via phone/email."
          );
        }
      })
      .catch(() => Alert.alert("Error", "Could not open WhatsApp"));
  };

  const makeCall = () => {
    const url = `tel:${SUPPORT_CONTACTS.phone.replace(/\s/g, "")}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not make call")
    );
  };

  const sendEmail = () => {
    const url = `mailto:${SUPPORT_CONTACTS.email}?subject=Support Request - Service Bridge&body=Hi Support Team,`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open email app")
    );
  };

  const submitSupportTicket = async () => {
    if (!subject.trim()) {
      Alert.alert("Required", "Please enter a subject");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert("Required", "Please describe your issue in detail");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "supportTickets"), {
        userId: user.uid,
        userEmail: user.email,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
        priority: "normal",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminReply: null,
        repliedAt: null,
        messages: [
          {
            sender: "user",
            text: message.trim(),
            timestamp: Date.now(),
          },
        ],
      });

      Alert.alert(
        "✅ Ticket Submitted!",
        "Our support team will reply within 24 hours. Check 'My Tickets' tab for updates.",
        [{ text: "OK", onPress: () => {
          setSubject("");
          setMessage("");
          setActiveTab("tickets");
        }}]
      );
    } catch (e) {
      Alert.alert("Error", "Failed to submit ticket: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "#FF9500";
      case "in-progress": return "#1AB7BC";
      case "resolved": return "#34C759";
      default: return "#999";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "open": return "⏳ Open";
      case "in-progress": return "🔄 In Progress";
      case "resolved": return "✅ Resolved";
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1AB7BC" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎧 Support Center</Text>
        <Text style={styles.headerSub}>We're here to help you 24/7</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "contact" && styles.tabActive]}
          onPress={() => setActiveTab("contact")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === "contact" && styles.tabTextActive]}>
            📞 Contact
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "faq" && styles.tabActive]}
          onPress={() => setActiveTab("faq")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === "faq" && styles.tabTextActive]}>
            ❓ FAQ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "raise" && styles.tabActive]}
          onPress={() => setActiveTab("raise")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === "raise" && styles.tabTextActive]}>
            🎫 Raise Ticket
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "tickets" && styles.tabActive]}
          onPress={() => setActiveTab("tickets")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === "tickets" && styles.tabTextActive]}>
            📋 My Tickets
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >

        {/* ===== CONTACT TAB ===== */}
        {activeTab === "contact" && (
          <View>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <Text style={styles.sectionSub}>
              Choose your preferred way to contact us
            </Text>

            <TouchableOpacity
              style={[styles.contactCard, { borderLeftColor: "#25D366" }]}
              onPress={openWhatsApp}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconBox, { backgroundColor: "#25D366" }]}>
                <Text style={styles.contactIcon}>💬</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>WhatsApp Support</Text>
                <Text style={styles.contactValue}>+{SUPPORT_CONTACTS.whatsapp}</Text>
                <Text style={styles.contactBadge}>⚡ Fastest Response</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactCard, { borderLeftColor: "#007AFF" }]}
              onPress={makeCall}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconBox, { backgroundColor: "#007AFF" }]}>
                <Text style={styles.contactIcon}>📞</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Call Us</Text>
                <Text style={styles.contactValue}>{SUPPORT_CONTACTS.phone}</Text>
                <Text style={styles.contactBadge}>🕐 Mon-Sat 9AM-6PM</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactCard, { borderLeftColor: "#FF9500" }]}
              onPress={sendEmail}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconBox, { backgroundColor: "#FF9500" }]}>
                <Text style={styles.contactIcon}>📧</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactValue}>{SUPPORT_CONTACTS.email}</Text>
                <Text style={styles.contactBadge}>📬 Reply within 24hrs</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.ctaBox}>
              <Text style={styles.ctaTitle}>🎫 Can't reach us?</Text>
              <Text style={styles.ctaSub}>
                Raise a support ticket and we'll get back to you!
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => setActiveTab("raise")}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Raise a Ticket →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.responseBox}>
              <Text style={styles.responseTitle}>⏱️ Response Times</Text>
              <View style={styles.responseRow}>
                <Text style={styles.responseIcon}>💬</Text>
                <Text style={styles.responseMethod}>WhatsApp</Text>
                <Text style={styles.responseTime}>Within 1 hour</Text>
              </View>
              <View style={styles.responseRow}>
                <Text style={styles.responseIcon}>📞</Text>
                <Text style={styles.responseMethod}>Phone Call</Text>
                <Text style={styles.responseTime}>Immediate</Text>
              </View>
              <View style={styles.responseRow}>
                <Text style={styles.responseIcon}>📧</Text>
                <Text style={styles.responseMethod}>Email</Text>
                <Text style={styles.responseTime}>Within 24 hours</Text>
              </View>
              <View style={styles.responseRow}>
                <Text style={styles.responseIcon}>🎫</Text>
                <Text style={styles.responseMethod}>Support Ticket</Text>
                <Text style={styles.responseTime}>Within 24 hours</Text>
              </View>
            </View>
          </View>
        )}

        {/* ===== FAQ TAB ===== */}
        {activeTab === "faq" && (
          <View>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <Text style={styles.sectionSub}>
              Find quick answers to common questions
            </Text>

            {FAQ_DATA.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqCard}
                onPress={() =>
                  setExpandedFaq(expandedFaq === faq.id ? null : faq.id)
                }
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqArrow}>
                    {expandedFaq === faq.id ? "▲" : "▼"}
                  </Text>
                </View>
                {expandedFaq === faq.id && (
                  <View style={styles.faqAnswerBox}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.ctaBox}>
              <Text style={styles.ctaTitle}>🤔 Still need help?</Text>
              <Text style={styles.ctaSub}>
                Can't find your answer? Contact us directly!
              </Text>
              <View style={styles.ctaButtonRow}>
                <TouchableOpacity
                  style={[styles.ctaButton, { flex: 1, marginRight: 8 }]}
                  onPress={() => setActiveTab("contact")}
                >
                  <Text style={styles.ctaButtonText}>Contact Us</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ctaButton, { flex: 1, backgroundColor: "#34C759" }]}
                  onPress={() => setActiveTab("raise")}
                >
                  <Text style={styles.ctaButtonText}>Raise Ticket</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ===== RAISE TICKET TAB ===== */}
        {activeTab === "raise" && (
          <View>
            <Text style={styles.sectionTitle}>🎫 Raise Support Ticket</Text>
            <Text style={styles.sectionSub}>
              Describe your issue and we'll reply within 24 hours
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Your ticket will be reviewed by our admin team.
                You'll receive a reply in the "My Tickets" tab.
              </Text>
            </View>

            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Technician didn't arrive, Payment issue..."
              placeholderTextColor="#bbb"
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Describe Your Issue *</Text>
            <TextInput
              style={[styles.inputField, styles.textArea]}
              placeholder="Please describe your issue in detail..."
              placeholderTextColor="#bbb"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{message.length}/1000</Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!subject.trim() || !message.trim()) && styles.submitBtnDisabled,
              ]}
              onPress={submitSupportTicket}
              disabled={submitting || !subject.trim() || !message.trim()}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>🚀 Submit Support Ticket</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.submitNote}>
              📬 Our team will reply within 24 hours
            </Text>
          </View>
        )}

        {/* ===== MY TICKETS TAB ===== */}
        {activeTab === "tickets" && (
          <View>
            <Text style={styles.sectionTitle}>📋 My Support Tickets</Text>
            <Text style={styles.sectionSub}>
              Track your support requests and admin replies
            </Text>

            {loadingTickets ? (
              <ActivityIndicator
                color="#1AB7BC"
                size="large"
                style={{ marginTop: 40 }}
              />
            ) : myTickets.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🎫</Text>
                <Text style={styles.emptyTitle}>No tickets yet</Text>
                <Text style={styles.emptySub}>
                  Raise a support ticket if you need help
                </Text>
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => setActiveTab("raise")}
                >
                  <Text style={styles.ctaButtonText}>Raise Ticket →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myTickets.map((ticket) => (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketCard}
                  onPress={() =>
                    navigation.navigate("SupportChat", { ticketId: ticket.id })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>
                      {ticket.subject}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(ticket.status) + "20" },
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(ticket.status) },
                      ]}>
                        {getStatusLabel(ticket.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketPreview} numberOfLines={2}>
                    {ticket.message}
                  </Text>

                  {ticket.adminReply && (
                    <View style={styles.replyPreview}>
                      <Text style={styles.replyLabel}>👨‍💼 Admin replied:</Text>
                      <Text style={styles.replyText} numberOfLines={2}>
                        {ticket.adminReply}
                      </Text>
                    </View>
                  )}

                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketDate}>
                      {ticket.createdAt?.toDate
                        ? new Date(ticket.createdAt.toDate()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Just now"}
                    </Text>
                    <Text style={styles.viewChat}>View Chat →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  header: {
    backgroundColor: "#1AB7BC",
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight + 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tab: {
    flex: 1, paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#1AB7BC" },
  tabText: { fontSize: 11, color: "#999", fontWeight: "600" },
  tabTextActive: { color: "#1AB7BC", fontWeight: "800" },

  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 4, marginTop: 8 },
  sectionSub: { fontSize: 13, color: "#888", marginBottom: 16 },

  contactCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 12, borderLeftWidth: 4,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, gap: 12,
  },
  contactIconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  contactIcon: { fontSize: 22 },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  contactValue: { fontSize: 13, color: "#555", marginTop: 2 },
  contactBadge: { fontSize: 11, color: "#888", marginTop: 4 },
  contactArrow: { fontSize: 24, color: "#ccc", fontWeight: "300" },

  ctaBox: {
    backgroundColor: "#EAF8F8", borderRadius: 16,
    padding: 16, marginTop: 8, marginBottom: 16,
    borderWidth: 1, borderColor: "#1AB7BC30",
  },
  ctaTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 4 },
  ctaSub: { fontSize: 13, color: "#666", marginBottom: 12 },
  ctaButton: {
    backgroundColor: "#1AB7BC", paddingVertical: 12,
    paddingHorizontal: 20, borderRadius: 12, alignItems: "center",
  },
  ctaButtonText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  ctaButtonRow: { flexDirection: "row" },

  responseBox: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 },
  responseTitle: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 12 },
  responseRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0", gap: 10,
  },
  responseIcon: { fontSize: 18, width: 28 },
  responseMethod: { flex: 1, fontSize: 14, color: "#333", fontWeight: "600" },
  responseTime: { fontSize: 13, color: "#1AB7BC", fontWeight: "700" },

  faqCard: {
    backgroundColor: "#fff", borderRadius: 14,
    marginBottom: 10, overflow: "hidden", elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  faqHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
  faqArrow: { fontSize: 12, color: "#1AB7BC", fontWeight: "800" },
  faqAnswerBox: { backgroundColor: "#F0FAFA", padding: 16, borderTopWidth: 1, borderTopColor: "#E0F5F5" },
  faqAnswer: { fontSize: 14, color: "#555", lineHeight: 22 },

  infoBox: {
    flexDirection: "row", backgroundColor: "#FFF9E6",
    borderRadius: 12, padding: 12, marginBottom: 16,
    gap: 10, borderWidth: 1, borderColor: "#FFD70030",
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: "#666", lineHeight: 20 },
  inputLabel: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 6, marginTop: 12 },
  inputField: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E0E0E0",
    padding: 14, fontSize: 14, color: "#111",
  },
  textArea: { minHeight: 140, textAlignVertical: "top", lineHeight: 22 },
  charCount: { textAlign: "right", fontSize: 12, color: "#bbb", marginTop: 4 },
  submitBtn: {
    backgroundColor: "#1AB7BC", padding: 16,
    borderRadius: 14, alignItems: "center",
    marginTop: 20, elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: "#B0C4DE", elevation: 0 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  submitNote: { textAlign: "center", fontSize: 13, color: "#999", marginTop: 10 },

  ticketCard: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  ticketHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 8, gap: 8,
  },
  ticketSubject: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "800" },
  ticketPreview: { fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 8 },
  replyPreview: {
    backgroundColor: "#F0FAFA", borderRadius: 10,
    padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: "#1AB7BC",
  },
  replyLabel: { fontSize: 12, fontWeight: "700", color: "#1AB7BC", marginBottom: 4 },
  replyText: { fontSize: 13, color: "#444", lineHeight: 18 },
  ticketFooter: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", borderTopWidth: 1,
    borderTopColor: "#f0f0f0", paddingTop: 8, marginTop: 4,
  },
  ticketDate: { fontSize: 12, color: "#999" },
  viewChat: { fontSize: 13, color: "#1AB7BC", fontWeight: "700" },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333" },
  emptySub: { fontSize: 14, color: "#888", marginBottom: 16 },
});