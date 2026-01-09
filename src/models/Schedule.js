import mongoose from 'mongoose';

const blocoSchema = new mongoose.Schema({
  disciplina: { type: String, required: true },
  sala: { type: String },
  // 1 = segunda, 7 = domingo (ajusta se quiseres outro esquema)
  diaSemana: { type: Number, required: true, min: 1, max: 7 },
  // guardamos como string "HH:MM" para simplificar
  horaInicio: { type: String, required: true },
  horaFim: { type: String, required: true },
});

const scheduleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    blocos: [blocoSchema],
  },
  { timestamps: true }
);

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
