import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from "react-native";
import {
  collection, query, where, getDocs,
  doc, getDoc, orderBy, limit,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

function ChatCard({ item, index, navigation, formatTime }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300,
        delay: index * 60, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, friction: 7, tension: 60,
        delay: index * 60, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  const avatarColors = ["#1AB7BC", "#5856D6", "#FF9500", "#34C759", "#FF2D55", "#007AFF"];
  const avatarColor = avatarColors[item.otherUserName.charCodeAt(0) % avatarColors.length];
  const initial = item.otherUserName.charAt(0).toUpperCase();

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() =>
          navigation.navigate("Chat", {
            ticketId: item.ticketId,
            otherUserName: item.otherUserName,
            otherUserId: item.otherUserId,
          })
        }
      >
        <View style={styles.card}>

          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>

            {/* Row 1: Name + Time */}
            <View style={styles.row}>
              <Text style={styles.chatName} numberOfLines={1}>
                {item.otherUserName}
              </Text>
              <Text style={styles.timeText}>
                {item.lastMessageTime ? formatTime(item.lastMessageTime) : ""}
              </Text>
            </View>

            {/* Row 2: Last Message */}
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || "Tap to open chat"}
            </Text>

            {/* Row 3: Service tag */}
            <Text style={styles.serviceTag} numberOfLines={1}>
              🔧 {item.serviceType}
            </Text>

          </View>

          {/* Arrow */}
          <Text style={styles.arrow}>›</Text>

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      const userType = userSnap.data()?.userType;
      const field = userType === "customer" ? "customerId" : "technicianId";

      const ticketSnap = await getDocs(
        query(
          collection(db, "tickets"),
          where(field, "==", currentUser.uid),
          where("status", "in", ["accepted", "completed"])
        )
      );

      // ✅ Group by otherUserId — 1 chat per person
      const userMap = new Map();

      for (const d of ticketSnap.docs) {
        const ticket = { id: d.id, ...d.data() };
        const otherUserId = userType === "customer"
          ? ticket.technicianId
          : ticket.customerId;

        if (!otherUserId) continue;

        if (userMap.has(otherUserId)) {
          const existing = userMap.get(otherUserId);
          if ((ticket.clientCreatedAt || 0) > (existing.ticketCreatedAt || 0)) {
            userMap.set(otherUserId, {
              ...existing,
              ticketId: ticket.id,
              serviceType: ticket.serviceType,
              status: ticket.status,
              ticketCreatedAt: ticket.clientCreatedAt || 0,
            });
          }
        } else {
          userMap.set(otherUserId, {
            otherUserId,
            ticketId: ticket.id,
            serviceType: ticket.serviceType,
            status: ticket.status,
            ticketCreatedAt: ticket.clientCreatedAt || 0,
            otherUserName: "Unknown",
            lastMessage: null,
            lastMessageTime: null,
          });
        }
      }

      // ✅ Fetch names + last messages
      const chatList = await Promise.all(
        Array.from(userMap.values()).map(async (chat) => {
          try {
            const otherSnap = await getDoc(doc(db, "users", chat.otherUserId));
            chat.otherUserName = otherSnap.data()?.name || "Unknown";
          } catch (e) {}

          try {
            const chatId = [currentUser.uid, chat.otherUserId].sort().join("_");
            const msgSnap = await getDocs(
              query(
                collection(db, "chats", chatId, "messages"),
                orderBy("createdAt", "desc"),
                limit(1)
              )
            );
            if (!msgSnap.empty) {
              const lastMsg = msgSnap.docs[0].data();
              chat.lastMessage = lastMsg.text || "📎 Attachment";
              chat.lastMessageTime = lastMsg.createdAt?.toMillis
                ? lastMsg.createdAt.toMillis()
                : lastMsg.createdAt || null;
            }
          } catch (e) {}

          return chat;
        })
      );

      chatList.sort((a, b) =>
        (b.lastMessageTime || b.ticketCreatedAt || 0) -
        (a.lastMessageTime || a.ticketCreatedAt || 0)
      );

      setChats(chatList);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1AB7BC" />
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyTitle}>No Chats Yet</Text>
        <Text style={styles.emptySub}>
          Chats appear after a technician accepts your ticket
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.otherUserId}
        contentContainerStyle={{ paddingVertical: 8 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ChatCard
            item={item}
            index={index}
            navigation={navigation}
            formatTime={formatTime}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Card
  card: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Avatar
  avatar: {
    width: 50, height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 21, fontWeight: "800" },

  // Card Info
  cardInfo: { flex: 1, gap: 3 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: 15, fontWeight: "800",
    color: "#111", flex: 1,
  },
  timeText: { fontSize: 11, color: "#BBB", fontWeight: "600" },

  // ✅ Last message directly below name
  lastMessage: {
    fontSize: 13, color: "#888", fontWeight: "400",
  },

  // Service tag
  serviceTag: {
    fontSize: 11, color: "#BBB",
    fontWeight: "600", marginTop: 1,
  },

  // Arrow
  arrow: { fontSize: 22, color: "#CCC", fontWeight: "300" },

  // ✅ WhatsApp style thin separator
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginLeft: 78,  // ✅ starts after avatar
  },

  // Empty
  emptyBox: {
    flex: 1, justifyContent: "center",
    alignItems: "center", padding: 40,
  },
  emptyIcon: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: "#111", marginBottom: 6 },
  emptySub: {
    fontSize: 13, color: "#888",
    textAlign: "center", lineHeight: 20,
  },
});