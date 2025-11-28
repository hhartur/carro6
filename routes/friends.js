const express = require("express");
const router = express.Router();
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const {sendNotification} = require("../lib/socket");

// Rota para enviar um pedido de amizade
router.post("/friends/request", protect, async (req, res) => {
  const { recipientId } = req.body;
  const requesterId = req.user._id;

  if (requesterId.equals(recipientId)) {
    return res.status(400).json({ error: "Você não pode adicionar a si mesmo como amigo." });
  }

  try {
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existingFriendship) {
      return res.status(400).json({ error: "Pedido de amizade já existente." });
    }

    const friendship = new Friendship({
      requester: requesterId,
      recipient: recipientId,
    });

    await friendship.save();

    // Salvar notificação no banco
    const notification = new Notification({
      user: recipientId,
      message: `Você recebeu um pedido de amizade de ${req.user.username}.`,
      type: 'FRIEND_REQUEST',
      data: {
        requestId: friendship._id,
        requester: {
          _id: req.user._id,
          username: req.user.username
        }
      }
    });
    await notification.save();

    // Notificar o destinatário via WebSocket
    sendNotification(recipientId.toString(), {
        type: 'FRIEND_REQUEST',
        message: `Você recebeu um pedido de amizade de ${req.user.username}.`,
        data: {
            requestId: friendship._id,
            requester: {
                _id: req.user._id,
                username: req.user.username
            }
        }
    });

    res.status(201).json(friendship);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para aceitar ou recusar um pedido de amizade
router.put("/friends/request/:id", protect, async (req, res) => {
  const { status } = req.body;
  const friendshipId = req.params.id;
  const userId = req.user._id;

  try {
    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ error: "Pedido de amizade não encontrado." });
    }

    if (!friendship.recipient.equals(userId)) {
      return res.status(403).json({ error: "Não autorizado." });
    }

    if (friendship.status !== 'pending') {
        return res.status(400).json({ error: "Este pedido já foi respondido." });
    }

    friendship.status = status; // 'accepted' or 'declined'
    await friendship.save();

    if (status === 'accepted') {
        // Salvar notificação no banco
        const notification = new Notification({
          user: friendship.requester,
          message: `${req.user.username} aceitou seu pedido de amizade.`,
          type: 'FRIEND_REQUEST_ACCEPTED',
          data: {
            friend: {
              _id: req.user._id,
              username: req.user.username
            }
          }
        });
        await notification.save();

        sendNotification(friendship.requester.toString(), {
            type: 'FRIEND_REQUEST_ACCEPTED',
            message: `${req.user.username} aceitou seu pedido de amizade.`,
            data: {
                friend: {
                    _id: req.user._id,
                    username: req.user.username
                }
            }
        });
    }

    res.json(friendship);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para obter a lista de amigos
router.get("/friends", protect, async (req, res) => {
  const userId = req.user._id;

  try {
    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    }).populate("requester", "username").populate("recipient", "username");

    const friends = friendships.map(friendship => {
        if (friendship.requester._id.equals(userId)) {
            return {
                ...friendship.recipient.toObject(),
                nickname: friendship.requesterNickname
            };
        } else {
            return {
                ...friendship.requester.toObject(),
                nickname: friendship.recipientNickname
            };
        }
    });

    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para obter a lista de pedidos de amizade pendentes
router.get("/friends/requests", protect, async (req, res) => {
  const userId = req.user._id;

  try {
    const requests = await Friendship.find({
      recipient: userId,
      status: "pending",
    }).populate("requester", "username");

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para remover um amigo
router.delete("/friends/:id", protect, async (req, res) => {
    const userId = req.user._id;
    const friendId = req.params.id;

    try {
        const friendship = await Friendship.findOne({
            status: 'accepted',
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId },
            ]
        });

        if (!friendship) {
            return res.status(404).json({ error: "Amizade não encontrada." });
        }

        await friendship.remove();
        res.json({ message: "Amigo removido com sucesso." });

    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para definir um apelido para um amigo
router.put("/friends/:id/nickname", protect, async (req, res) => {
    const userId = req.user._id;
    const friendId = req.params.id;
    const { nickname } = req.body;

    try {
        const friendship = await Friendship.findOne({
            status: 'accepted',
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId },
            ]
        });

        if (!friendship) {
            return res.status(404).json({ error: "Amizade não encontrada." });
        }

        if (friendship.requester.equals(userId)) {
            friendship.recipientNickname = nickname;
        } else {
            friendship.requesterNickname = nickname;
        }

        await friendship.save();
        res.json(friendship);

    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

module.exports = router;
