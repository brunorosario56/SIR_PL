import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /users/me/colegas
 * Body: { "email": "colega@example.com" }
 * Adiciona um colega à lista do utilizador autenticado.
 */
router.post('/me/colegas', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email do colega é obrigatório.' });
    }

    // user autenticado
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizador atual não encontrado.' });
    }

    // não pode adicionar ele próprio como colega
    if (user.email === email) {
      return res.status(400).json({ message: 'Não podes adicionar-te a ti próprio como colega.' });
    }

    // procurar o colega pelo email
    const colega = await User.findOne({ email });
    if (!colega) {
      return res.status(404).json({ message: 'Colega com esse email não existe.' });
    }

    // ver se já está na lista
    const jaExiste = user.colegas.some((id) => id.equals(colega._id));
    if (jaExiste) {
      return res.status(409).json({ message: 'Esse colega já está na tua lista.' });
    }

    // adicionar colega (apenas de um lado para já; se quiseres recíproco, adicionas nos dois)
    user.colegas.push(colega._id);
    await user.save();

    return res.status(201).json({
      message: 'Colega adicionado com sucesso.',
      colega: {
        id: colega._id,
        _id: colega._id,
        nome: colega.nome,
        email: colega.email,
      },
    });
  } catch (err) {
    console.error('Erro no POST /users/me/colegas:', err);
    return res.status(500).json({ message: 'Erro ao adicionar colega.' });
  }
});

/**
 * GET /users/me/colegas
 * Devolve a lista de colegas (id, nome, email).
 */
router.get('/me/colegas', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('colegas', '_id nome email') // "join" com a coleção de users
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    return res.json({
      colegas: user.colegas || [],
    });
  } catch (err) {
    console.error('Erro no GET /users/me/colegas:', err);
    return res.status(500).json({ message: 'Erro ao obter colegas.' });
  }
});

export default router;
