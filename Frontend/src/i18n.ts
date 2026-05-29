import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      login: "Login",
      enterMobile: "Enter your mobile number to get started.",
      phoneNumber: "Phone Number",
      register: "Register",
    },
  },

  hi: {
    translation: {
      login: "लॉगिन",
      enterMobile: "शुरू करने के लिए अपना मोबाइल नंबर दर्ज करें।",
      phoneNumber: "मोबाइल नंबर",
      register: "रजिस्टर",
    },
  },

  mr: {
    translation: {
      login: "लॉगिन",
      enterMobile: "सुरू करण्यासाठी तुमचा मोबाईल नंबर टाका.",
      phoneNumber: "मोबाइल नंबर",
      register: "नोंदणी करा",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lang") || "en",
  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;