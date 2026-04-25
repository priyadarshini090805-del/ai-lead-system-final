const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();

app.use(express.json());

const SECRET = "test123";

app.post("/register", (req, res) => {
  res.json({ message: "User registered successfully" });
});

app.post("/login", (req, res) => {
  const token = jwt.sign({ user: "test" }, SECRET, { expiresIn: "1h" });
  res.json({ message: "Login successful", token });
});

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token required" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}

app.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Protected data accessed", user: req.user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));