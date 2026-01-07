import express from 'express';
import * as SurveyController from '../controllers/survey.controller.js';

const router = express.Router();

router.get('/:surveyId/download', SurveyController.downloadSurveyResponses);
router.get('/:surveyId/end', SurveyController.endSurvey);
router.get('/:surveyId/run', SurveyController.runSurveyPage);

export default router;
