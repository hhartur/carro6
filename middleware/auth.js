const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado, usuário não encontrado.' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Não autorizado, token inválido.' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Não autorizado, nenhum token fornecido.' });
  }
};

module.exports = { protect };