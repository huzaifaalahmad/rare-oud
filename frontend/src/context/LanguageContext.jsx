import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import dictionary from '../utils/translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('rare_oud_lang') || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('rare_oud_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isRtl: lang === 'ar',
      tr: key => dictionary?.[lang]?.[key] || key
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);