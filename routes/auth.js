// routes/auth.js - VERSÃO ATUALIZADA E COMPLETA

const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Módulo nativo do Node.js para criptografia
const User = require('../models/User'); // Importa o modelo de usuário do Mongoose
const { sendVerificationEmail } = require('../lib/emailService'); // Importa a função de envio de e-mail
const jwt = require('jsonwebtoken'); // Biblioteca para gerar tokens de autenticação
const { checkRequestDelay } = require('../lib/Security');

// --- Constantes de Configuração ---
const CODE_EXPIRATION_MINUTES = 10;

// --- Funções Auxiliares ---
const generateCode = () => crypto.randomInt(100000, 1000000).toString(); // Gera um código seguro de 6 dígitos

/**
 * @route   POST /api/auth/register
 * @desc    Registra um novo usuário e envia o e-mail de verificação
 * @access  Public
 */
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });

        // Caso 1: Usuário existe mas não foi verificado. Atualiza o código de verificação.
        if (user && !user.isVerified) {
            user.verificationCode = generateCode();
            user.verificationCodeExpires = Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000;
        } 
        // Caso 2: Usuário já existe e está verificado. Retorna erro.
        else if (user && user.isVerified) {
            return res.status(400).json({ error: 'Este e-mail já está em uso.' });
        }
        // Caso 3: Usuário não existe. Cria um novo.
        else {
            user = new User({ username, email, password });
            user.verificationCode = generateCode();
            user.verificationCodeExpires = Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000;
        }

        await user.save(); // Salva o usuário novo ou as alterações no existente
        await sendVerificationEmail(user.email, user.verificationCode); // Envia o e-mail
        
        // Retorna sucesso para o frontend
        res.status(201).json({ 
            message: `Cadastro iniciado! Um código foi enviado para ${user.email}. Verifique para ativar sua conta.`,
            email: user.email // Devolve o e-mail para o frontend saber qual conta verificar
        });

    } catch (error) {
        console.error("Erro na rota de registro:", error);
        res.status(500).json({ error: 'Erro ao processar o registro.' });
    }
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verifica o código de e-mail e ativa a conta do usuário
 * @access  Public
 */
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await User.findOne({ 
            email, 
            verificationCode: code,
            verificationCodeExpires: { $gt: Date.now() } // Garante que o código não expirou
        });

        if (!user) {
            return res.status(400).json({ error: 'Código inválido ou expirado. Tente se cadastrar novamente.' });
        }

        // Se o código for válido, ativa a conta e limpa os campos de verificação
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'E-mail verificado com sucesso! Você já pode fazer o login.' });

    } catch (error) {
        console.error("Erro na rota de verificação:", error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

/**
 * @route   POST /api/auth/resend-code
 * @desc    Reenvia o código de verificação para um e-mail não verificado
 * @access  Public
 */
router.post('/resend-code', checkRequestDelay(1500), async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "Conta não encontrada. Por favor, inicie o cadastro." });
        }
        if (user.isVerified) {
            return res.status(400).json({ error: "Esta conta já foi verificada." });
        }

        // Gera um novo código e data de expiração
        user.verificationCode = generateCode();
        user.verificationCodeExpires = Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000;
        await user.save();
        await sendVerificationEmail(user.email, user.verificationCode);

        res.status(200).json({ message: `Um novo código foi enviado para ${email}.` });
        
    } catch (error) {
        console.error("Erro na rota de reenviar código:", error);
        res.status(500).json({ error: 'Erro ao reenviar o código.' });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Autentica o usuário e retorna um token JWT
 * @access  Public
 */
router.post('/login', checkRequestDelay(1500), async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        // Verifica se o usuário existe e se a senha está correta
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // Adiciona a verificação para garantir que a conta foi ativada
        if (!user.isVerified) {
            return res.status(403).json({ 
                error: 'Sua conta não foi verificada. Por favor, verifique seu e-mail.',
                needsVerification: true, // Um sinal para o frontend saber qual tela mostrar
                email: user.email
            });
        }
        
        // Se tudo estiver correto, gera o token de acesso
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        res.json({
            token,
            username: user.username,
            email: user.email,
        });

    } catch (error) {
        console.error("Erro na rota de login:", error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

// Exporta o router para ser usado no seu arquivo principal (server.js)
module.exports = router;