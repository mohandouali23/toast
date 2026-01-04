// services/ToastService.js

export default class ToastService {
    static show(message, { type = 'info', duration = 3000 } = {}) {
      // Exemple simple, peut être remplacé par une lib comme toastr, notyf, vue-toastify, etc.
      console.log(`[${type.toUpperCase()}] ${message}`);
  
      // Dans une vraie application front, remplacer par un affichage réel
      // ex: Notyf, Toastify, react-toastify...
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
    }
  }
  