//survey.routes.js
// -----------------gestion du questionnaire-----------------
import express from 'express';
import SurveyService from '../services/SurveyService.js';
import AutoCompleteUtils from '../services/AutoCompleteUtils.js';
import AccordionUtils from '../services/AccordionUtils.js';
import Response from '../models/Response.js';
import path from 'path';
import ExcelService from '../services/ExcelService.js';
import ResponseService from '../services/ResponseService.js';

const router = express.Router();

// ------------------ Télécharger Excel ------------------
router.get('/:surveyId/download', async (req, res) => {
  const { surveyId } = req.params;
  try {
    const responses = await Response.find({ surveyId });
    const surveyFile = path.resolve(`./backend/data/${surveyId}.json`);
    const outputFile = path.resolve(`./backend/data/${surveyId}_responses.xlsx`);
    await ExcelService.generateExcelWide(responses, surveyFile, outputFile);
    res.download(outputFile);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur génération Excel');
  }
});
// ------------------ Page de fin ------------------
router.get('/:surveyId/end', (req, res) => {
  const { surveyId } = req.params;
  const survey = SurveyService.loadSurvey(surveyId);

  // Nettoyer la session (fin de parcours)
  req.session.destroy(err => {
    if (err) console.error('Erreur destruction session:', err);
  });
console.log("sessiondestroy")
  const step = { type: 'end', id: 'end', title: 'Fin du questionnaire' };

  res.render('end', { 
    surveyId,
    restartUrl: `/survey/${surveyId}/run`,
    downloadUrl: `/survey/${surveyId}/download`
  }, (err, html) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors du rendu de la page de fin');
    }

    res.render('layout', { survey, step, content: html });
  });
});


// ------------------ Utilitaire : récupérer steps par page ------------------

function prepareStepForPage(step) {
  // Flags pour Mustache
  step.type_text = step.type === 'text';
  step.type_single_choice = step.type === 'single_choice';
  step.type_multiple_choice = step.type === 'multiple_choice';
  step.type_spinner = step.type === 'spinner';
  step.type_autocomplete = step.type === 'autocomplete';
  step.type_grid = step.type === 'grid';
  step.type_accordion = step.type === 'accordion';
  return step;
}
// ------------------ Route pages dynamiques ------------------
router.get('/:surveyId/run', async (req, res) => {
  const { surveyId } = req.params;
  const survey = SurveyService.loadSurvey(surveyId);

  // Toujours initialiser une nouvelle session
  if (!req.session.pageNumber) {
    req.session.pageNumber = survey.steps[0].page;
  }

  //  TOUJOURS créer un nouveau document au démarrage
  if (!req.session.responseId) {
    const response = await ResponseService.createSurveyDocument(
      surveyId,
      'anonymous',
      {}
    );
    req.session.responseId = response._id;
    console.log('🆕 Nouveau responseId:', response._id);
  }

  const pageNumber = req.session.pageNumber;

  const stepsOnPage = survey.steps.filter(step => step.page === pageNumber);
  let options = [];
  const preparedSteps = stepsOnPage.map(step => {
    
    if (step.type === 'grid') step = SurveyService.prepareGridB(step);
    if (step.type === 'autocomplete') {
      options = AutoCompleteUtils.getAutocompleteOptions(step);
    }
    if (step.type === 'accordion') {
      step.sections = step.sections.map(section => ({
        ...section,
        questions: section.questions.map(q =>
          AccordionUtils.prepareQuestionFlags(q)
        )
      }));
    }
    return prepareStepForPage(step);
  });

  // preparedSteps.forEach(step => async{
  //   const response = await ResponseService.getLatestResponse(surveyId, 'anonymous');
  //   if (response?.answers?.has(step.id)) {
  //     step.value = response.answers.get(step.id).value; // ou answer.value selon structure
  //   }
  // });
  
  res.render('questions/page', {
    survey,
    steps: preparedSteps,
    options
  });
});

export default router;