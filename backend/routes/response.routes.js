// routes/response.routes.js
import express from 'express';
import SurveyService from '../services/SurveyService.js';
import ResponseService from '../services/ResponseService.js';
import ResponseNormalizer from '../services/ResponseNormalizer.js';
import RotationQueueUtils from '../services/RotationQueueUtils.js';
import RotationService from '../services/RotationService.js';
import NavigationRuleService from '../services/NavigationRuleService.js';

const router = express.Router();

router.post('/:surveyId/run', async (req, res) => {
  const { surveyId } = req.params;
  const action = req.body.action || 'next';
  const userId = 'anonymous';

  const survey = SurveyService.loadSurvey(surveyId);

  /* =========================
     1️⃣ Init session
  ========================= */
  if (!req.session.answers) req.session.answers = {};
  if (!req.session.rotationQueueDone) req.session.rotationQueueDone = {};

  /* =========================
     2️⃣ Créer document réponse si pas encore existant
  ========================= */
  if (!req.session.responseId) {
    const response = await ResponseService.createSurveyDocument(
      surveyId,
      userId,
      {}
    );
    req.session.responseId = response._id;
  }

  const responseId = req.session.responseId;

  /* =========================
     3️⃣ Déterminer question courante
  ========================= */
  const { step: currentStep, wrapper: currentStepWrapper, isInRotation } =
    RotationService.getCurrentStep(req.session, survey);

  const currentPage = currentStep.page;

  /* =========================
     4️⃣ Déterminer toutes les questions à afficher sur la page
  ========================= */
  const stepsOnPage = isInRotation
    ? [currentStep]
    : survey.steps.filter(s => s.page === currentPage);

  const stepWrappersOnPage = isInRotation
    ? [currentStepWrapper]
    : stepsOnPage.map(step => ({ step }));

  /* =========================
     5️⃣ Sauvegarder réponses
  ========================= */
  if (action === 'next' && stepsOnPage.length > 0) {
    console.log(`💾 Sauvegarde pour ${stepsOnPage.length} étape(s) sur cette page`);

    for (let i = 0; i < stepsOnPage.length; i++) {
      const step = stepsOnPage[i];
      const stepWrapper = stepWrappersOnPage[i];

      let rawValue = req.body[step.id];

      // Gestion types complexes
      if (['grid', 'accordion', 'single_choice', 'multiple_choice'].includes(step.type)) {
        rawValue = req.body;
      }

      if (rawValue !== undefined) {
        const normalized = ResponseNormalizer.normalize(step, rawValue, stepWrapper.optionIndex);
        await ResponseService.addAnswer(responseId, normalized);

        // Stocker dans session
        if (!step.isSubQuestion) {
          let mainValue;
          switch (step.type) {
            case 'multiple_choice':
              mainValue = req.body[step.id] || [];
              break;
            case 'single_choice':
              mainValue = req.body[step.id] || '';
              break;
            default:
              mainValue = rawValue;
          }

          if (isInRotation && stepWrapper.optionIndex !== undefined) {
            req.session.answers[`${step.id}_${stepWrapper.optionIndex}`] = mainValue;
          } else {
            req.session.answers[step.id] = mainValue;
          }
        }
      }
    }
  }

  /* =========================
     6️⃣ Initialiser rotation si nécessaire
  ========================= */
  const rotationInit = RotationService.initRotation({
    session: req.session,
    survey,
    answers: req.session.answers,
    action,
    generateQueue: RotationQueueUtils.generateRotationQueue
  });

  if (rotationInit) {
    if (!rotationInit.nextStepId || rotationInit.nextStepId === 'FIN') {
      req.session.destroy();
      return res.redirect(`/survey/${surveyId}/end`);
    }
    req.session.currentStepId = rotationInit.nextStepId;
    return res.redirect(`/survey/${surveyId}/run`);
  }

  /* =========================
     7️⃣ Avancer dans rotation
  ========================= */
  let nextStepId;
  const rotationAdvance = RotationService.advanceRotation({
    session: req.session,
    survey,
    currentStep,
    action
  });

  if (rotationAdvance) {
    nextStepId = rotationAdvance.nextStepId;

    if (!nextStepId && rotationAdvance.fallbackFrom) {
      nextStepId = NavigationRuleService.resolve(
        rotationAdvance.fallbackFrom,
        req.session.answers[rotationAdvance.fallbackFrom.id],
        survey.steps
      );
    }
  }

  /* =========================
     8️⃣ Navigation normale si pas de rotation
  ========================= */
  if (!nextStepId) {
    nextStepId = NavigationRuleService.resolve(
      currentStep,
      req.session.answers[currentStep.id],
      survey.steps
    );
  }

  /* =========================
     9️⃣ Fin du questionnaire
  ========================= */
  if (!nextStepId || nextStepId === 'FIN') {
    req.session.destroy();
    return res.redirect(`/survey/${surveyId}/end`);
  }

  /* =========================
     🔟 Aller à la prochaine étape
  ========================= */
  req.session.currentStepId = nextStepId;

  console.log('--- Session actuelle ---');
  console.log('- answers:', req.session.answers);
  console.log('- rotationQueue:', req.session.rotationQueue?.length || 0);
  console.log('------------------------');

  return res.redirect(`/survey/${surveyId}/run`);
});

