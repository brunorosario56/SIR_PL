import express from 'express';
import Group from '../models/Group.js';
import StudyEvent from '../models/StudyEvent.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { serverError } from '../utils/httpErrors.js';

const router = express.Router();

/**
 * GET /events/me
 * Lista todos os eventos futuros em grupos onde o utilizador autenticado é membro.
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ membros: req.userId }).select('_id').lean();
    const groupIds = groups.map((g) => g._id);

    if (groupIds.length === 0) {
      return res.json([]);
    }

    const now = new Date();
    const events = await StudyEvent.find({
      group: { $in: groupIds },
      inicio: { $gte: now },
    })
      .sort({ inicio: 1 })
      .lean();

    const mapped = events.map((e) => ({
      id: e._id,
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
    console.error('Erro no GET /events/me:', err);
    return serverError(res, 'Erro interno do servidor.');
  }
});

export default router;
