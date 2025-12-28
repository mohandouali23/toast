import fs from 'fs';
import path from 'path';

export default class ResponseFormatter {
  static formatResponse(response, surveyFile) {
    const survey = JSON.parse(fs.readFileSync(surveyFile, 'utf-8'));
    const formatted = {};

    Object.entries(response.answers).forEach(([id_db, codeItem]) => {
      const question = survey.steps.find(s => s.id_db === id_db);
      if (!question) return;

      if (Array.isArray(codeItem)) {
        formatted[id_db] = codeItem.map(c => question.options.find(o => o.codeItem === c)?.label || c);
      } else {
        formatted[id_db] = question.options.find(o => o.codeItem === codeItem)?.label || codeItem;
      }
    });

    return formatted;
  }
}
