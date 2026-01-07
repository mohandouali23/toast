
export default class ResponseNormalizer {
  static normalize(step, rawValue, optionIndex=null) {
    const idDB = optionIndex ? `${step.id_db}_${optionIndex}` : step.id_db;
    let value;
    
    switch(step.type) {
      
      case 'accordion': {
        const result = {};
        
        if (!rawValue || typeof rawValue !== 'object') return result;
        
        step.sections.forEach(section => {
          section.questions.forEach(question => {
            const answer = rawValue[question.id];
            if (answer === undefined) return;
            
            // Normaliser la question individuellement
            const normalized = ResponseNormalizer.normalize(
              question,
              { [question.id]: answer },
              optionIndex
            );
            
            if (!normalized || typeof normalized !== 'object') return;
            
            //  Injecter toutes les réponses directement dans result (plat)
            Object.entries(normalized).forEach(([k, v]) => {
              // si v est un objet à 1 clé, extraire la valeur
              if (typeof v === 'object' && v !== null && Object.keys(v).length === 1) {
                v = Object.values(v)[0];
              }
              
              result[k] = v;
            });
          });
        });
        
        return result; 
      }
      
      case 'text':
      case 'spinner':
      value = rawValue;
      break;
      case 'autocomplete':
      // rawValue est envoyé depuis le front sous forme d'objet JSON { commune, cp, _id, ... }
      try {
        const obj = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        value = obj._id; // on ne garde que _id
      } catch (e) {
        value = null;
      }
      break;
      case 'single_choice': {
        const selectedValue = rawValue[step.id];
        value = selectedValue;
        const result = {
          [idDB]: value
        };
        // récupérer l'option sélectionnée
        const selectedOption = step.options?.find(
          opt => opt.codeItem?.toString() === selectedValue?.toString()
        );
        // gérer la précision si requise
        if (selectedOption?.requiresPrecision) {
          const precisionValue = rawValue[`precision_${selectedValue}`];
          if (precisionValue && precisionValue.trim() !== '') {
            result[`${step.id_db}_pr_${selectedValue}`] = precisionValue.trim();
          }
        }
        // --- Sous-questions récursives ---
        if (selectedOption?.subQuestions) {
          selectedOption.subQuestions.forEach(subQ => {
            // normalisation récursive
            const normalizedSubQ = ResponseNormalizer.normalize(subQ, rawValue);
            // fusionner dans le résultat avec clé uniforme
            Object.keys(normalizedSubQ).forEach(subKey => {
              // <id_db_question_principale>_<codeItem_option>_<id_db_sous_question>
              const subQIdDB = `${step.id_db}_${selectedValue}_${subQ.id_db}`;
              result[subQIdDB] = normalizedSubQ[subKey];
            });
          });
        }return result;
      }
      case 'multiple_choice': {
        // if (!rawValue) {
        //   return { [step.id_db]: null };
        // }
        if (!rawValue || !step.options) return { [step.id_db]: null };

        // selectedArray contient les codes sélectionnés
        const selectedArray = Array.isArray(rawValue[step.id]) ? rawValue[step.id] : [rawValue[step.id]];
        const mainValue = selectedArray.join('/');
        // Objet final à retourner
        const result = { [step.id_db]: mainValue };
        // Ajouter les champs de précision pour chaque code sélectionné
        selectedArray.forEach(codeItem => {
          if (codeItem === undefined || codeItem === null) return; // ✅ skip undefined

          const precisionKey = `precision_${step.id}_${codeItem}`;
          const precisionValue = rawValue[precisionKey];
          if (precisionValue && precisionValue.trim() !== '') {
            result[`${step.id_db}_pr_${codeItem}`] = precisionValue;
          }
          
          // gérer sous-questions
          const option = step.options.find(opt => opt.codeItem.toString() === codeItem.toString());
          if (!option?.subQuestions) return; // ✅ skip si option ou subQuestions absent

          // console.log("option subQ",option)

          if (option?.subQuestions) {
            option.subQuestions.forEach(subQ => {
               // Normalisation récursive
              const normalizedSubQ = ResponseNormalizer.normalize(subQ, rawValue);
              console.log("normalizedSubQ",normalizedSubQ)
               // Fusion avec clé : question principale _ code option _ id_db_sous_question
        Object.keys(normalizedSubQ).forEach(subKey => {
          const finalKey = `${step.id_db}_${codeItem}_${subKey}`;
          result[finalKey] = normalizedSubQ[subKey];
        });
            });
          }
        });
        return result;
        break;
      }
      case 'grid': {
        const value = {};
        if (!rawValue || typeof rawValue !== 'object') break;
        
        const data = rawValue.value || rawValue;
        
        const responsesById = {};
        step.reponses.forEach(r => (responsesById[r.id] = r));
        
        const questionsById = {};
        step.questions.forEach(q => (questionsById[q.id] = q));
        
        const isCellEnabled = (question, responseId) =>
          question.cells?.[responseId]?.enabled !== false;
        
        /* *************************** par ligne ********************** */
        step.questions.forEach(question => {
          const rawAnswer = data[question.id];
          if (rawAnswer === undefined) return;
          
          /* ---------- RADIO / AXE ROW ---------- */
          if (typeof rawAnswer === 'string') {
            const response = responsesById[rawAnswer];
            if (
              response &&
              response.input?.axis === 'row' &&
              response.input?.type === 'radio' &&
              isCellEnabled(question, rawAnswer)
            ) {
              value[question.id_db_qst] = response.id_db_rps;
            }
            return;
          }
          
          /* ===========================
          CHECKBOX (row / column)
          =========================== */
          if (Array.isArray(rawAnswer)) {
            rawAnswer.forEach(responseId => {
              const response = responsesById[responseId];
              if (!response) return;
              if (!isCellEnabled(question, responseId)) return;
              
              const axis = response.input.axis;
              
              // ----- AXE ROW -----
              if (axis === 'row') {
                value[question.id_db_qst] = value[question.id_db_qst]
                ? `${value[question.id_db_qst]}/${response.id_db_rps}`
                : response.id_db_rps;
              }
              
              // ----- AXE COLUMN -----
              if (axis === 'column') {
                value[response.id_db_rps] = value[response.id_db_rps]
                ? `${value[response.id_db_rps]}/${question.id_db_qst}`
                : question.id_db_qst;
              }
            });
          }
        });
        
        /* ===========================
        RADIO + AXE COLUMN (racine)
        =========================== */
        Object.keys(data).forEach(responseId => {
          const response = responsesById[responseId];
          if (
            response &&
            response.input?.axis === 'column' &&
            response.input?.type === 'radio'
          ) {
            const questionId = data[responseId];
            const question = questionsById[questionId];
            
            // cellule désactivée
            if (!question || !isCellEnabled(question, responseId)) return;
            
            const key = response.id_db_rps;
            const val = question.id_db_qst;
            
            // concaténer si déjà existant
            value[key] = value[key] ? `${value[key]}/${val}` : val;
          }
        });
        
        return value; //  plat, toutes les réponses avec id_db_qst/id_db_rps
      }
      default:
      value = rawValue;
      break;
    }
    
    return { [idDB]: value };
  }
}

