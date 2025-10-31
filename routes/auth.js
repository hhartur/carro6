const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res
        .status(400)
        .json({ error: "Usuário ou e-mail já cadastrado." });
    }
    const user = await User.create({ username, email, password });
    if (user) {
      res
        .status(201)
        .json({
          _id: user._id,
          username: user.username,
          email: user.email,
          token: generateToken(user._id),
        });
    } else {
      res.status(400).json({ error: "Dados de usuário inválidos." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro no servidor." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro no servidor." });
  }
});

module.exports = router;
