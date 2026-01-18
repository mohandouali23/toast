// services/RotationService.js

import RotationQueueUtils from "./RotationQueueUtils.js";

/**
 * ============================================================================
 * ROTATION SERVICE
 * ============================================================================
 * Responsabilités :
 * - Déterminer le step courant (rotation ou non)
 * - Initialiser une rotation conditionnelle
 * - Avancer dans une rotation existante
 * - Gérer la fin de rotation et la redirection
 *
 * Ce service ne décide PAS de la navigation globale,
 * il ne fait que gérer la logique de rotation.
 * ============================================================================
 */
export default class RotationService {

  // ==========================================================================
  // CURRENT STEP RESOLUTION
  // ==========================================================================

  /**
   * Détermine le step courant à afficher :
   * - Priorité à la rotation si une rotation est en cours
   * - Sinon, utilise le currentStepId de la session
   * - Sinon, initialise le questionnaire (première page)
   */
  static getCurrentStep(session, survey) {

    // --------------------------------------------------
    // Cas 1 : rotation en cours
    // --------------------------------------------------
    if (session.rotationQueue?.length) {
      const wrapper = session.rotationQueue[0];

      return {
        step: wrapper.step,
        wrapper,
        isInRotation: true
      };
    }

    // --------------------------------------------------
    // Cas 2 : navigation normale
    // --------------------------------------------------
    if (session.currentStepId) {
      return {
        step: survey.steps.find(step => step.id === session.currentStepId),
        isInRotation: false
      };
    }

    // --------------------------------------------------
    // Cas 3 : démarrage du questionnaire
    // --------------------------------------------------
    const firstStep = survey.steps
      .filter(step => step.page !== undefined)
      .sort((a, b) => a.page - b.page)[0];

    session.currentStepId = firstStep.id;

    return {
      step: firstStep,
      isInRotation: false
    };
  }

  // ==========================================================================
  // ROTATION INITIALIZATION
  // ==========================================================================

  /**
   * Initialise une rotation si :
   * - l’action est "next"
   * - aucune rotation n’est déjà active
   * - une question possède repeatFor
   * - la condition de répétition est remplie
   */

  static initRotation({ session, survey, answers, action, generateQueue }) {

    if (action !== 'next') return null;
    session.rotationState ??= {};
    session.rotationQueueDone ??= {};
    // Parcours de tous les steps pour détecter une rotation à déclencher
    for (const step of survey.steps) {
  
      const parentId = step.repeatFor;
      if (!parentId || !answers[parentId]) continue;
      // MODIFICATION : Détecter si une rotation devrait être lancée
      const hasRotation = session.rotationState?.[parentId]?.hasRotation;
      const rotationDone = session.rotationQueueDone?.[parentId];
      
      // Conditions pour lancer une rotation :
      // 1. Réponse au parent existe
      // 2. Pas de rotation en cours
      // 3. Rotation non déjà terminée pour cette réponse
      // 4. Pas de rotation déjà active
      if (!session.rotationQueue && !rotationDone) {
        const queue = generateQueue(survey, parentId, answers);
      
        // S'il n'y a rien à répéter → rotation vide
        if (queue.length === 0) {
          session.rotationQueueDone[parentId] = true; // marque comme traitée
          const parent = survey.steps.find(s => s.id === parentId);
          return {
            type: 'NO_ROTATION',
            nextStepId: parent?.redirection || 'FIN'
          };
        }
  
        // --------------------------------------------------
        // Rotation normale
        // --------------------------------------------------
        session.rotationQueue = queue;
        session.rotationQueueDone[parentId] = true;
        session.currentStepId = queue[0].step.id;
  
        // Historisation du premier step de rotation
        session.history ??= [];
        session.history.push({
          id: queue[0].step.id,
          isRotation: true,
          wrapper: queue[0]
        });
  // Reset flag de refresh
  session.rotationState[parentId] = { needsRefresh: false };
        return {
          type: 'ROTATION_STARTED',
          nextStepId: queue[0].step.id
        };
      
    }
    }
    return null;
  }
    // ==========================================================================
  // ROTATION ADVANCEMENT
  // ==========================================================================

  /**
   * Avance dans une rotation existante :
   * - retire le step courant de la queue
   * - retourne le suivant s’il existe
   * - gère la fin de rotation
   */
  static advanceRotation({ session, survey, currentStep, action }) {

    // Aucune rotation active
    if (!session.rotationQueue?.length) return null;

    // Navigation arrière → rester sur le même step
    if (action !== 'next') {
      return { nextStepId: currentStep.id };
    }

    // Retirer le step courant de la rotation
    const processed = session.rotationQueue.shift();

    // --------------------------------------------------
    // Cas : il reste des éléments dans la rotation
    // --------------------------------------------------
    if (session.rotationQueue.length > 0) {
      return {
        nextStepId: session.rotationQueue[0].step.id
      };
    }

    // --------------------------------------------------
    // Cas : fin de rotation
    // --------------------------------------------------
    if (session.rotationQueue.length === 0) {
    delete session.rotationQueue;

    const parent = survey.steps.find(step => step.id === processed.parent);

    // Redirection explicite définie sur le parent
    if (parent?.redirection) {
      return { nextStepId: parent.redirection };
    }

    // Fallback → la navigation sera résolue ailleurs
    return {
      nextStepId: null,
      fallbackFrom: processed.step
    };
  }
  }


static resetRotationIfNeeded(session,survey, currentStepId, answers) {
  // Vérifier si on est sur une question parent qui a une rotation
  const parentStep = survey.steps.find(step => step.id === currentStepId);
  
  if (!parentStep || !parentStep.options) return;
  
  // Vérifier si cette question a déjà lancé une rotation
  const rotationState = session.rotationState?.[currentStepId];
  
  if (rotationState) {
    // Vérifier si la réponse a changé
    const currentAnswer = answers[currentStepId];
    const originalAnswer = rotationState.originalAnswer;
    
    if (JSON.stringify(currentAnswer) !== JSON.stringify(originalAnswer)) {
      // La réponse a changé, on peut relancer une rotation
      delete session.rotationState[currentStepId];
      delete session.rotationQueueDone[currentStepId];
    }
  }
}
}
