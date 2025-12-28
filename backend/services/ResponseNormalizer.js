export default class ResponseNormalizer {
  static normalize(step, rawValue) {
    const idDB = step.id_db;
    let value;

    switch(step.type) {
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

      case 'single_choice':
        value = rawValue;
        break;

      case 'multiple_choice':
        value = Array.isArray(rawValue) ? rawValue : [rawValue];
        break;

      default:
        value = rawValue;
        break;
    }

    return { [idDB]: value };
  }
}
