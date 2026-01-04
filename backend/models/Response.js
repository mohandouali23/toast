import mongoose from 'mongoose';

const ResponseSchema = new mongoose.Schema({
  surveyId: { type: String, required: true },
  userId: { type: String, default: 'anonymous' },
  // answers devient un objet clé: id_db, valeur: codeItem / tableau
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model('Response', ResponseSchema);
