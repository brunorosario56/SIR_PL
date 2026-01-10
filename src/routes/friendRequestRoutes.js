import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Cria um pedido de amizade
router.post('/', authMiddleware, async (req, res) => {
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
    console.error('Erro no POST /friend-requests:', err);
    return res.status(500).json({ message: 'Erro ao criar pedido de amizade.' });
  }
});

// Lista pedidos pendentes (entrantes e saíntes)
router.get('/', authMiddleware, async (req, res) => {
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
    console.error('Erro no GET /friend-requests:', err);
    return res.status(500).json({ message: 'Erro ao obter pedidos de amizade.' });
  }
});

// Aceita um pedido
router.post('/:id/accept', authMiddleware, async (req, res) => {
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
    console.error('Erro no POST /friend-requests/:id/accept:', err);
    return res.status(500).json({ message: 'Erro ao aceitar pedido de amizade.' });
  }
});

// Alias para aceitar/rejeitar num único endpoint com { decision: 'accept' | 'reject' }
router.post('/:id/respond', authMiddleware, async (req, res) => {
  try {
    const { decision } = req.body || {};

    if (!decision || !['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ message: "decision deve ser 'accept' ou 'reject'." });
    }

    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Pedido de amizade não encontrado.' });
    }

    if (!request.to.equals(req.userId)) {
      return res
        .status(403)
        .json({ message: 'Não podes responder a pedidos de outros utilizadores.' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'Este pedido já foi processado.' });
    }

    if (decision === 'reject') {
      request.status = 'rejected';
      await request.save();
      return res.json({ message: 'Pedido rejeitado.' });
    }

    // accept
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
    console.error('Erro no POST /friend-requests/:id/respond:', err);
    return res.status(500).json({ message: 'Erro ao responder ao pedido de amizade.' });
  }
});

// Rejeita um pedido
router.post('/:id/reject', authMiddleware, async (req, res) => {
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
    console.error('Erro no POST /friend-requests/:id/reject:', err);
    return res.status(500).json({ message: 'Erro ao rejeitar pedido de amizade.' });
  }
});

export default router;