export default router;



// // response.routes.js
// import express from 'express';
// import SurveyService from '../services/SurveyService.js';
// import ResponseService from '../services/ResponseService.js';
// import ResponseNormalizer from '../services/ResponseNormalizer.js';
// import RotationQueueUtils from '../services/RotationQueueUtils.js';
// import NavigationRuleService from '../services/NavigationRuleService.js';
// import RotationService from '../services/RotationService.js';


// const router = express.Router();

// router.post('/:surveyId/run', async (req, res) => {
//   const { surveyId } = req.params;
//   const action = req.body.action || 'next';
//   const userId = 'anonymous';

//   const survey = SurveyService.loadSurvey(surveyId);

//   /* =========================
//      1️⃣ Init session
//   ========================= */
//   if (!req.session.answers) req.session.answers = {};
//   if (!req.session.rotationQueueDone) req.session.rotationQueueDone = {};

//   /* =========================
//      2️⃣ Créer document réponse
//   ========================= */
//   if (!req.session.responseId) {
//     const response = await ResponseService.createSurveyDocument(
//       surveyId,
//       userId,
//       {}
//     );
//     req.session.responseId = response._id;
//   }

//   const responseId = req.session.responseId;

//   /* =========================
//      3️⃣ Déterminer question courante
//   ========================= */
//   let currentStep;
//   let currentStepWrapper;
//   let isInRotation = false;

//   // Si on a une rotation en cours
//   if (req.session.rotationQueue?.length) {
//     currentStepWrapper = req.session.rotationQueue[0];
//     currentStep = req.session.rotationQueue[0].step;
//     isInRotation = true;
// console.log('🎯 En rotation:', currentStep.id, 'pour option:', currentStepWrapper.optionLabel);
//   } 
//   // Navigation normale
//   else if (req.session.currentStepId) {
//     currentStep = survey.steps.find(s => s.id === req.session.currentStepId);
//   } 
//   // Démarrage du questionnaire
//   else {
//     currentStep = survey.steps
//       .filter(s => s.page !== undefined)
//       .sort((a, b) => a.page - b.page)[0];
//     req.session.currentStepId = currentStep.id;
//   }

//   const currentPage = currentStep.page;

//   /* =========================
//      4️⃣ Questions à afficher
//   ========================= */
//   let stepsOnPage = [];
//   let stepWrappersOnPage = [];
//   if (isInRotation) {
//     stepsOnPage = [currentStep];
//     stepWrappersOnPage = [currentStepWrapper];
//   } else {
//     stepsOnPage = survey.steps.filter(s => s.page === currentPage);
//      stepWrappersOnPage = stepsOnPage.map(step => ({ step }));
//   }

//   /* =========================
//      5️⃣ Sauvegarde réponses (AVANT navigation)
//   ========================= */
//   if (action === 'next' && stepsOnPage.length > 0) {
//     console.log(`💾 Sauvegarde pour ${stepsOnPage.length} étape(s) sur cette page`);
    
//     for (let i = 0; i < stepsOnPage.length; i++) {
//       const step = stepsOnPage[i];
//       const stepWrapper = stepWrappersOnPage[i];

//       let rawValue = req.body[step.id];
      
//       // Log pour débogage
//       console.log(`📝 Traitement step ${step.id}:`, {
//         type: step.type,
//         rawValue: rawValue,
//         optionIndex: stepWrapper.optionIndex,
//         optionLabel: stepWrapper.optionLabel
//       });

//       // Gestion spéciale pour les types complexes
//       if (['grid', 'accordion', 'single_choice', 'multiple_choice'].includes(step.type)) {
//         rawValue = req.body;
//         console.log(`🔧 Type ${step.type} - rawValue:`, rawValue[step.id]);
//       }

//       if (rawValue !== undefined) {
//         // Normaliser la réponse
//         const normalized = ResponseNormalizer.normalize(step, rawValue,stepWrapper.optionIndex );
//  console.log(`✅ Normalisé pour ${step.id} (optionIndex: ${stepWrapper.optionIndex}):`, normalized);        
//         // Sauvegarder dans la DB
//         await ResponseService.addAnswer(responseId, normalized);
        
//         // Sauvegarder dans la session
//         if (!step.isSubQuestion) {
//           let mainValue;
          
//           switch (step.type) {
//             case 'multiple_choice':
//               mainValue = req.body[step.id] || [];
//               break;
//             case 'single_choice':
//               mainValue = req.body[step.id] || '';
//               break;
//             default:
//               mainValue = rawValue;
//           }
          
