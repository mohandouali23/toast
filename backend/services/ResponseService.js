import Response from '../models/Response.js';

export default class ResponseService {
  
  /**
   * Sauvegarde une réponse pour un utilisateur / questionnaire
   * @param {String} surveyId 
   * @param {String} userId 
   * @param {Object} answer - { questionId, type, value }
   */

  // Créer un nouveau questionnaire pour un utilisateur
  static async createSurveyDocument(surveyId, userId,answer) {
    const response = new Response({
      surveyId,
      userId,
      answers: []
    });
    await response.save();
    return response;
  }

  // Ajouter une réponse à un document existant
  static async addAnswer(responseId, answer) {
    const response = await Response.findById(responseId);
    if (!response) throw new Error('Document introuvable');

   // response.answers.push(answer);
   response.answers = new Map([
    ...response.answers,
    ...Object.entries(answer)
  ]);
  

    await response.save();
    return response;
  }

  // Obtenir le dernier document non terminé pour un user
  static async getLatestResponse(surveyId, userId) {
    return await Response.findOne({ surveyId, userId }).sort({ createdAt: -1 });
  }

  static async saveAnswer(surveyId, userId, answer) {
    try {
      let response = await Response.findOne({ surveyId, userId });
      if (!response) {
        response = new Response({
          surveyId,
          userId,
          answers: {} // objet vide
        });
      }
  
      // Ajouter la nouvelle réponse à la Map
      response.answers = new Map([
        ...response.answers,
        ...Object.entries(answer)
      ]);
  
      await response.save();
      return response;
    } catch (err) {
      console.error('Erreur sauvegarde réponse:', err);
      throw err;
    }
  }
  

  static async createResponse(surveyId, userId, answer) {
    try {
      const response = new Response({
        surveyId,
        userId,
        answers: answer  // chaque document commence avec la première réponse
      });
      await response.save();
      return response;
    } catch (err) {
      console.error('Erreur création réponse:', err);
      throw err;
    }
  }

}

