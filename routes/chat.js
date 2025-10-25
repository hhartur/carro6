const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../lib/notificationService');

function chatRoutes(io) {
    const router = express.Router();

    // Get chats
    router.get('/', protect, async (req, res) => {
        const userId = req.user.id;

        try {
            const chats = await prisma.chat.findMany({
                where: {
                    participants: {
                        some: { userId },
                    },
                },
                include: {
                    participants: {
                        include: {
                            user: { select: { id: true, username: true } },
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            });

            res.json(chats);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    });

    // Get chat messages
    router.get('/:chatId/messages', protect, async (req, res) => {
        const { chatId } = req.params;
        const userId = req.user.id;

        try {
            const chat = await prisma.chat.findFirst({
                where: {
                    id: chatId,
                    participants: {
                        some: { userId },
                    },
                },
            });

            if (!chat) {
                return res.status(404).json({ message: 'Chat not found.' });
            }

            const messages = await prisma.chatMessage.findMany({
                where: { chatId },
                orderBy: { createdAt: 'asc' },
                include: { sender: { select: { id: true, username: true } } },
            });

            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    });

    // Create a new message
    router.post('/:chatId/messages', protect, async (req, res) => {
        const { chatId } = req.params;
        const { content } = req.body;
        const senderId = req.user.id;

        try {
            const chat = await prisma.chat.findFirst({
                where: {
                    id: chatId,
                    participants: {
                        some: { userId: senderId },
                    },
                },
                include: {
                    participants: true,
                }
            });

            if (!chat) {
                return res.status(404).json({ message: 'Chat not found.' });
            }

            const message = await prisma.chatMessage.create({
                data: {
                    chatId,
                    senderId,
                    content,
                },
                include: {
                    sender: { select: { id: true, username: true } },
                }
            });

            chat.participants.forEach(participant => {
                if (participant.userId !== senderId) {
                    sendNotification(participant.userId, {
                        type: 'NEW_MESSAGE',
                        message: `New message from ${req.user.username}`,
                        data: {
                            chatId,
                            sender: {
                                id: req.user.id,
                                username: req.user.username
                            }
                        }
                    });
                }
            });

            res.status(201).json(message);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    });


    // Create a new chat
    router.post('/', protect, async (req, res) => {
        const { name, isGroup, participantIds } = req.body;
        const creatorId = req.user.id;

        try {
            const allParticipantIds = [...new Set([creatorId, ...participantIds])];

            const chat = await prisma.chat.create({
                data: {
                    name,
                    isGroup,
                    creatorId,
                    participants: {
                        create: allParticipantIds.map(userId => ({ userId })),
                    },
                },
            });

            res.status(201).json(chat);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    });

    return router;
}

module.exports = chatRoutes;