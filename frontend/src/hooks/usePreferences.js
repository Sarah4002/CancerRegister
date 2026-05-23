import { create } from 'zustand';

const STORAGE_KEY = 'app_preferences';

const DEFAULTS = {
  theme: 'light',
  language: 'fr',
  dateFormat: 'JJ/MM/AAAA',
  interfaceSize: 'medium',
};

function readStoredPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...stored };
  } catch {
    return DEFAULTS;
  }
}

function applyDocumentPreferences(preferences) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.dataset.interfaceSize = preferences.interfaceSize;
  document.documentElement.lang = preferences.language;
  document.documentElement.dir = preferences.language === 'ar' ? 'rtl' : 'ltr';
}

const usePreferences = create((set, get) => ({
  ...readStoredPreferences(),

  initPreferences: () => {
    const preferences = readStoredPreferences();
    applyDocumentPreferences(preferences);
    set(preferences);
  },

  updatePreference: (key, value) => {
    const next = { ...get(), [key]: value };
    const persisted = {
      theme: next.theme,
      language: next.language,
      dateFormat: next.dateFormat,
      interfaceSize: next.interfaceSize,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    applyDocumentPreferences(persisted);
    set({ [key]: value });
  },
}));

export default usePreferences;