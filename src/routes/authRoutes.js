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
      _id: user._id,
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
      _id: user._id,
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
    const user = await User.findById(req.userId).select('_id nome email avatar');

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    return res.json({
      id: user._id,
      _id: user._id,
      nome: user.nome,
      email: user.email,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error('Erro no /auth/me:', err);
    return res.status(500).json({ message: 'Erro ao obter utilizador.' });
  }
});

// Atualizar perfil do utilizador
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { nome, email, avatar } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    // Verificar se o email já está em uso por outro utilizador
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.userId } });
      if (emailExists) {
        return res.status(409).json({ message: 'Este email já está em uso.' });
      }
      user.email = email;
    }

    if (nome && nome.trim()) user.nome = nome.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    return res.json({
      message: 'Perfil atualizado com sucesso.',
      user: {
        id: user._id,
        _id: user._id,
        nome: user.nome,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Erro no PUT /auth/me:', err);
    return res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  }
});

// Alterar password
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Password atual e nova são obrigatórias.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'A nova password deve ter pelo menos 6 caracteres.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Password atual incorreta.' });
    }

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    return res.json({ message: 'Password alterada com sucesso.' });
  } catch (err) {
    console.error('Erro no PUT /auth/me/password:', err);
    return res.status(500).json({ message: 'Erro ao alterar password.' });
  }
});

// Estatísticas do utilizador
router.get('/me/stats', authMiddleware, async (req, res) => {
  try {
    const Schedule = (await import('../models/Schedule.js')).default;
    const Group = (await import('../models/Group.js')).default;
    const StudyEvent = (await import('../models/StudyEvent.js')).default;

    const user = await User.findById(req.userId).populate('colegas', '_id');
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const schedule = await Schedule.findOne({ user: req.userId });
    const groups = await Group.find({ membros: req.userId });
    const groupIds = groups.map(g => g._id);

    // Eventos futuros
    const now = new Date();
    const upcomingEvents = await StudyEvent.countDocuments({
      group: { $in: groupIds },
      inicio: { $gte: now },
    });

    // Eventos passados
    const pastEvents = await StudyEvent.countDocuments({
      group: { $in: groupIds },
      inicio: { $lt: now },
    });

    // Grupos onde é owner
    const ownedGroups = groups.filter(g => g.owner.equals(req.userId)).length;

    return res.json({
      totalColegas: user.colegas.length,
      totalGroups: groups.length,
      ownedGroups,
      totalBlocos: schedule?.blocos?.length || 0,
      upcomingEvents,
      pastEvents,
      totalEvents: upcomingEvents + pastEvents,
    });
  } catch (err) {
    console.error('Erro no GET /auth/me/stats:', err);
    return res.status(500).json({ message: 'Erro ao obter estatísticas.' });
  }
});

export default router;
