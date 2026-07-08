import React, { createContext, useContext, useState } from "react";
import { translations } from "../utils/translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("app_language") || "vi";
  });

  const setLanguage = (lang) => {
    localStorage.setItem("app_language", lang);
    setLanguageState(lang);
  };

  // Helper translation function with fallback mechanism
  const t = (key, fallback = "") => {
    const keys = key.split(".");
    let value = translations[language];
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to the other language dictionary if the target key is missing in active language
        let altValue = translations[language === "vi" ? "en" : "vi"];
        for (const altK of keys) {
          if (altValue && altValue[altK] !== undefined) {
            altValue = altValue[altK];
          } else {
            altValue = null;
            break;
          }
        }
        return altValue || fallback || key;
      }
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
