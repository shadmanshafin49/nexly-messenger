import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { encrypt, decrypt } from "../utils/cipher/athash.js";

export default function createMessageRoutes(io) {
  const router = express.Router();

  // Send a message
  router.post("/", async (req, res) => {
    try {
      const { sender, receiver, content } = req.body;
      const msg = new Message({ sender, receiver, content: encrypt(content), status: "sent" });
      await msg.save();

      const msgObj = { ...msg.toObject(), content }; // return plaintext to caller
      io.to(receiver).emit("receive_message", msgObj);

      res.status(201).json(msgObj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // All conversations for a user with latest message + partner name
  router.get("/conversations/:username", async (req, res) => {
    try {
      const { username } = req.params;

      const messages = await Message.find({
        $or: [{ sender: username }, { receiver: username }],
      }).sort({ createdAt: -1 });

      const seen = {};
      for (const msg of messages) {
        const partner = msg.sender === username ? msg.receiver : msg.sender;
        if (!seen[partner]) {
          seen[partner] = {
            partnerUsername: partner,
            latestMessage: decrypt(msg.content),
            latestMessageAt: msg.createdAt,
            isMine: msg.sender === username,
          };
        }
      }

      const partners = Object.keys(seen);
      if (partners.length === 0) return res.json({ conversations: [] });

      const users = await User.find({ username: { $in: partners } }).select("username fname lname");
      const userMap = {};
      users.forEach((u) => { userMap[u.username] = u; });

      const conversations = Object.values(seen).map((conv) => ({
        ...conv,
        fname: userMap[conv.partnerUsername]?.fname || conv.partnerUsername,
        lname: userMap[conv.partnerUsername]?.lname || "",
      }));

      res.json({ conversations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get conversation between two users — marks incoming as delivered
  router.get("/:user1/:user2", async (req, res) => {
    try {
      const { user1, user2 } = req.params;

      const messages = await Message.find({
        $or: [
          { sender: user1, receiver: user2 },
          { sender: user2, receiver: user1 },
        ],
      }).sort({ createdAt: 1 });

      // Messages from user2 that user1 is now fetching → mark delivered
      const updated = await Message.updateMany(
        { sender: user2, receiver: user1, status: "sent" },
        { status: "delivered" }
      );
      if (updated.modifiedCount > 0) {
        io.to(user2).emit("status_update", { from: user1, status: "delivered" });
      }

      const result = messages.map((msg) => {
        const justDelivered =
          msg.sender === user2 && msg.receiver === user1 && msg.status === "sent";
        return {
          ...msg.toObject(),
          content: decrypt(msg.content),
          status: justDelivered ? "delivered" : msg.status,
        };
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mark all messages from msgSender → msgReceiver as read
  router.patch("/read/:msgSender/:msgReceiver", async (req, res) => {
    try {
      const { msgSender, msgReceiver } = req.params;
      const updated = await Message.updateMany(
        { sender: msgSender, receiver: msgReceiver, status: { $ne: "read" } },
        { status: "read" }
      );
      if (updated.modifiedCount > 0) {
        io.to(msgSender).emit("status_update", { from: msgReceiver, status: "read" });
      }
      res.json({ count: updated.modifiedCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
