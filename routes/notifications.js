const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// Rota para obter notificações do usuário
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limite para não sobrecarregar
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para marcar notificação como lida
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notificação não encontrada." });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para marcar todas as notificações como lidas
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: "Todas as notificações marcadas como lidas." });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

module.exports = router;
