import mongoose from 'mongoose';

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

const StudyEvent = mongoose.model('StudyEvent', studyEventSchema);

export default StudyEvent;
