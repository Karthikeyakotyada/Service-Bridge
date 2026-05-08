import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator
} from "react-native";
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

export default function ChatScreen({ route }) {
  const { ticketId, otherUserName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, "chats", ticketId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [ticketId]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // ✅ Clear immediately before sending
    setText("");
    inputRef.current?.clear();

    setSending(true);
    try {
      await addDoc(collection(db, "chats", ticketId, "messages"), {
        text: trimmed,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
        readBy: [currentUser.uid],
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log(e);
      // ✅ Restore text if send failed
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >

      {/* ✅ Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item, index }) => {
          const isMine = item.senderId === currentUser.uid;
          const prevMsg = messages[index - 1];

          const showDate =
            !prevMsg ||
            new Date(item.createdAt?.toDate()).toDateString() !==
            new Date(prevMsg.createdAt?.toDate()).toDateString();

          // ✅ Group bubbles — hide tail if same sender as next
          const nextMsg = messages[index + 1];
          const isLastInGroup =
            !nextMsg || nextMsg.senderId !== item.senderId;

          return (
            <>
              {/* Date Separator */}
              {showDate && (
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>
                    {item.createdAt?.toDate().toDateString() || ""}
                  </Text>
                </View>
              )}

              <View style={[
                styles.bubbleRow,
                isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
                !isLastInGroup && { marginBottom: 2 },
              ]}>
                <View style={[
                  styles.bubble,
                  isMine ? styles.bubbleMine : styles.bubbleOther,
                  // ✅ Rounded tail only on last in group
                  isMine && isLastInGroup && styles.bubbleMineLastTail,
                  !isMine && isLastInGroup && styles.bubbleOtherLastTail,
                ]}>
                  <Text style={[
                    styles.bubbleText,
                    isMine ? styles.bubbleTextMine : styles.bubbleTextOther,
                  ]}>
                    {item.text}
                  </Text>
                  <Text style={[
                    styles.bubbleTime,
                    isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther,
                  ]}>
                    {formatTime(item.createdAt)}
                    {isMine ? "  ✓" : ""}
                  </Text>
                </View>
              </View>
            </>
          );
        }}
      />

      {/* ✅ Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#AAA"
          multiline
          maxLength={500}
          // ✅ Fix: blurOnSubmit false so keyboard stays, but manually clear
          blurOnSubmit={false}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            text.trim() ? styles.sendBtnActive : styles.sendBtnInactive,
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ✅ Date Badge
  dateBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginVertical: 12,
  },
  dateBadgeText: { fontSize: 12, color: "#555", fontWeight: "600" },

  // ✅ Bubble Row
  bubbleRow: {
    marginVertical: 1,
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubbleRowLeft: { justifyContent: "flex-start" },

  // ✅ Bubble Base
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },

  // ✅ My bubble — teal
  bubbleMine: {
    backgroundColor: "#1AB7BC",
    borderBottomRightRadius: 18,
  },
  bubbleMineLastTail: {
    borderBottomRightRadius: 4,
  },

  // ✅ Other bubble — white
  bubbleOther: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 18,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  bubbleOtherLastTail: {
    borderBottomLeftRadius: 4,
  },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextOther: { color: "#111" },

  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)", textAlign: "right" },
  bubbleTimeOther: { color: "#AAA" },

  // ✅ Input Row
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: "#111",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  // ✅ Send button — active teal / inactive grey
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnActive: {
    backgroundColor: "#1AB7BC",
    elevation: 3,
    shadowColor: "#1AB7BC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  sendBtnInactive: {
    backgroundColor: "#D0D0D0",
  },
  sendBtnText: { color: "#fff", fontSize: 18 },
});