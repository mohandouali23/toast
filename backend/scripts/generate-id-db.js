import fs from 'fs';
import path from 'path';

/* -------- utils -------- */
function generateIdDB() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/* -------- recursive enrich -------- */
function enrichStep(step) {
  if (!step.id_db) {
    step.id_db = generateIdDB();
  }

  if (Array.isArray(step.options)) {
    step.options.forEach(opt => {
      if (opt.requiresSubQst && typeof opt.requiresSubQst === 'object') {

        // sous-question principale
        if (opt.requiresSubQst.id && !opt.requiresSubQst.id_db) {
          opt.requiresSubQst.id_db = generateIdDB();
        }

        // sous-sous-questions
        if (Array.isArray(opt.requiresSubQst.subQuestions)) {
          opt.requiresSubQst.subQuestions.forEach(sub => {
            if (!sub.id_db) {
              sub.id_db = generateIdDB();
            }
          });
        }
      }
    });
  }
}

/* -------- main -------- */
const surveyPath = path.resolve('data/survey_666.json');
const survey = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));

survey.steps.forEach(step => enrichStep(step));

fs.writeFileSync(surveyPath, JSON.stringify(survey, null, 2));

console.log(' id_db générés ');


//backend> node scripts/generate-id-db.js