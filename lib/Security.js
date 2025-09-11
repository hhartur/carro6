const lastRequestMap = new Map(); // chave: userId ou IP, valor: timestamp da última requisição

const checkRequestDelay = (minDelayMs = 5000) => { // delay mínimo entre requisições em ms
  return (req, res, next) => {
    const userId = req.user ? req.user.id : req.headers['x-forwarded-for'] || req.ip;
    const now = Date.now();

    const lastRequestTime = lastRequestMap.get(userId);

    if (lastRequestTime && now - lastRequestTime < minDelayMs) {
      return res.status(429).json({ error: `Aguarde ${Math.ceil((minDelayMs - (now - lastRequestTime))/1000)}s antes de tentar novamente.` });
    }

    lastRequestMap.set(userId, now);
    next();
  };
};

module.exports = { checkRequestDelay };
