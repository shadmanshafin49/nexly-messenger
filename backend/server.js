import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import createMessageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import createSpaceRoutes from "./routes/spaceRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

app.use("/api/messages", createMessageRoutes(io));
app.use("/api/users", userRoutes);
app.use("/api/spaces", createSpaceRoutes(io));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("typing", ({ to }) => {
    socket.to(to).emit("typing", { from: socket.username });
  });

  socket.on("stop_typing", ({ to }) => {
    socket.to(to).emit("stop_typing", { from: socket.username });
  });

  socket.on("call_offer", ({ to, offer, callerFname }) => {
    socket.to(to).emit("call_offer", { from: socket.username, callerFname, offer });
  });

  socket.on("call_answer", ({ to, answer }) => {
    socket.to(to).emit("call_answer", { answer });
  });

  socket.on("ice_candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice_candidate", { candidate });
  });

  socket.on("call_end", ({ to }) => {
    socket.to(to).emit("call_end");
  });

  socket.on("message_reaction", ({ to, messageId, loved }) => {
    socket.to(to).emit("message_reaction", { messageId, loved });
  });

  socket.on("join", (username) => {
    socket.username = username;
    socket.join(username);
    console.log(`${username} joined room`);
  });

  socket.on("join_space", (spaceId) => {
    socket.join(`space:${spaceId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
