import express from 'express';
import Schedule from '../models/Schedule.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { badRequest, serverError } from '../utils/httpErrors.js';

const router = express.Router();

function parseHHMMToMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null;
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hhStr, mmStr] = hhmm.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

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
    return serverError(res, 'Erro interno do servidor.');
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
      return badRequest(res, 'Dados de horário inválidos.', ['O campo "blocos" deve ser um array.']);
    }

    const errors = [];
    for (let i = 0; i < blocos.length; i += 1) {
      const bloco = blocos[i];

      if (!bloco?.disciplina) {
        errors.push(`blocos[${i}]: disciplina é obrigatória`);
      }

      const diaSemana = Number(bloco?.diaSemana);
      if (!Number.isInteger(diaSemana) || diaSemana < 1 || diaSemana > 7) {
        errors.push(`blocos[${i}]: diaSemana deve estar entre 1 e 7`);
      }

      const inicioMinutes = parseHHMMToMinutes(bloco?.horaInicio);
      const fimMinutes = parseHHMMToMinutes(bloco?.horaFim);

      if (inicioMinutes == null) {
        errors.push(`blocos[${i}]: horaInicio deve estar no formato HH:MM`);
      }
      if (fimMinutes == null) {
        errors.push(`blocos[${i}]: horaFim deve estar no formato HH:MM`);
      }
      if (inicioMinutes != null && fimMinutes != null && inicioMinutes >= fimMinutes) {
        errors.push(`blocos[${i}]: horaInicio deve ser menor que horaFim`);
      }
    }

    if (errors.length > 0) {
      return badRequest(res, 'Dados de horário inválidos.', errors);
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
    return serverError(res, 'Erro interno do servidor.');
  }
});

export default router;
