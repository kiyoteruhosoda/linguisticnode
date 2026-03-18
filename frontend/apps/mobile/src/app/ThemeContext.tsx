import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "@theme_mode";

export const lightColors = {
  bg: "#f8f9fa",
  surface: "#ffffff",
  surfacePressed: "#f1f3f5",
  surfaceAlt: "#fafafa",
  border: "#e9ecef",
  borderLight: "#f1f3f5",
  borderMid: "#dee2e6",
  text: "#212529",
  textSub: "#6c757d",
  textMuted: "#adb5bd",
  textDim: "#495057",
  primary: "#0d6efd",
  primaryBg: "#e7f1ff",
  primaryBgPressed: "#bbd6ff",
  primaryPressed: "#0b5ed7",
  // Semantic memory colors
  memNew: { color: "#6c757d", bg: "#f1f3f5" },
  memLearning: { color: "#e67700", bg: "#fff3bf" },
  memReview: { color: "#1971c2", bg: "#e7f5ff" },
  memMastered: { color: "#2b8a3e", bg: "#ebfbee" },
  // Rating colors
  ratingAgain: { color: "#dc3545", bg: "#fff5f5" },
  ratingHard: { color: "#fd7e14", bg: "#fff8f0" },
  ratingGood: { color: "#198754", bg: "#f0fff4" },
  ratingEasy: { color: "#0d6efd", bg: "#f0f8ff" },
};

export const darkColors = {
  bg: "#121212",
  surface: "#1e1e1e",
  surfacePressed: "#2d2d2d",
  surfaceAlt: "#252525",
  border: "#333333",
  borderLight: "#2a2a2a",
  borderMid: "#404040",
  text: "#f1f3f5",
  textSub: "#adb5bd",
  textMuted: "#6c757d",
  textDim: "#ced4da",
  primary: "#4d90fe",
  primaryBg: "#1a2940",
  primaryBgPressed: "#213a5e",
  primaryPressed: "#3a7aee",
  // Semantic memory colors
  memNew: { color: "#9ba5b0", bg: "#252c30" },
  memLearning: { color: "#ffc046", bg: "#3d2a00" },
  memReview: { color: "#74b4ff", bg: "#0d1f3d" },
  memMastered: { color: "#5cd97d", bg: "#0d2f1a" },
  // Rating colors
  ratingAgain: { color: "#ff6b7a", bg: "#2d0a0e" },
  ratingHard: { color: "#ffa040", bg: "#2d1800" },
  ratingGood: { color: "#4dbb78", bg: "#0d2318" },
  ratingEasy: { color: "#4d90fe", bg: "#0d1f3d" },
};

export type AppColors = typeof lightColors;

interface ThemeContextValue {
  isDark: boolean;
  colors: AppColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => {
        if (v === "dark") setIsDark(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? "dark" : "light").catch(() => {});
      return next;
    });
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
