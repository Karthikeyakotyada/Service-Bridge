const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

async function sendExpoPush(to, title, body, data = {}) {
  if (!to) return;

  const message = {
    to,
    sound: "default",
    title,
    body,
    data,
  };

  await axios.post("https://exp.host/--/api/v2/push/send", message, {
    headers: { "Content-Type": "application/json" },
  });
}

exports.sendTicketNotifications = functions.firestore
  .document("notifications/{notifId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();
    const notifId = context.params.notifId;

    try {
      if (!notif || notif.sent) return null;

      const userDoc = await admin.firestore().doc("users/" + notif.customerId).get();

      let expoPushToken = null;
      if (userDoc.exists) {
        const userData = userDoc.data();
        expoPushToken = userData && userData.expoPushToken ? userData.expoPushToken : null;
      }

      if (!expoPushToken) {
        await snap.ref.update({
          sent: true,
          error: "Customer has no expoPushToken",
          sentAt: Date.now(),
        });
        return null;
      }

      let title = "Service Bridge";
      let body = "Update on your ticket";

      if (notif.type === "ticket_accepted") {
        body = "Your ticket has been accepted by a technician.";
      } else if (notif.type === "ticket_completed") {
        body = "Your ticket has been marked as completed.";
      }

      await sendExpoPush(expoPushToken, title, body, {
        type: notif.type,
        ticketId: notif.ticketId,
      });

      await snap.ref.update({ sent: true, sentAt: Date.now() });

      console.log("Notification sent:", notifId);
      return null;
    } catch (e) {
      console.error("Notification error:", e);
      await snap.ref.update({
        sent: true,
        error: e.message,
        sentAt: Date.now(),
      });
      return null;
    }
  });