//          // Pour la rotation, on peut stocker avec un suffixe d'option
//           if (isInRotation && stepWrapper.optionIndex !== undefined) {
//             const answerKey = `${step.id}_${stepWrapper.optionIndex}`;
//             req.session.answers[answerKey] = mainValue;
//             console.log(`💾 Session sauvegardée ${answerKey}:`, mainValue);
//           } else {
//             req.session.answers[step.id] = mainValue;
//             console.log(`💾 Session sauvegardée ${step.id}:`, mainValue);
//           }
//         }
//       } else {
//         console.log(`⚠️ Pas de valeur pour ${step.id}`);
//       }
//     }
//   }

// /* =========================
//      6️⃣ Initialiser la rotation
// ========================= */
// if (action === 'next' && !req.session.rotationQueue) {
//   for (const step of survey.steps) {
//     if (
//       step.repeatFor &&
//       req.session.answers[step.repeatFor] &&
//       !req.session.rotationQueueDone[step.repeatFor]
//     ) {

//       // ✅ TOUJOURS stocker dans une variable locale
//       const rotationQueue = RotationQueueUtils.generateRotationQueue(
//         survey,
//         step.repeatFor,
//         req.session.answers
//       );

//       /* 🔴 CAS EXCLUSIVE → PAS DE ROTATION */
//       if (rotationQueue.length === 0) {
//         console.log(`🚫 Rotation annulée (exclusive) pour ${step.repeatFor}`);

//         req.session.rotationQueueDone[step.repeatFor] = true;

//         const parentStep = survey.steps.find(s => s.id === step.repeatFor);
//         const nextStepId = parentStep?.redirection || 'FIN';

//         if (!nextStepId || nextStepId === 'FIN') {
//           req.session.destroy();
//           return res.redirect(`/survey/${surveyId}/end`);
//         }

//         req.session.currentStepId = nextStepId;
//         return res.redirect(`/survey/${surveyId}/run`);
//       }

//       /* 🟢 CAS NORMAL → rotation */
//       req.session.rotationQueue = rotationQueue;
//       req.session.rotationQueueDone[step.repeatFor] = true;

//       req.session.currentStepId = rotationQueue[0].step.id;
//       return res.redirect(`/survey/${surveyId}/run`);
//     }
//   }
// }

//   /* =========================
//      7️⃣ Déterminer la prochaine étape
//   ========================= */
//   let nextStepId;
//   //let nextStep;

//   if (req.session.rotationQueue?.length) {
//     console.log(`🔄 Rotation en cours (${req.session.rotationQueue.length} restants)`);
    
//     if (action === 'next') {
//       // Supprimer l'étape actuelle (déjà traitée)
//       const processed = req.session.rotationQueue.shift();
//       console.log(`✅ Étape traitée: ${processed?.step?.id}`);
      
//       // Vérifier s'il reste des étapes
//       if (req.session.rotationQueue.length > 0) {
//         // Passer à la prochaine étape de rotation
//         nextStepId = req.session.rotationQueue[0].step.id;
//        console.log(`➡️ Prochaine étape rotation: ${nextStepId} (option: ${req.session.rotationQueue[0].optionLabel})`);
//       } else {
//         // Fin de la rotation
//         console.log('🏁 Fin de la rotation');
//         delete req.session.rotationQueue;
        
//         // Trouver la question parente
//         const parentStep = survey.steps.find(s => s.id === processed?.parent);
//         if (parentStep?.redirection) {
//           nextStepId = parentStep.redirection;
//           console.log(`📍 Redirection après rotation: ${nextStepId}`);
//         } else {
//           // Navigation normale depuis la dernière étape
//           nextStepId = NavigationRuleService.resolve(
//             processed?.step || currentStep,
//             req.session.answers[processed?.step?.id || currentStep.id],
//             survey.steps
//           );
//         }
//       }
//     } else {
//       // Pour "prev", rester sur la même étape
//       nextStepId = currentStep.id;
//     }
//   } else {
//     // Navigation normale
//     nextStepId = NavigationRuleService.resolve(
//       currentStep,
//       req.session.answers[currentStep.id],
//       survey.steps
//     );
//     console.log(`➡️ Navigation normale: ${nextStepId}`);
//   }

//   /* =========================
//      8️⃣ FIN questionnaire
//   ========================= */
//   if (!nextStepId || nextStepId === 'FIN') {
//     console.log('🏁 Fin du questionnaire');
//     req.session.destroy();
//     return res.redirect(`/survey/${surveyId}/end`);
//   }

//   /* =========================
//      9️⃣ Aller à la prochaine question
//   ========================= */
//   req.session.currentStepId = nextStepId;
//   console.log(`📍 Prochaine étape définie: ${nextStepId}`);
//   console.log('--- Session actuelle ---');
//   console.log('- answers:', req.session.answers);
//   console.log('- rotationQueue:', req.session.rotationQueue?.length || 0);
//   console.log('------------------------');

//   return res.redirect(`/survey/${surveyId}/run`);
// });

// export default router;