import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
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

/**
 * POST /users/me/colegas/requests
 * Body: { "email": "colega@example.com" }
 * Cria um pedido de amizade para outro utilizador (pendente até ser aceite/rejeitado).
 */
router.post('/me/colegas/requests', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email do colega é obrigatório.' });
    }

    const requester = await User.findById(req.userId);
    if (!requester) {
      return res.status(404).json({ message: 'Utilizador atual não encontrado.' });
    }

    const target = await User.findOne({ email });
    if (!target) {
      return res.status(404).json({ message: 'Colega com esse email não existe.' });
    }

    if (target._id.equals(requester._id)) {
      return res.status(400).json({ message: 'Não podes enviar um pedido para ti próprio.' });
    }

    const alreadyColleagues =
      requester.colegas.some((id) => id.equals(target._id)) ||
      target.colegas.some((id) => id.equals(requester._id));
    if (alreadyColleagues) {
      return res.status(409).json({ message: 'Esse colega já está na tua lista.' });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: requester._id, to: target._id, status: 'pending' },
        { from: target._id, to: requester._id, status: 'pending' },
      ],
    });
    if (existingRequest) {
      return res
        .status(409)
        .json({ message: 'Já existe um pedido de amizade pendente entre vocês.' });
    }

    const friendRequest = await FriendRequest.create({
      from: requester._id,
      to: target._id,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Pedido de amizade enviado.',
      request: {
        id: friendRequest._id,
        _id: friendRequest._id,
        from: friendRequest.from,
        to: friendRequest.to,
        status: friendRequest.status,
      },
      alvo: { id: target._id, _id: target._id, nome: target.nome, email: target.email },
    });
  } catch (err) {
    console.error('Erro no POST /users/me/colegas/requests:', err);
    return res.status(500).json({ message: 'Erro ao criar pedido de amizade.' });
  }
});

/**
 * GET /users/me/colegas/requests
 * Lista pedidos de amizade pendentes (entradas e saídas).
 */
router.get('/me/colegas/requests', authMiddleware, async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ to: req.userId, status: 'pending' }).populate('from', '_id nome email'),
      FriendRequest.find({ from: req.userId, status: 'pending' }).populate(
        'to',
        '_id nome email'
      ),
    ]);

    return res.json({
      incoming: incoming.map((reqDoc) => ({
        id: reqDoc._id,
        _id: reqDoc._id,
        from: reqDoc.from,
        status: reqDoc.status,
        createdAt: reqDoc.createdAt,
      })),
      outgoing: outgoing.map((reqDoc) => ({
        id: reqDoc._id,
        _id: reqDoc._id,
        to: reqDoc.to,
        status: reqDoc.status,
        createdAt: reqDoc.createdAt,
      })),
    });
  } catch (err) {
    console.error('Erro no GET /users/me/colegas/requests:', err);
    return res.status(500).json({ message: 'Erro ao obter pedidos de amizade.' });
  }
});

/**
 * POST /users/me/colegas/requests/:id/accept
 * Aceita um pedido de amizade recebido e adiciona ambos como colegas.
 */
router.post('/me/colegas/requests/:id/accept', authMiddleware, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Pedido de amizade não encontrado.' });
    }

    if (!request.to.equals(req.userId)) {
      return res.status(403).json({ message: 'Não podes aceitar pedidos de outros utilizadores.' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'Este pedido já foi processado.' });
    }

    request.status = 'accepted';
    await request.save();

    const [currentUser, requester] = await Promise.all([
      User.findById(req.userId),
      User.findById(request.from),
    ]);

    if (!currentUser || !requester) {
      return res.status(404).json({ message: 'Utilizador envolvido no pedido não existe.' });
    }

    const currentSet = new Set(currentUser.colegas.map((id) => id.toString()));
    const requesterSet = new Set(requester.colegas.map((id) => id.toString()));

    currentSet.add(requester._id.toString());
    requesterSet.add(currentUser._id.toString());

    currentUser.colegas = Array.from(currentSet).map((id) => new mongoose.Types.ObjectId(id));
    requester.colegas = Array.from(requesterSet).map((id) => new mongoose.Types.ObjectId(id));

    await Promise.all([currentUser.save(), requester.save()]);

    return res.json({
      message: 'Pedido aceite. Colegas adicionados mutuamente.',
      colega: { id: requester._id, _id: requester._id, nome: requester.nome, email: requester.email },
    });
  } catch (err) {
    console.error('Erro no POST /users/me/colegas/requests/:id/accept:', err);
    return res.status(500).json({ message: 'Erro ao aceitar pedido de amizade.' });
  }
});

