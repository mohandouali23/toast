export default class ToastService {
  static show(message, { type = 'info', duration = 3000 } = {}) {
    console.log(`[${type.toUpperCase()}] ${message}`);
   
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(message);
    }
  }
}
