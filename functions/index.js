const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Notifications disabled: mark incoming notification documents as sent with a note.
exports.sendTicketNotifications = functions.firestore
  .document("notifications/{notifId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();
    if (!notif || notif.sent) return null;
    try {
      await snap.ref.update({
        sent: true,
        error: "Notifications disabled on this build",
        sentAt: Date.now(),
      });
      return null;
    } catch (e) {
      console.error("Notification handler error:", e);
      try { await snap.ref.update({ sent: true, error: e.message, sentAt: Date.now() }); } catch(_){}
      return null;
    }
  });