// AccordionUtils.js
export default class AccordionUtils {
  // static prepareQuestionFlags(q) {
  //   const prepared = { ...q };
  
  //   // Déterminer quel template inclure
  //   prepared.template = `questions/${q.type}`; // ex: "questions/single_choice"
    
  //   prepared.isText = q.type === 'text';
  //   prepared.isSpinner = q.type === 'spinner';
  //   prepared.isSingleChoice = q.type === 'single_choice';
  //   prepared.isMultipleChoice = q.type === 'multiple_choice';
  //   prepared.isAccordion = q.type === 'accordion';
    
  //   return prepared;
  // }
    // Prépare les flags pour toutes les questions (Mustache)
    static prepareQuestionFlags(q) {
      return {
        ...q,
        isText: q.type === 'text',
        isSingleChoice: q.type === 'single_choice',
        isMultipleChoice: q.type === 'multiple_choice',
        isSpinner: q.type === 'spinner',
        isAutocomplete: q.type === 'autocomplete',
        isGrid: q.type === 'grid',
        isAccordion: q.type === 'accordion',
        options: q.options || [],
        rows: q.rows || [],
        columns: q.columns || [],
      };
    }

 

  }
  