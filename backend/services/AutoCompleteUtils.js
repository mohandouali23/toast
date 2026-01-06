import SurveyService from './SurveyService.js';

export default class AutoCompleteUtils {
  
  /**
  * Génère les options pour une question autocomplete
  * @param {Object} step - question autocomplete
  * @returns {Array} tableau d'options { display, inputDisplay, jsonData }
  */
  static getAutocompleteOptions(step) {
    if (!step.table) return [];
    
    const tableData = SurveyService.loadTable(step.table);
    
    return tableData.map(item => {
      const displayList = [];
      const saveObj = {};
      let inputDisplay = '';
      
      step.columns.forEach(col => {
        if (col.displayInList) displayList.push(item[col.name]); // pour la liste
        if (col.saveInDB) saveObj[col.name] = item[col.name];    // pour la base
        if (col.displayInInput) inputDisplay = item[col.name];   // pour l'input
      });
      
      return {
        display: displayList.join('-'),     // pour la datalist
        inputDisplay,                       // ce qui s'affiche dans l'input
        jsonData: JSON.stringify(saveObj)   // envoyé au POST
      };
    });
  }
  
}
