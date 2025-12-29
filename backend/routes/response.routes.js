//response.routes.js
import express from 'express';
import Response from '../models/Response.js';
import ResponseNormalizer from '../services/ResponseNormalizer.js';
import SurveyService from '../services/SurveyService.js';
import ResponseService from '../services/ResponseService.js';


const router = express.Router();
router.post('/:surveyId/run', async (req, res) => {
  const { surveyId } = req.params;
  const action = req.body.action || 'next'; // next par défaut
  const userId = 'anonymous';

  const survey = SurveyService.loadSurvey(surveyId);
  let pageNumber = req.session.pageNumber;
  const responseId = req.session.responseId;

  const stepsOnPage = survey.steps.filter(step => step.page === pageNumber);

  try {
     
    // Sauvegarder ou mettre à jour les réponses
    for (const step of stepsOnPage) {
      let rawValue = req.body[step.id];

      if (step.type === 'accordion' || step.type === 'grid') {
        rawValue = req.body;
      }
console.log("rawvalue",rawValue)
      const answer = ResponseNormalizer.normalize(step, rawValue, {});
      console.log("answer",answer)
      //  Mise à jour existante ou insertion
      await ResponseService.addAnswer(responseId, answer);
    }

    // Déterminer la page suivante ou précédente
    const pages = [...new Set(survey.steps.map(s => s.page))].sort((a,b)=>a-b);
    let index = pages.indexOf(pageNumber);

    if (action === 'prev') {
      index = Math.max(0, index - 1);
    } else {
      index = index + 1;
    }

    const nextPage = pages[index];

    if (nextPage === undefined) {
      req.session.destroy();
      return res.redirect(`/survey/${surveyId}/end`);
    }

    req.session.pageNumber = nextPage;
    res.redirect(`/survey/${surveyId}/run`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur sauvegarde réponses');
  }
});

export default router;
