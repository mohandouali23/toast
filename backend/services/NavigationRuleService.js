export default class NavigationRuleService {
  
  static evaluateRule(rule, answerValue) {
    
    const extracted = this.extractValue(answerValue, rule.field);
    console.log("NAV DEBUG", {
      answerValue,
      extracted,
      rule
    });
    
    const values = Array.isArray(extracted) ? extracted : [extracted];
    switch (rule.operator) {
      case 'EQUALS':
      return values.some(v => String(v) === String(rule.value));
      
      case 'NOT_EQUALS':
      return values.every(v => String(v) !== String(rule.value));
      
      case 'IN':
        return values.some(v => rule.values.map(String).includes(String(v)));
      
      case 'NOT_IN':
        return values.every(v => !rule.values.map(String).includes(String(v)));
      
      case 'LT':
      return values.some(v => Number(v) < rule.value);
      
      case 'LTE':
      return values.some(v => Number(v) <= rule.value);
      
      case 'GT':
      return values.some(v => Number(v) > rule.value);
      
      case 'GTE':
      return values.some(v => Number(v) >= rule.value);
      
      case 'BETWEEN':
      return values.some(v => Number(v) >= rule.values[0] && Number(v) <= rule.values[1]);
      
      case 'FILLED':
      return values.some(v => v !== null && v !== undefined && v !== '');
      
      case 'EMPTY':
      return values.every(v => v === null || v === undefined || v === '');
      
      default:
      return false;
    }
  }
  
  /**
  * Résout la navigation pour une question donnée
  */
  static resolve(step, answerValue, steps) {
    
    const navigation = step.navigation;
    
    //  Règles conditionnelles
    if (navigation?.rules?.length) {
      for (const rule of navigation.rules) {
        const match = this.evaluateRule(rule.if, answerValue);
        if (match) {
          return rule.then.goTo;
        }
      }
      
    }
    
    
    // 2Default navigation
    if (navigation?.default === 'NEXT') {
      return this.getNextSequentialStep(step, steps);
    }
    
    if (navigation?.default === 'redirection') {
      return step.redirection;
    }
    
    //  Fallback historique
    return step.redirection;
  }
  
  static getNextSequentialStep(step, steps) {
    const index = steps.findIndex(s => s.id === step.id);
    return steps[index + 1]?.id || 'FIN';
  }
  // static extractValue(answerValue, field) {
  //   if (answerValue == null) return null;
  //    // 🔥 PATCH : JSON string → objet
  // if (typeof answerValue === 'string') {
  //   try {
  //     const parsed = JSON.parse(answerValue);
  //     return field ? parsed?.[field] : parsed;
  //   } catch {
  //     return answerValue;
  //   }
  // }
  //   // Cas multiple_choice → tableau d'objets
  //   if (Array.isArray(answerValue)) {
  //     if (field) {
  //       return answerValue.map(v => v?.[field]).filter(v => v !== undefined);
  //     }
  //     return answerValue;
  //   }
    
  //   // Cas objet complexe (autocomplete, accordion, single_choice avec objet)
  //   if (typeof answerValue === 'object') {
  //     // Si field fourni, retourner la clé spécifique
  //     if (field && field in answerValue) return answerValue[field];
      
  //     // Sinon on cherche la "valeur principale" (codeItem, value, etc.)
  //     if ('codeItem' in answerValue) return answerValue.codeItem;
  //     if ('value' in answerValue) return answerValue.value;
      
  //     return answerValue;
  //   }
    
  //   // Cas primitif (string, number)
  //   return answerValue;
  // // }
  // static extractValue(answerValue, field) {
  //   if (answerValue == null) return null;
  
  //   // 🔹 Spinner / radio simple
  //   if ((typeof answerValue === 'string' || typeof answerValue === 'number') && field === 'codeItem') {
  //     return answerValue;
  //   }
  
  //   if (typeof answerValue === 'string') {
  //     try {
  //       const parsed = JSON.parse(answerValue);
  //       return field ? parsed?.[field] : parsed;
  //     } catch {
  //       return answerValue;
  //     }
  //   }
  
  //   if (Array.isArray(answerValue)) {
  //     if (field) {
  //       return answerValue.map(v => v?.[field]).filter(v => v !== undefined);
  //     }
  //     return answerValue;
  //   }
  
  //   if (typeof answerValue === 'object') {
  //     if (field && field in answerValue) return answerValue[field];
  //     if ('codeItem' in answerValue) return answerValue.codeItem;
  //     if ('value' in answerValue) return answerValue.value;
  //     return answerValue;
  //   }
  
  //   return answerValue;
  // }
  static extractValue(answerValue, field) {
    if (answerValue == null) return [];
  
    // 🔹 JSON string (autocomplete, etc.)
    if (typeof answerValue === 'string') {
      try {
        const parsed = JSON.parse(answerValue);
        return this.extractValue(parsed, field);
      } catch {
        return [answerValue];
      }
    }
  
    // 🔹 multiple_choice → ['1','7']
    if (Array.isArray(answerValue)) {
      return answerValue.map(v => {
        if (typeof v === 'object' && field) return v[field];
        return v; // string/number
      }).filter(v => v !== undefined);
    }
  
    // 🔹 objet (single_choice, spinner, autocomplete)
    if (typeof answerValue === 'object') {
      if (field && field in answerValue) return [answerValue[field]];
      if ('codeItem' in answerValue) return [answerValue.codeItem];
      if ('value' in answerValue) return [answerValue.value];
    }
  
    // 🔹 primitif
    return [answerValue];
  }
  
}