/**
 * POST /users/me/colegas/requests/:id/reject
 * Rejeita um pedido de amizade recebido.
 */
router.post('/me/colegas/requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Pedido de amizade não encontrado.' });
    }

    if (!request.to.equals(req.userId)) {
      return res.status(403).json({ message: 'Não podes rejeitar pedidos de outros utilizadores.' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'Este pedido já foi processado.' });
    }

    request.status = 'rejected';
    await request.save();

    return res.json({ message: 'Pedido rejeitado.' });
  } catch (err) {
    console.error('Erro no POST /users/me/colegas/requests/:id/reject:', err);
    return res.status(500).json({ message: 'Erro ao rejeitar pedido de amizade.' });
  }
});

/**
 * DELETE /users/me/colegas/requests/:id
 * Cancela um pedido de amizade enviado (pendente).
 */
router.delete('/me/colegas/requests/:id', authMiddleware, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Pedido de amizade não encontrado.' });
    }

    if (!request.from.equals(req.userId)) {
      return res.status(403).json({ message: 'Não podes cancelar pedidos de outros utilizadores.' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'Este pedido já foi processado.' });
    }

    await FriendRequest.findByIdAndDelete(req.params.id);

    return res.json({ message: 'Pedido cancelado.' });
  } catch (err) {
    console.error('Erro no DELETE /users/me/colegas/requests/:id:', err);
    return res.status(500).json({ message: 'Erro ao cancelar pedido de amizade.' });
  }
});

/**
 * DELETE /users/me/colegas/:id
 * Remove um colega da lista do utilizador autenticado.
 */
router.delete('/me/colegas/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const wasColega = user.colegas.some((colegaId) => colegaId.equals(id));
    if (!wasColega) {
      return res.status(404).json({ message: 'Esse utilizador não está na tua lista de colegas.' });
    }

    // Remove de ambos os lados
    user.colegas = user.colegas.filter((colegaId) => !colegaId.equals(id));
    await user.save();

    const otherUser = await User.findById(id);
    if (otherUser) {
      otherUser.colegas = otherUser.colegas.filter((colegaId) => !colegaId.equals(req.userId));
      await otherUser.save();
    }

    return res.json({ message: 'Colega removido com sucesso.' });
  } catch (err) {
    console.error('Erro no DELETE /users/me/colegas/:id:', err);
    return res.status(500).json({ message: 'Erro ao remover colega.' });
  }
});

/**
 * GET /users/:id/schedule
 * Devolve o horário de um colega (apenas se forem colegas).
 */
router.get('/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const isColega = user.colegas.some((colegaId) => colegaId.equals(id));
    if (!isColega && id !== req.userId) {
      return res.status(403).json({ message: 'Só podes ver horários dos teus colegas.' });
    }

    const Schedule = (await import('../models/Schedule.js')).default;
    const schedule = await Schedule.findOne({ user: id }).lean();

    if (!schedule) {
      return res.json({ user: id, blocos: [] });
    }

    return res.json({
      user: schedule.user,
      blocos: schedule.blocos,
    });
  } catch (err) {
    console.error('Erro no GET /users/:id/schedule:', err);
    return res.status(500).json({ message: 'Erro ao obter horário.' });
  }
});

export default router;
