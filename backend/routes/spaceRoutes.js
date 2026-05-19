import express from "express";
import Space from "../models/Space.js";
import SpaceChat from "../models/SpaceChat.js";
import SpaceMessage from "../models/SpaceMessage.js";
import User from "../models/User.js";
import { encrypt, decrypt } from "../utils/cipher/athash.js";

export default function createSpaceRoutes(io) {
  const router = express.Router();

  // Create a space — POST /api/spaces
  router.post("/", async (req, res) => {
    try {
      const { owner, memberUsernames, name } = req.body;
      const members = [owner, ...memberUsernames.filter((m) => m !== owner)];

      if (members.length < 2) {
        return res.status(400).json({ error: "At least 2 members required" });
      }

      let spaceName = name && name.trim() ? name.trim() : null;
      if (!spaceName) {
        const users = await User.find({ username: { $in: members } }).select("username fname");
        const nameMap = {};
        users.forEach((u) => { nameMap[u.username] = u.fname; });
        spaceName = members.map((m) => nameMap[m] || m).join(" & ") + "'s space";
      }

      const space = new Space({ name: spaceName, owner, members });
      await space.save();

      const defaultChat = new SpaceChat({ spaceId: space._id, name: "General", createdBy: owner });
      await defaultChat.save();

      res.status(201).json({ space, defaultChat });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all spaces for a user — GET /api/spaces/user/:username
  // MUST be before /:spaceId to avoid param conflict
  router.get("/user/:username", async (req, res) => {
    try {
      const spaces = await Space.find({ members: req.params.username }).sort({ updatedAt: -1 });
      res.json({ spaces });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // React to a space message — PATCH /api/spaces/messages/:messageId/react
  // MUST be before /:spaceId to avoid param conflict
  router.patch("/messages/:messageId/react", async (req, res) => {
    try {
      const { loved, spaceId } = req.body;
      const msg = await SpaceMessage.findByIdAndUpdate(
        req.params.messageId,
        { loved },
        { new: true }
      );
      io.to(`space:${spaceId}`).emit("space_message_reaction", {
        messageId: req.params.messageId,
        loved,
      });
      res.json(msg);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get space details + members — GET /api/spaces/:spaceId
  router.get("/:spaceId", async (req, res) => {
    try {
      const space = await Space.findById(req.params.spaceId);
      if (!space) return res.status(404).json({ error: "Space not found" });
      const members = await User.find({ username: { $in: space.members } }).select("username fname lname");
      res.json({ space, members });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rename a space — PATCH /api/spaces/:spaceId/name
  router.patch("/:spaceId/name", async (req, res) => {
    try {
      const space = await Space.findByIdAndUpdate(
        req.params.spaceId,
        { name: req.body.name },
        { new: true }
      );
      io.to(`space:${req.params.spaceId}`).emit("space_updated", {
        spaceId: req.params.spaceId,
        name: req.body.name,
      });
      res.json({ space });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all chats in a space — GET /api/spaces/:spaceId/chats
  router.get("/:spaceId/chats", async (req, res) => {
    try {
      const chats = await SpaceChat.find({ spaceId: req.params.spaceId }).sort({ createdAt: 1 });
      const withLatest = await Promise.all(
        chats.map(async (chat) => {
          const last = await SpaceMessage.findOne({ chatId: chat._id }).sort({ createdAt: -1 });
          return {
            ...chat.toObject(),
            latestMessage: last ? decrypt(last.content) : null,
            latestSender: last?.sender || null,
            latestMessageAt: last?.createdAt || chat.createdAt,
          };
        })
      );
      res.json({ chats: withLatest });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a chat inside a space — POST /api/spaces/:spaceId/chats
  router.post("/:spaceId/chats", async (req, res) => {
    try {
      const { name, createdBy } = req.body;
      const space = await Space.findById(req.params.spaceId);
      if (!space) return res.status(404).json({ error: "Space not found" });

      const chat = new SpaceChat({
        spaceId: req.params.spaceId,
        name: name?.trim() || "Chat",
        createdBy,
      });
      await chat.save();

      io.to(`space:${req.params.spaceId}`).emit("new_space_chat", chat.toObject());
      res.status(201).json({ chat });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get messages in a chat — GET /api/spaces/:spaceId/chats/:chatId/messages
  router.get("/:spaceId/chats/:chatId/messages", async (req, res) => {
    try {
      const messages = await SpaceMessage.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });
      res.json(messages.map((m) => ({ ...m.toObject(), content: decrypt(m.content) })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send a message in a chat — POST /api/spaces/:spaceId/chats/:chatId/messages
  router.post("/:spaceId/chats/:chatId/messages", async (req, res) => {
    try {
      const { spaceId, chatId } = req.params;
      const { sender, content } = req.body;

      const msg = new SpaceMessage({ spaceId, chatId, sender, content: encrypt(content) });
      await msg.save();

      // Bump space updatedAt so it surfaces at the top of the list
      await Space.findByIdAndUpdate(spaceId, { $set: { updatedAt: new Date() } });

      const msgObj = { ...msg.toObject(), content };
      io.to(`space:${spaceId}`).emit("space_message", { chatId, message: msgObj });

      res.status(201).json(msgObj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
