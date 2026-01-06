import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';


const router = express.Router();

// Registar novo utilizador
router.post('/register', async (req, res) => {
  try {
    const { nome, email, password } = req.body;

    if (!nome || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e password são obrigatórios.' });
    }

    // ver se já existe user com esse email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Já existe um utilizador com esse email.' });
    }

    // hash da password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      nome,
      email,
      passwordHash,
    });

    // opcional: não devolver o hash
    const userData = {
      id: user._id,
      nome: user.nome,
      email: user.email,
    };

    return res.status(201).json({ message: 'Utilizador registado com sucesso.', user: userData });
  } catch (err) {
    console.error('Erro no /auth/register:', err);
    return res.status(500).json({ message: 'Erro ao registar utilizador.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password são obrigatórios.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // não dizemos “user não existe” para não dar dicas
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: '7d',
    });

    const userData = {
      id: user._id,
      nome: user.nome,
      email: user.email,
    };

    return res.json({
      message: 'Login efetuado com sucesso.',
      token,
      user: userData,
    });
  } catch (err) {
    console.error('Erro no /auth/login:', err);
    return res.status(500).json({ message: 'Erro ao fazer login.' });
  }
});

// Devolver dados do utilizador autenticado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id nome email');

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    return res.json({
      id: user._id,
      nome: user.nome,
      email: user.email,
    });
  } catch (err) {
    console.error('Erro no /auth/me:', err);
    return res.status(500).json({ message: 'Erro ao obter utilizador.' });
  }
});

export default router;
