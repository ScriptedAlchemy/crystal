import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTerminalTheme,
  getScriptTerminalTheme,
  debugTerminalTheme
} from '../../src/utils/terminalTheme';

describe('terminalTheme utilities', () => {
  let mockGetComputedStyle: ReturnType<typeof vi.fn>;
  let mockDocumentElement: any;

  beforeEach(() => {
    // Mock getComputedStyle
    mockGetComputedStyle = vi.fn();
    global.getComputedStyle = mockGetComputedStyle;

    // Mock document.documentElement
    mockDocumentElement = {
      classList: {
        contains: vi.fn()
      },
      offsetHeight: 100
    };
    
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true
    });

    // Mock console methods for debugTerminalTheme
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rgbToHex conversion', () => {
    test('should convert rgb() values to hex', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return 'rgb(17, 24, 39)'; // #111827
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#111827');
    });

    test('should handle rgb() with commas and spaces', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-fg') return 'rgb(243, 244, 246)'; // #f3f4f6
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.foreground).toBe('#f3f4f6');
    });

    test('should handle rgb() with space separation', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-cursor') return 'rgb(99 102 241)'; // #6366f1
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.cursor).toBe('#6366f1');
    });

    test('should preserve hex values unchanged', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return '#ffffff';
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#ffffff');
    });

    test('should handle single-digit hex values', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-red') return 'rgb(5, 5, 5)'; // #050505
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.red).toBe('#050505');
    });

    test('should handle max RGB values', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-white') return 'rgb(255, 255, 255)'; // #ffffff
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.white).toBe('#ffffff');
    });

    test('should return original value for unparseable colors', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return 'invalid-color';
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.background).toBe('invalid-color');
    });
  });

  describe('theme fallbacks', () => {
    beforeEach(() => {
      // Mock no CSS variables available
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => ''
      });
    });

    test('should use dark fallbacks when dark class is present', () => {
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'dark'
      );

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#111827'); // Dark fallback
      expect(theme.foreground).toBe('#f3f4f6'); // Dark fallback
    });

    test('should use light fallbacks when light class is present', () => {
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'light'
      );

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#ffffff'); // Light fallback
      expect(theme.foreground).toBe('#1e2026'); // Light fallback
    });

    test('should prioritize dark class over light class', () => {
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'dark' || className === 'light'
      );

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#111827'); // Dark fallback should win
    });

    test('should default to dark theme when no classes present', () => {
      mockDocumentElement.classList.contains.mockReturnValue(false);

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#111827'); // Default to dark
      expect(theme.foreground).toBe('#f3f4f6');
    });

    test('should use generic fallbacks for unknown CSS variables', () => {
      mockDocumentElement.classList.contains.mockReturnValue(false);

      const theme = getTerminalTheme();
      // Properties not in fallbacks should get generic fallback
      expect(theme.red).toBe('#ffffff'); // Default for dark theme
    });

    test('should use light generic fallback for light theme', () => {
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'light'
      );

      const theme = getTerminalTheme();
      // Properties not in fallbacks should get light generic fallback
      expect(theme.red).toBe('#000000'); // Default for light theme
    });
  });

  describe('getTerminalTheme', () => {
    test('should return complete theme object', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          const colors: Record<string, string> = {
            '--color-terminal-bg': '#111827',
            '--color-terminal-fg': '#f3f4f6',
            '--color-terminal-cursor': '#818cf8',
            '--color-terminal-black': '#111827',
            '--color-terminal-red': '#ef4444',
            '--color-terminal-green': '#22c55e',
            '--color-terminal-yellow': '#eab308',
            '--color-terminal-blue': '#3b82f6',
            '--color-terminal-magenta': '#a855f7',
            '--color-terminal-cyan': '#06b6d4',
            '--color-terminal-white': '#f3f4f6',
            '--color-terminal-bright-black': '#6b7280',
            '--color-terminal-bright-red': '#f87171',
            '--color-terminal-bright-green': '#4ade80',
            '--color-terminal-bright-yellow': '#facc15',
            '--color-terminal-bright-blue': '#60a5fa',
            '--color-terminal-bright-magenta': '#c084fc',
            '--color-terminal-bright-cyan': '#22d3ee',
            '--color-terminal-bright-white': '#ffffff'
          };
          return colors[prop] || '';
        }
      });

      const theme = getTerminalTheme();

      expect(theme).toEqual({
        background: '#111827',
        foreground: '#f3f4f6',
        cursor: '#818cf8',
        black: '#111827',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f3f4f6',
        brightBlack: '#6b7280',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      });
    });

    test('should force reflow before reading CSS variables', () => {
      const offsetHeightSpy = vi.spyOn(mockDocumentElement, 'offsetHeight', 'get');
      
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => '#000000'
      });

      getTerminalTheme();

      expect(offsetHeightSpy).toHaveBeenCalled();
    });
  });

  describe('getScriptTerminalTheme', () => {
    test('should inherit from base terminal theme', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-fg') return '#f3f4f6';
          if (prop === '--color-terminal-cursor') return '#818cf8';
          return '';
        }
      });

      const scriptTheme = getScriptTerminalTheme();
      expect(scriptTheme.foreground).toBe('#f3f4f6');
      expect(scriptTheme.cursor).toBe('#818cf8');
    });

    test('should use surface background when available', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-surface-secondary') return '#1f2937';
          return '';
        }
      });

      const scriptTheme = getScriptTerminalTheme();
      expect(scriptTheme.background).toBe('#1f2937');
    });

    test('should use light surface fallback for light theme', () => {
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'light'
      );
      
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-surface-secondary') return '';
          if (prop === '--color-terminal-bg') return '#ffffff'; // light fallback
          return '';
        }
      });

      const scriptTheme = getScriptTerminalTheme();
      expect(scriptTheme.background).toBe('#f9fafb');
    });

    test('should use dark surface fallback for dark theme', () => {
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'dark'
      );
      
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-surface-secondary') return '';
          if (prop === '--color-terminal-bg') return '#111827'; // dark fallback
          return '';
        }
      });

      const scriptTheme = getScriptTerminalTheme();
      expect(scriptTheme.background).toBe('#1f2937');
    });

    test('should default to dark surface fallback', () => {
      mockDocumentElement.classList.contains.mockReturnValue(false);
      
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-surface-secondary') return '';
          if (prop === '--color-terminal-bg') return '#111827'; // dark fallback (default)
          return '';
        }
      });

      const scriptTheme = getScriptTerminalTheme();
      expect(scriptTheme.background).toBe('#1f2937');
    });
  });

  describe('debugTerminalTheme', () => {
    test('should log debug information', () => {
      mockDocumentElement.className = 'dark theme-custom';
      mockDocumentElement.classList.contains.mockImplementation((className: string) => 
        className === 'dark'
      );
      
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return 'rgb(17, 24, 39)';
          if (prop === '--color-terminal-fg') return 'rgb(243, 244, 246)';
          return '';
        }
      });

      debugTerminalTheme();

      expect(console.log).toHaveBeenCalledWith('=== Terminal Theme Debug ===');
      expect(console.log).toHaveBeenCalledWith('Classes on root:', 'dark theme-custom');
      expect(console.log).toHaveBeenCalledWith('Has light class:', false);
      expect(console.log).toHaveBeenCalledWith('Has dark class:', true);
      expect(console.log).toHaveBeenCalledWith('CSS Variables:');
      expect(console.log).toHaveBeenCalledWith('  --color-terminal-bg:', 'rgb(17, 24, 39)');
      expect(console.log).toHaveBeenCalledWith('  --color-terminal-fg:', 'rgb(243, 244, 246)');
      expect(console.log).toHaveBeenCalledWith('Terminal theme:', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('Script terminal theme:', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('=========================');
    });

    test('should show NOT SET for missing CSS variables', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => '' // No variables set
      });

      debugTerminalTheme();

      expect(console.log).toHaveBeenCalledWith('  --color-terminal-bg:', 'NOT SET');
      expect(console.log).toHaveBeenCalledWith('  --color-terminal-fg:', 'NOT SET');
    });

    test('should handle empty class list', () => {
      mockDocumentElement.className = '';
      mockDocumentElement.classList.contains.mockReturnValue(false);
      
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => ''
      });

      debugTerminalTheme();

      expect(console.log).toHaveBeenCalledWith('Classes on root:', '');
      expect(console.log).toHaveBeenCalledWith('Has light class:', false);
      expect(console.log).toHaveBeenCalledWith('Has dark class:', false);
    });
  });

  describe('edge cases', () => {
    test('should handle malformed RGB values gracefully', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return 'rgb(invalid)';
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.background).toBe('rgb(invalid)'); // Should return as-is
    });

    test('should handle RGB with extra whitespace', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return 'rgb( 255 , 255 , 255 )';
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.background).toBe('#ffffff');
    });

    test('should handle getComputedStyle returning null', () => {
      global.getComputedStyle = vi.fn().mockReturnValue(null);
      
      // Also need to handle the documentElement access
      mockDocumentElement.classList.contains.mockReturnValue(false);

      expect(() => getTerminalTheme()).not.toThrow();
    });

    test('should handle missing document.documentElement', () => {
      Object.defineProperty(document, 'documentElement', {
        value: null,
        writable: true
      });
      
      // Mock getComputedStyle to handle null documentElement
      global.getComputedStyle = vi.fn().mockImplementation(() => {
        throw new Error('Cannot read properties of null');
      });

      expect(() => getTerminalTheme()).not.toThrow();
    });

    test('should handle RGB values with zero', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-black') return 'rgb(0, 0, 0)';
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.black).toBe('#000000');
    });

    test('should handle RGBA values by ignoring alpha', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === '--color-terminal-bg') return 'rgba(255, 255, 255, 0.5)';
          return '';
        }
      });

      const theme = getTerminalTheme();
      expect(theme.background).toBe('rgba(255, 255, 255, 0.5)'); // Should return as-is since it doesn't match RGB pattern
    });
  });
});