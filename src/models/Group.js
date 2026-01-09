import mongoose from 'mongoose';

const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, default: '' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    membros: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

groupSchema.pre('validate', function ensureOwnerAndUniqueMembers(next) {
  if (!this.membros) this.membros = [];

  if (this.owner) {
    const ownerAlreadyMember = this.membros.some((id) => id?.equals?.(this.owner));
    if (!ownerAlreadyMember) this.membros.push(this.owner);
  }

  // dedupe
  const unique = [...new Set(this.membros.map((id) => id.toString()))];
  this.membros = unique.map((id) => new mongoose.Types.ObjectId(id));

  if (typeof next === 'function') next();
});

groupSchema.path('membros').validate(function validateOwnerIsMember(membros) {
  if (!this.owner) return true;
  return Array.isArray(membros) && membros.some((id) => id?.equals?.(this.owner));
}, 'O owner deve estar incluído na lista de membros.');

const Group = mongoose.model('Group', groupSchema);

export default Group;
