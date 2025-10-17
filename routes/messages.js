const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const { sendNotification } = require("../lib/websocket");

// Rota para obter o histórico de mensagens com um amigo
router.get("/messages/:friendId", protect, async (req, res) => {
    const userId = req.user._id;
    const friendId = req.params.friendId;

    try {
        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: friendId },
                { sender: friendId, recipient: userId },
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para marcar mensagens como lidas
router.put("/messages/:friendId/read", protect, async (req, res) => {
    const userId = req.user._id;
    const friendId = req.params.friendId;

    try {
        await Message.updateMany(
            { sender: friendId, recipient: userId, read: false },
            { read: true }
        );
        res.json({ message: "Mensagens marcadas como lidas." });
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

module.exports = router;
