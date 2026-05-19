import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { encrypt, decrypt } from "../utils/cipher/athash.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "nexly-chat" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

export default function createMessageRoutes(io) {
  const router = express.Router();

  // Send a text message
  router.post("/", async (req, res) => {
    try {
      const { sender, receiver, content } = req.body;
      const msg = new Message({ sender, receiver, content: encrypt(content), status: "sent" });
      await msg.save();

      const msgObj = { ...msg.toObject(), content };
      io.to(receiver).emit("receive_message", msgObj);

      res.status(201).json(msgObj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send an image message
  router.post("/image", upload.single("image"), async (req, res) => {
    try {
      const { sender, receiver } = req.body;
      const result = await uploadToCloudinary(req.file.buffer);

      const msg = new Message({
        sender,
        receiver,
        content: "",
        type: "image",
        imageUrl: result.secure_url,
        status: "sent",
      });
      await msg.save();

      const msgObj = msg.toObject();
      io.to(receiver).emit("receive_message", msgObj);

      res.status(201).json(msgObj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle love reaction on a message
  router.patch("/:id/react", async (req, res) => {
    try {
      const { loved } = req.body;
      const msg = await Message.findByIdAndUpdate(
        req.params.id,
        { loved },
        { new: true }
      );
      res.json(msg);
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
      const unreadCounts = {};
      for (const msg of messages) {
        const partner = msg.sender === username ? msg.receiver : msg.sender;
        if (!seen[partner]) {
          seen[partner] = {
            partnerUsername: partner,
            latestMessage: msg.type === "image" ? "📷 Photo" : decrypt(msg.content),
            latestMessageAt: msg.createdAt,
            isMine: msg.sender === username,
          };
        }
        if (msg.sender === partner && msg.receiver === username && msg.status !== "read") {
          unreadCounts[partner] = (unreadCounts[partner] || 0) + 1;
        }
      }
      for (const partner of Object.keys(seen)) {
        seen[partner].unreadCount = unreadCounts[partner] || 0;
        seen[partner].unread = seen[partner].unreadCount > 0;
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
          content: msg.type === "image" ? "" : decrypt(msg.content),
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
