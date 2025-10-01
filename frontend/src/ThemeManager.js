// Theme Manager - Multiple themes with excellent readability

export const THEMES = {
  dark: {
    name: '🌙 Темная',
    body: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
    window: 'rgba(30, 30, 30, 0.95)',
    windowBorder: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textSecondary: '#cccccc',
    input: 'rgba(50, 50, 50, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(255, 255, 255, 0.2)',
    accent: '#00d4ff',
    success: '#00ff88',
    danger: '#ff4757',
    warning: '#ffa502'
  },
  
  cyber: {
    name: '🔥 Киберпанк',
    body: 'linear-gradient(135deg, #0a0a0a 0%, #1a0033 25%, #000066 50%, #1a0033 75%, #0a0a0a 100%)',
    window: 'rgba(20, 0, 40, 0.95)',
    windowBorder: 'rgba(255, 0, 255, 0.3)',
    text: '#00ffff',
    textSecondary: '#ff00ff',
    input: 'rgba(40, 0, 80, 0.9)',
    inputText: '#00ffff',
    inputBorder: 'rgba(0, 255, 255, 0.3)',
    accent: '#ff0080',
    success: '#00ff00',
    danger: '#ff0040',
    warning: '#ffff00'
  },

  ocean: {
    name: '🌊 Океан',
    body: 'linear-gradient(135deg, #001122 0%, #003366 25%, #0066aa 50%, #003366 75%, #001122 100%)',
    window: 'rgba(0, 40, 80, 0.95)',
    windowBorder: 'rgba(0, 150, 255, 0.3)',
    text: '#ffffff',
    textSecondary: '#b3e5fc',
    input: 'rgba(0, 60, 120, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(100, 200, 255, 0.3)',
    accent: '#00bcd4',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800'
  },

  forest: {
    name: '🌲 Лес',
    body: 'linear-gradient(135deg, #0d1b0d 0%, #1a332a 25%, #2d5a3d 50%, #1a332a 75%, #0d1b0d 100%)',
    window: 'rgba(30, 50, 40, 0.95)',
    windowBorder: 'rgba(100, 255, 150, 0.3)',
    text: '#ffffff',
    textSecondary: '#c8e6c9',
    input: 'rgba(20, 60, 40, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(150, 255, 180, 0.3)',
    accent: '#4caf50',
    success: '#8bc34a',
    danger: '#f44336',
    warning: '#ff9800'
  },

  sunset: {
    name: '🌅 Закат',
    body: 'linear-gradient(135deg, #2d1b1b 0%, #4d2d1a 25%, #664d33 50%, #4d2d1a 75%, #2d1b1b 100%)',
    window: 'rgba(60, 40, 30, 0.95)',
    windowBorder: 'rgba(255, 150, 100, 0.3)',
    text: '#ffffff',
    textSecondary: '#ffcc80',
    input: 'rgba(80, 50, 30, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(255, 180, 120, 0.3)',
    accent: '#ff7043',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ffc107'
  },

  purple: {
    name: '💜 Фиолетовый',
    body: 'linear-gradient(135deg, #1a0d26 0%, #2d1b4d 25%, #4a3373 50%, #2d1b4d 75%, #1a0d26 100%)',
    window: 'rgba(40, 20, 60, 0.95)',
    windowBorder: 'rgba(200, 150, 255, 0.3)',
    text: '#ffffff',
    textSecondary: '#e1bee7',
    input: 'rgba(60, 30, 90, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(180, 120, 255, 0.3)',
    accent: '#9c27b0',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800'
  },

  matrix: {
    name: '💚 Матрица',
    body: 'linear-gradient(135deg, #000000 0%, #001100 25%, #002200 50%, #001100 75%, #000000 100%)',
    window: 'rgba(0, 30, 0, 0.95)',
    windowBorder: 'rgba(0, 255, 0, 0.3)',
    text: '#00ff00',
    textSecondary: '#80ff80',
    input: 'rgba(0, 40, 0, 0.9)',
    inputText: '#00ff00',
    inputBorder: 'rgba(0, 255, 0, 0.3)',
    accent: '#00cc00',
    success: '#00ff00',
    danger: '#ff3300',
    warning: '#ffff00'
  },

  gold: {
    name: '✨ Золотой',
    body: 'linear-gradient(135deg, #2d2416 0%, #4d4020 25%, #665533 50%, #4d4020 75%, #2d2416 100%)',
    window: 'rgba(60, 50, 30, 0.95)',
    windowBorder: 'rgba(255, 215, 0, 0.3)',
    text: '#ffffff',
    textSecondary: '#fff8dc',
    input: 'rgba(80, 65, 35, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(255, 215, 0, 0.3)',
    accent: '#ffd700',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800'
  },

  ice: {
    name: '❄️ Лед',
    body: 'linear-gradient(135deg, #0d1a2d 0%, #1a334d 25%, #2d4d66 50%, #1a334d 75%, #0d1a2d 100%)',
    window: 'rgba(20, 40, 60, 0.95)',
    windowBorder: 'rgba(150, 200, 255, 0.3)',
    text: '#ffffff',
    textSecondary: '#e3f2fd',
    input: 'rgba(30, 50, 80, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(100, 180, 255, 0.3)',
    accent: '#03a9f4',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800'
  },

  volcano: {
    name: '🌋 Вулкан',
    body: 'linear-gradient(135deg, #2d0d0d 0%, #4d1a1a 25%, #662626 50%, #4d1a1a 75%, #2d0d0d 100%)',
    window: 'rgba(60, 20, 20, 0.95)',
    windowBorder: 'rgba(255, 100, 100, 0.3)',
    text: '#ffffff',
    textSecondary: '#ffcdd2',
    input: 'rgba(80, 30, 30, 0.9)',
    inputText: '#ffffff',
    inputBorder: 'rgba(255, 120, 120, 0.3)',
    accent: '#f44336',
    success: '#4caf50',
    danger: '#d32f2f',
    warning: '#ff9800'
  }
};

export class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('selectedTheme') || 'dark';
    this.applyTheme(this.currentTheme);
  }

  setTheme(themeName) {
    this.currentTheme = themeName;
    localStorage.setItem('selectedTheme', themeName);
    this.applyTheme(themeName);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;

    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--theme-body', theme.body);
    root.style.setProperty('--theme-window', theme.window);
    root.style.setProperty('--theme-window-border', theme.windowBorder);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-text-secondary', theme.textSecondary);
    root.style.setProperty('--theme-input', theme.input);
    root.style.setProperty('--theme-input-text', theme.inputText);
    root.style.setProperty('--theme-input-border', theme.inputBorder);
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-success', theme.success);
    root.style.setProperty('--theme-danger', theme.danger);
    root.style.setProperty('--theme-warning', theme.warning);

    // Update body background
    document.body.style.background = theme.body;
  }

  getAllThemes() {
    return Object.keys(THEMES).map(key => ({
      key,
      name: THEMES[key].name
    }));
  }
}

export default ThemeManager;