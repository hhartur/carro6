const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require('../middleware/auth');

// Rota para obter o perfil do usuário atual
router.get('/profile', protect, async (req, res) => {
    // req.user é anexado pelo middleware 'protect'
    res.json({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
    });
});

// Rota para atualizar o perfil do usuário (apenas username por enquanto)
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            const newUsername = req.body.username.trim().toLowerCase();
            
            // Verifica se o novo nome de usuário já está em uso por outro usuário
            const userExists = await User.findOne({ username: newUsername });
            if (userExists && userExists._id.toString() !== user._id.toString()) {
                return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
            }

            user.username = newUsername || user.username;
            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
            });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message || "Erro interno do servidor." });
    }
});

// Rota para encontrar um usuário pelo nome de usuário
router.get('/find/:username', protect, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username.toLowerCase() });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.json({
            _id: user._id,
            username: user.username
        });
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

module.exports = router;