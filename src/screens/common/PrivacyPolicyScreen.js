import React from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

      <Text style={styles.title}>{"Privacy Policy"}</Text>
      <Text style={styles.date}>{"Last updated: February 2026"}</Text>

      {[
        {
          title: "1. Information We Collect",
          body: "We collect your name, email, phone number, and location to provide our services. Location is used only to find nearby technicians.",
        },
        {
          title: "2. How We Use Your Data",
          body: "We use your data to connect customers with technicians, process service requests, enable in-app chat, and manage wallet transactions.",
        },
        {
          title: "3. Data Storage",
          body: "All data is stored securely on Google Firebase. We do not sell your personal data to third parties.",
        },
        {
          title: "4. Location Data",
          body: "Location is collected only when the app is in use. It is used ONLY to find nearby technicians and attach location to service requests.",
        },
        {
          title: "5. Third Party Services",
          body: "We use Google Firebase for authentication and database, and Google Maps for location and navigation.",
        },
        {
          title: "6. Your Rights",
          body: "You can access, edit, or delete your account and data at any time from the My Profile screen.",
        },
        {
          title: "7. Account Deletion",
          body: "You can delete your account from My Profile → Delete My Account. All data will be permanently deleted within 30 days.",
        },
        {
          title: "8. Children's Privacy",
          body: "Our service is not directed to children under 18. We do not knowingly collect data from children.",
        },
        {
          title: "9. Contact Us",
          body: "For privacy questions: support@servicebridge.com",
        },
      ].map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 4 },
  date: { fontSize: 13, color: "#888", marginBottom: 20 },
  section: {
    marginBottom: 20,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 6 },
  sectionBody: { fontSize: 14, color: "#444", lineHeight: 22 },
});