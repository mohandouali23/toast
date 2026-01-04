//survey.routes.js
// -----------------gestion du questionnaire-----------------
import express from 'express';
import SurveyService from '../services/SurveyService.js';
import AutoCompleteUtils from '../services/AutoCompleteUtils.js';
import AccordionUtils from '../services/AccordionUtils.js';
import Response from '../models/Response.js';
import path from 'path';
import ExcelService from '../services/ExcelService.js';
import AnswerPrefillUtils from '../services/AnswerPrefillUtils.js';

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

// ------------------ Route pages dynamiques ------------------
router.get('/:surveyId/run', async (req, res) => {
  const { surveyId } = req.params;
  const survey = SurveyService.loadSurvey(surveyId);

  if (!req.session.answers) req.session.answers = {};

  // Utiliser currentStepId pour savoir quelle question afficher
  if (!req.session.currentStepId) {
    const firstStep = survey.steps
      .filter(s => s.page !== undefined)
      .sort((a, b) => a.page - b.page)[0];
    req.session.currentStepId = firstStep.id;
  }

  const currentStep = survey.steps.find(
    step => step.id === req.session.currentStepId
  );

  if (!currentStep) {
    return res.redirect(`/survey/${surveyId}/end`);
  }
  const currentPage = currentStep.page;
  // Afficher toutes les questions de la même page que currentStep
  let stepsOnPage = survey.steps.filter(step => step.page === currentPage);

   // Rotation
   if (Array.isArray(req.session.rotationQueue) && req.session.rotationQueue.length > 0) {
    stepsOnPage = [req.session.rotationQueue[0].step];
  } else {
    // pas de rotation en cours → page normale
    stepsOnPage = survey.steps.filter(step => step.page === currentPage);
  }
  
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
 // --- Pré-remplir selon le type ---
 switch(step.type) {
  case 'spinner':
   //console.log(" text spinner step & req session answer",   req.session.answers );

    step.value = AnswerPrefillUtils.spinner(step, req.session.answers);
    break;
  case 'text':
 
   //console.log(" text spinner step & req session answer",   req.session.answers );

    step.value = AnswerPrefillUtils.text(step, req.session.answers);
    break;
  case 'single_choice':
   // console.log("single step & req session answer", req.session.answers );

    AnswerPrefillUtils.singleChoice(step, req.session.answers);
    break;
  case 'multiple_choice':
    AnswerPrefillUtils.multipleChoice(step, req.session.answers);
    break;
  case 'autocomplete':
    //console.log("autocomplete step & req session answer", req.session.answers );

    AnswerPrefillUtils.autocomplete(step, req.session.answers);
    break;
    
  case 'accordion':
   console.log("accordion step & req session answer", req.session.answers );

    AnswerPrefillUtils.accordion(step, req.session.answers);
    break;
  case 'grid':
    //console.log("grid step & req session answer",req.session.answers );

    AnswerPrefillUtils.grid(step, req.session.answers);
    break;
  default:
    break;
}
    return SurveyService.prepareStepForPage(step);
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
  },
    (err, html) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Erreur rendu page');
      }
     //  Injecter dans layout.mustache
      res.render('layout', {
        survey,
        step: {
         id: `page-${currentPage}`,
          type: 'page',
          title: survey.title
        },
        content: html
      });
    }
  );
});

export default router;