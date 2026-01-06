import ExcelJS from 'exceljs';
import fs from 'fs';

export default class ExcelService {
  /**
  * Génère un fichier Excel "large" avec une colonne par question
  * @param {Array} responses - tableau des documents Response
  * @param {String} surveyFile - chemin du fichier survey JSON
  * @param {String} outputFile - chemin de sortie
  */
  static async generateExcelWide(responses, surveyFile, outputFile) {
    const survey = JSON.parse(fs.readFileSync(surveyFile, 'utf-8'));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Réponses');
    
    // Construire les colonnes dynamiquement
    const columns = [{ header: 'UserID', key: 'userId', width: 15 }];
    
    survey.steps.forEach(step => {
      const colBase = `${step.id_db}_${step.label}`;
      columns.push({ header: `${colBase}_CodeItem`, key: `${colBase}_code`, width: 15 });
      columns.push({ header: `${colBase}_Label`, key: `${colBase}_label`, width: 30 });
    });
    
    worksheet.columns = columns;
    
    // Remplir les lignes
    responses.forEach(resp => {
      const answersMap = resp.answers instanceof Map ? Object.fromEntries(resp.answers) : resp.answers;
      const rowData = { userId: resp.userId };
      
      survey.steps.forEach(step => {
        const colBase = `${step.id_db}_${step.label}`;
        const value = answersMap[step.id_db];
        
        if (value === undefined) return;
        
        if (Array.isArray(value)) {
          // concaténation des codes et labels si multiple
          rowData[`${colBase}_code`] = value.join(',');
          const labels = value.map(c => step.options?.find(o => o.codeItem == c)?.label || c);
          rowData[`${colBase}_label`] = labels.join(',');
        } else {
          rowData[`${colBase}_code`] = value;
          const label = step.options?.find(o => o.codeItem == value)?.label || value;
          rowData[`${colBase}_label`] = label;
        }
      });
      
      worksheet.addRow(rowData);
    });
    
    await workbook.xlsx.writeFile(outputFile);
    console.log('Fichier Excel généré :', outputFile);
    return outputFile;
  }
}
