/*affichage de la prochaine question
sauvegarde des réponses
gestion des rotations (sous-questions répétées)
navigation normale ou conditionnelle
fin du questionnaire*/

import express from 'express';
import ResponseController from '../controllers/response.controller.js';

const router = express.Router();
router.post('/:surveyId/run', async (req, res) => {
  await ResponseController.run(req, res);
});

export default router;
