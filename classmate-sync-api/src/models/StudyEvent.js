import mongoose from 'mongoose';
import Group from './Group.js';

const { Schema } = mongoose;

const studyEventSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    criador: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    titulo: { type: String, required: true, trim: true },
    descricao: { type: String, default: '' },
    inicio: { type: Date, required: true },
    fim: { type: Date, required: true },
    local: { type: String, default: '' },
  },
  { timestamps: true }
);

studyEventSchema.path('titulo').validate(function validateTitulo(titulo) {
  return typeof titulo === 'string' && titulo.trim().length > 0;
}, 'O campo "titulo" não pode estar vazio.');

studyEventSchema.path('group').validate(async function validateGroupExists(groupId) {
  if (!groupId) return false;
  const exists = await Group.exists({ _id: groupId });
  return Boolean(exists);
}, 'O grupo indicado não existe.');

studyEventSchema.pre('validate', function validateDates(next) {
  if (this.inicio && this.fim && this.inicio >= this.fim) {
    this.invalidate('inicio', 'O campo "inicio" deve ser anterior ao campo "fim".');
  }
  next();
});

const StudyEvent = mongoose.model('StudyEvent', studyEventSchema);

export default StudyEvent;
