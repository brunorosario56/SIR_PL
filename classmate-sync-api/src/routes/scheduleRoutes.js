import express from 'express';
import Schedule from '../models/Schedule.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /schedules/me
 * Devolve o horário do utilizador autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ user: req.userId }).lean();

    if (!schedule) {
      // ainda não tem horário definido
      return res.json({
        user: req.userId,
        blocos: [],
      });
    }

    return res.json({
      user: schedule.user,
      blocos: schedule.blocos,
    });
  } catch (err) {
    console.error('Erro no GET /schedules/me:', err);
    return res.status(500).json({ message: 'Erro ao obter horário.' });
  }
});

/**
 * PUT /schedules/me
 * Substitui o horário inteiro do utilizador autenticado
 * Body esperado:
 * {
 *   "blocos": [
 *     { "disciplina": "...", "sala": "...", "diaSemana": 1, "horaInicio": "09:00", "horaFim": "10:30" },
 *     ...
 *   ]
 * }
 */
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { blocos } = req.body;

    if (!Array.isArray(blocos)) {
      return res.status(400).json({ message: 'O campo "blocos" deve ser um array.' });
    }

    // validação mínima
    for (const bloco of blocos) {
      if (
        !bloco.disciplina ||
        !bloco.diaSemana ||
        !bloco.horaInicio ||
        !bloco.horaFim
      ) {
        return res.status(400).json({
          message: 'Cada bloco deve ter disciplina, diaSemana, horaInicio e horaFim.',
        });
      }
    }

    // upsert = cria se não existir, atualiza se já houver
    const schedule = await Schedule.findOneAndUpdate(
      { user: req.userId },
      { user: req.userId, blocos },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      message: 'Horário atualizado com sucesso.',
      schedule,
    });
  } catch (err) {
    console.error('Erro no PUT /schedules/me:', err);
    return res.status(500).json({ message: 'Erro ao guardar horário.' });
  }
});

export default router;
