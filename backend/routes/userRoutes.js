import express from "express";
import User from "../models/User.js";

const router = express.Router();

// POST /api/users/register
router.post("/register", async (req, res) => {
  const { fname, lname, email, username, password, repeatPassword } = req.body;

  if (!fname || !email || !username || !password || !repeatPassword) {
    return res.status(400).json({ error: "Please fill all required fields" });
  }

  if (password !== repeatPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    // Check if username or email exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const user = await User.create({ fname, lname, email, username, password });
    res.status(201).json({ message: "User created successfully", user: { username: user.username, fname: user.fname, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ user: { _id: user._id, username: user.username, fname: user.fname, lname: user.lname, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/search?query=<username or email>
router.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const regex = new RegExp(query, "i"); // case-insensitive
    const users = await User.find({
      $or: [{ username: regex }, { email: regex }]
    }).select("fname lname username email"); // don't return password
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
