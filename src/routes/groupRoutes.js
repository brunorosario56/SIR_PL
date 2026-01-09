import express from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Schedule from '../models/Schedule.js';
import StudyEvent from '../models/StudyEvent.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { computeCommonFreeSlots } from '../utils/slots.js';
import { badRequest, forbidden, notFound, serverError } from '../utils/httpErrors.js';

const router = express.Router();

/**
 * POST /groups
 * Body: { nome: string, descricao?: string }
 * Cria um grupo de estudo. O utilizador autenticado fica como owner e membro.
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nome, descricao, membros } = req.body;

    if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
      return badRequest(res, 'Dados de grupo inválidos.', ['nome obrigatório, não vazio']);
    }

    const group = await Group.create({
      nome,
      descricao,
      owner: req.userId,
      membros: [req.userId],
    });

    return res.status(201).json({
      message: 'Grupo criado com sucesso.',
      group: {
        id: group._id,
        _id: group._id,
        nome: group.nome,
        descricao: group.descricao,
        owner: group.owner,
        membros: group.membros,
      },
    });
  } catch (err) {
    console.error('Erro no POST /groups:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

/**
 * POST /groups/:id/members
 * Body: { emails?: string[], userIds?: string[] }
 * Adiciona membros ao grupo (apenas o owner pode adicionar).
 */
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { emails, userIds } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Dados inválidos.', ['id inválido']);
    }

    const group = await Group.findById(id);
    if (!group) {
      return notFound(res, 'Grupo não encontrado.');
    }

    if (!group.owner.equals(req.userId)) {
      return forbidden(res, 'Só o owner pode adicionar membros.');
    }

    const emailList = Array.isArray(emails) ? emails.filter(Boolean) : [];
    const userIdList = Array.isArray(userIds) ? userIds.filter(Boolean) : [];

    if (emailList.length === 0 && userIdList.length === 0) {
      return badRequest(res, 'Dados inválidos.', ['Pelo menos um email ou userId']);
    }

    for (const candidateId of userIdList) {
      if (!mongoose.isValidObjectId(candidateId)) {
        return badRequest(res, 'Dados inválidos.', ['O array "userIds" tem IDs inválidos.']);
      }
    }

    const usersFromIds = userIdList.length
      ? await User.find({ _id: { $in: [...new Set(userIdList)] } }).select('_id').lean()
      : [];
    if (userIdList.length && usersFromIds.length !== [...new Set(userIdList)].length) {
      return badRequest(res, 'Dados inválidos.', ['Um ou mais utilizadores em "userIds" não existem.']);
    }

    const usersFromEmails = emailList.length
      ? await User.find({ email: { $in: [...new Set(emailList)] } }).select('_id email').lean()
      : [];
    if (emailList.length && usersFromEmails.length !== [...new Set(emailList)].length) {
      return badRequest(res, 'Dados inválidos.', ['Um ou mais emails em "emails" não correspondem a utilizadores.']);
    }

    const idsToAdd = [
      ...usersFromIds.map((u) => u._id.toString()),
      ...usersFromEmails.map((u) => u._id.toString()),
    ];
    const uniqueIdsToAdd = [...new Set(idsToAdd)];

    const current = new Set(group.membros.map((m) => m.toString()));
    for (const newId of uniqueIdsToAdd) {
      if (!current.has(newId)) {
        group.membros.push(new mongoose.Types.ObjectId(newId));
      }
    }

    await group.save();

    return res.status(200).json({
      message: 'Membros adicionados com sucesso.',
      group: {
        id: group._id,
        _id: group._id,
        membros: group.membros,
      },
    });
  } catch (err) {
    console.error('Erro no POST /groups/:id/members:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

/**
 * GET /groups/me
 * Lista os grupos onde o utilizador autenticado é membro.
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ membros: req.userId })
      .select('_id nome descricao owner membros')
      .lean();

    const mapped = groups.map((g) => ({
      id: g._id,
      _id: g._id,
      nome: g.nome,
      descricao: g.descricao,
      owner: g.owner,
      membros: g.membros,
    }));

    return res.json(mapped);
  } catch (err) {
    console.error('Erro no GET /groups/me:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

/**
 * GET /groups/:id/slots
 * Devolve slots livres em comum entre todos os membros do grupo.
 */
router.get('/:id/slots', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Dados inválidos.', ['id inválido']);
    }

    const group = await Group.findById(id);
    if (!group) {
      return notFound(res, 'Grupo não encontrado.');
    }

    const isMember = group.membros.some((m) => m.equals(req.userId));
    if (!isMember) {
      return forbidden(res, 'Só membros do grupo podem ver os slots.');
    }

    const memberIds = group.membros;

    const schedules = await Schedule.find({ user: { $in: memberIds } })
      .select('user blocos')
      .lean();

    const slots = computeCommonFreeSlots({
      members: memberIds,
      schedules,
      dayStart: '08:00',
      dayEnd: '22:00',
    });

    return res.json({
      groupId: group._id,
      slots,
    });
  } catch (err) {
    console.error('Erro no GET /groups/:id/slots:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

/**
 * POST /groups/:id/events
 * Cria um evento de estudo associado a um grupo.
 */
router.post('/:id/events', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Dados de evento inválidos.', ['id inválido']);
    }

    const group = await Group.findById(id);
    if (!group) {
      return notFound(res, 'Grupo não encontrado.');
    }

    const isMember = group.membros.some((m) => m.equals(req.userId));
    if (!isMember) {
      return forbidden(res, 'Só membros do grupo podem criar eventos.');
    }

    const { titulo, descricao, inicio, fim, local } = req.body;

    const eventErrors = [];
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
      eventErrors.push('titulo obrigatório');
    }

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    if (!inicio || Number.isNaN(inicioDate.getTime())) {
      eventErrors.push('inicio obrigatório (ISO)');
    }
    if (!fim || Number.isNaN(fimDate.getTime())) {
      eventErrors.push('fim obrigatório (ISO)');
    }
    if (
      inicio && fim &&
      !Number.isNaN(inicioDate.getTime()) &&
      !Number.isNaN(fimDate.getTime()) &&
      inicioDate >= fimDate
    ) {
      eventErrors.push('inicio deve ser anterior a fim');
    }

    if (eventErrors.length > 0) {
      return badRequest(res, 'Dados de evento inválidos.', eventErrors);
    }

    const event = await StudyEvent.create({
      group: group._id,
      criador: req.userId,
      titulo,
      descricao,
      inicio: inicioDate,
      fim: fimDate,
      local,
    });

    return res.status(201).json({
      id: event._id,
      _id: event._id,
      group: event.group,
      criador: event.criador,
      titulo: event.titulo,
      descricao: event.descricao,
      inicio: event.inicio,
      fim: event.fim,
      local: event.local,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  } catch (err) {
    console.error('Erro no POST /groups/:id/events:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

/**
 * GET /groups/:id/events
 * Lista eventos de estudo do grupo, ordenados por inicio ascendente.
 */
router.get('/:id/events', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return badRequest(res, 'Dados inválidos.', ['id inválido']);
    }

    const group = await Group.findById(id);
    if (!group) {
      return notFound(res, 'Grupo não encontrado.');
    }

    const isMember = group.membros.some((m) => m.equals(req.userId));
    if (!isMember) {
      return forbidden(res, 'Só membros do grupo podem ver eventos.');
    }

    const events = await StudyEvent.find({ group: group._id })
      .sort({ inicio: 1 })
      .lean();

    const mapped = events.map((e) => ({
      id: e._id,
      _id: e._id,
      group: e.group,
      criador: e.criador,
      titulo: e.titulo,
      descricao: e.descricao,
      inicio: e.inicio,
      fim: e.fim,
      local: e.local,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return res.json(mapped);
  } catch (err) {
    console.error('Erro no GET /groups/:id/events:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

export default router;
