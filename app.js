const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ================= CONFIG =================
const JWT_SECRET = "secret123";

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ================= CREATE TABLE =================
app.get("/create-table", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    res.send("Users table created ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, hashedPassword]
    );

    res.json({
      message: "User registered",
      user: result.rows[0],
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET);

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= AUTH MIDDLEWARE =================
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch {
    res.status(400).json({ message: "Invalid token" });
  }
};

// ================= PROTECTED =================
app.get("/profile", verifyToken, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email FROM users WHERE id = $1",
    [req.user.id]
  );

  res.json(result.rows[0]);
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});