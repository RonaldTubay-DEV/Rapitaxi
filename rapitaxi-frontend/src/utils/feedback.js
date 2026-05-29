const TOASTS_ENABLED_KEY = 'rapitaxi_toasts_enabled';

export const areToastsEnabled = () => localStorage.getItem(TOASTS_ENABLED_KEY) !== 'false';

export const setToastsEnabled = (enabled) => {
  localStorage.setItem(TOASTS_ENABLED_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('toast-preference-changed', { detail: { enabled } }));
};

export const showSuccessToast = (message) => {
  if (!areToastsEnabled()) return;

  window.dispatchEvent(new CustomEvent('rapitaxi-toast', {
    detail: {
      id: Date.now(),
      type: 'success',
      message
    }
  }));
};
