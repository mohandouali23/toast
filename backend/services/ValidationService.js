import ToastService from './ToastService.js';

export default class ValidationService {
  
  // ---------------- Helper ----------------
  static validateQuestionRecursive(question, answers, wrapper = null, path = '') {
  const missingFields = [];

  // clé de session pour récupérer la réponse
  const answerKey = wrapper?.optionIndex !== undefined ? `${question.id}_${wrapper.optionIndex}` : question.id;
  const value = answers[answerKey];

  // Si la question est obligatoire et sans réponse → erreur
  if (question.required && !ValidationService.hasRealAnswer(value)) {
    missingFields.push(path ? `${path} > ${question.label || question.id}` : question.label || question.id);
  }

  // Vérifie si la question a des sous-questions
  if (question.options?.length) {
    question.options.forEach(opt => {
      // si la réponse principale correspond à l’option
      if (Array.isArray(value) ? value.includes(opt.codeItem) : value == opt.codeItem) {
        if (opt.subQuestions?.length) {
          opt.subQuestions.forEach(subQ => {
            // Appel récursif pour valider la sous-question
            missingFields.push(...ValidationService.validateQuestionRecursive(subQ, answers, wrapper, path ? `${path} > ${question.label}` : question.label));
          });
        }
      }
    });
  }

  return missingFields;
}

  static hasRealAnswer(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object')
      return Object.values(value).some(v => ValidationService.hasRealAnswer(v));
    return true;
  }
  
  static checkPrecision(questionId, codeItem, answers) {
    const precisionKey = `${questionId}_pr_${codeItem}`;
    const precisionValue = answers[precisionKey];
    return precisionValue && precisionValue.trim() !== '';
  }
  
  static showMissingToast(message) {
    ToastService.show(message, { type: 'error' });
  }
  
  // ---------------- Accordion ----------------
  static validateAccordion(step, answers, missingFields) {
    const answer = answers[step.id];
    if (!answer || typeof answer !== 'object') {
      missingFields.push(step.label || step.id);
      return;
    }
    
    (step.sections || []).forEach(section => {
      (section.questions || []).forEach(question => {
        const value = answer[question.id];
        if (!question.required) return;
        
        switch (question.type) {
          case 'text':
          case 'spinner':
          case 'autocomplete':
          case 'single_choice':
          if (!ValidationService.hasRealAnswer(value)) {
            missingFields.push(`${section.title} > ${question.label || question.id}`);
          }
          break;
          
          case 'multiple_choice':
          if (!Array.isArray(value) || value.filter(v => v && v.trim() !== '').length === 0) {
            missingFields.push(`${section.title} > ${question.label || question.id}`);
          }
          break;
          
          default:
          if (!ValidationService.hasRealAnswer(value)) {
            missingFields.push(`${section.title} > ${question.label || question.id}`);
          }
        }
      });
    });
  }
  
  // ---------------- Grid ----------------
  static validateGridStep(step, answers) {
    const answer = answers[step.id]?.value;
    if (!answer || Object.keys(answer).length === 0) {
      ValidationService.showMissingToast(`Veuillez répondre à la question obligatoire : ${step.label || step.id}`);
      return false;
    }
    
    const missingRows = [];
    const missingColumns = [];
    
    // Lignes obligatoires
    (step.questions || []).forEach(q => {
      if (q.required && !ValidationService.hasRealAnswer(answer[q.id])) {
        missingRows.push(q.label || q.id);
      }
    });
    
    // Colonnes obligatoires
    (step.reponses || []).forEach(resp => {
      if (resp.input?.axis === 'column' && resp.input?.required) {
        const respId = resp.id;
        let hasAnswer = false;
        
        if (typeof answer[respId] === 'string' && answer[respId].trim() !== '') {
          hasAnswer = true;
        }
        
        (step.questions || []).forEach(q => {
          const rowAnswer = answer[q.id];
          if (!rowAnswer) return;
          if (q.cells?.[respId]?.enabled === false) return;
          if (Array.isArray(rowAnswer) && rowAnswer.includes(respId)) hasAnswer = true;
        });
        
        if (!hasAnswer) missingColumns.push(resp.label || respId);
      }
    });
    
    if (missingRows.length || missingColumns.length) {
      let message = '';
      if (missingRows.length) message += `Veuillez répondre à chaque ligne obligatoire :<br>${missingRows.map(r => `• ${r}`).join('<br>')}<br>`;
      if (missingColumns.length) message += `Veuillez répondre à chaque colonne obligatoire :<br>${missingColumns.map(c => `• ${c}`).join('<br>')}`;
      ValidationService.showMissingToast(message);
      return false;
    }
    
    return true;
  }
  
  // ---------------- Vérification d'un step ----------------
  static validateStep(step, answers, wrapper = null) {
    if (step.type === 'grid') return ValidationService.validateGridStep(step, answers);
    
    const missingFields = [];
    const questionList = step.questions || [step];
    
    questionList.forEach(q => {
      const answerKey = wrapper?.optionIndex !== undefined ? `${q.id}_${wrapper.optionIndex}` : q.id;
      const value = answers[answerKey];
      if (!q.required) return;
      
      switch (q.type) {
        case 'text':
        case 'spinner':
        case 'autocomplete':
        if (!ValidationService.hasRealAnswer(value)) missingFields.push(q.label || q.id);
        break;
        
        case 'single_choice':
        if (!ValidationService.hasRealAnswer(value)) missingFields.push(q.label || q.id);
        else {
          const selectedOption = q.options?.find(opt => opt.codeItem?.toString() === value?.toString());
          if (selectedOption?.requiresPrecision && !ValidationService.checkPrecision(q.id, value, answers)) {
            missingFields.push(`Précision pour "${selectedOption.label}"`);
          }
        }
        break;
        
        case 'multiple_choice':
        const selectedArray = Array.isArray(value) ? value.filter(v => v && v.trim() !== '') : [];
        if (!selectedArray.length) missingFields.push(q.label || q.id);
        else {
          selectedArray.forEach(codeItem => {
            const selectedOption = q.options?.find(opt => opt.codeItem?.toString() === codeItem?.toString());
            if (selectedOption?.requiresPrecision && !ValidationService.checkPrecision(q.id, codeItem, answers)) {
              missingFields.push(`Précision pour "${selectedOption.label}"`);
            }
          });
        }
        break;
        
        case 'accordion':
        ValidationService.validateAccordion(q, answers, missingFields);
        break;
        
        default:
        if (!ValidationService.hasRealAnswer(value)) missingFields.push(q.label || q.id);
      }
    });
    
    if (missingFields.length > 0) {
      const message = `Veuillez répondre aux questions obligatoires : ${missingFields.join(', ')}`;
      ValidationService.showMissingToast(message);
      return false;
    }
    
    return true;
  }
}

