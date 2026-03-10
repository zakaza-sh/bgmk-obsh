import React, { createContext, useContext, useEffect, useState } from 'react';

const TelegramContext = createContext(null);

export const TelegramProvider = ({ children }) => {
  const [telegramWebApp, setTelegramWebApp] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [isTelegramApp, setIsTelegramApp] = useState(false);

  useEffect(() => {
    // Check if running inside Telegram
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      setTelegramWebApp(tg);
      setIsTelegramApp(true);
      
      // Initialize Telegram WebApp
      tg.ready();
      tg.expand();
      
      // Set theme
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      // Get user data
      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user);
      }
      
      // Enable haptic feedback
      tg.HapticFeedback?.impactOccurred('light');
      
      // Set header color
      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#f8fafc');
      
      console.log('Telegram WebApp initialized:', tg.initDataUnsafe);
    }
  }, []);

  const showAlert = (message) => {
    if (telegramWebApp) {
      telegramWebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message, callback) => {
    if (telegramWebApp) {
      telegramWebApp.showConfirm(message, callback);
    } else {
      const result = window.confirm(message);
      callback(result);
    }
  };

  const hapticFeedback = (type = 'light') => {
    if (telegramWebApp?.HapticFeedback) {
      telegramWebApp.HapticFeedback.impactOccurred(type);
    }
  };

  const close = () => {
    if (telegramWebApp) {
      telegramWebApp.close();
    }
  };

  return (
    <TelegramContext.Provider value={{
      telegramWebApp,
      telegramUser,
      isTelegramApp,
      showAlert,
      showConfirm,
      hapticFeedback,
      close
    }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
};
