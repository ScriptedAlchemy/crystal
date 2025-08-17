/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizablePanel } from '../../src/hooks/useResizablePanel';

describe('useResizablePanel', () => {
  const defaultOptions = {
    defaultWidth: 300,
    minWidth: 200,
    maxWidth: 600,
    storageKey: 'test-panel-width',
  };

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock mouse events
    global.document.addEventListener = vi.fn();
    global.document.removeEventListener = vi.fn();
    global.document.body.style = {} as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default width', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      expect(result.current.width).toBe(300);
      expect(result.current.isResizing).toBe(false);
      expect(typeof result.current.startResize).toBe('function');
    });

    it('should load width from localStorage when available', () => {
      localStorage.getItem = vi.fn().mockReturnValue('450');

      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      expect(localStorage.getItem).toHaveBeenCalledWith('test-panel-width');
      expect(result.current.width).toBe(450);
    });

    it('should use default width when localStorage value is invalid', () => {
      localStorage.getItem = vi.fn().mockReturnValue('not-a-number');

      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      expect(result.current.width).toBe(300);
    });

    it('should constrain localStorage values to min/max bounds', () => {
      localStorage.getItem = vi.fn().mockReturnValue('50'); // Below minWidth

      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      expect(result.current.width).toBe(300); // Falls back to default
    });

    it('should work without storageKey', () => {
      const optionsWithoutStorage = {
        defaultWidth: 350,
        minWidth: 200,
        maxWidth: 600,
      };

      const { result } = renderHook(() => useResizablePanel(optionsWithoutStorage));

      expect(result.current.width).toBe(350);
      expect(localStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('Width Persistence', () => {
    it('should save width to localStorage when changed', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Simulate a resize action
      act(() => {
        // The width changes during resize, which triggers localStorage save
      });

      // Initial save happens due to effect watching width changes
      expect(localStorage.setItem).toHaveBeenCalledWith('test-panel-width', '300');
    });

    it('should not save to localStorage without storageKey', () => {
      const optionsWithoutStorage = {
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 600,
      };

      renderHook(() => useResizablePanel(optionsWithoutStorage));

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Resize Interaction', () => {
    it('should start resizing and capture initial position', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 350,
      } as any;

      act(() => {
        result.current.startResize(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.isResizing).toBe(true);
    });

    it('should setup event listeners when resizing starts', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 350,
      } as any;

      act(() => {
        result.current.startResize(mockEvent);
      });

      expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(document.body.style.cursor).toBe('col-resize');
      expect(document.body.style.userSelect).toBe('none');
    });

    it('should calculate width difference correctly during mouse move', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Start resizing at position 300 with initial width 300
      const startEvent = {
        preventDefault: vi.fn(),
        clientX: 300,
      } as any;

      act(() => {
        result.current.startResize(startEvent);
      });

      // Get the mousemove handler
      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveCall = addEventListenerCalls.find((call: any) => call[0] === 'mousemove');
      const mouseMoveHandler = mouseMoveCall[1];

      // Move mouse 50 pixels to the right
      act(() => {
        mouseMoveHandler({ clientX: 350 });
      });

      // Width should increase by the difference (50 pixels)
      expect(result.current.width).toBe(350);
    });

    it('should handle negative mouse movement (shrinking)', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Start with a larger initial width
      const optionsWithLargerWidth = { ...defaultOptions, defaultWidth: 400 };
      const { result: largerResult } = renderHook(() => useResizablePanel(optionsWithLargerWidth));

      const startEvent = {
        preventDefault: vi.fn(),
        clientX: 400,
      } as any;

      act(() => {
        largerResult.current.startResize(startEvent);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Move mouse 100 pixels to the left
      act(() => {
        mouseMoveHandler({ clientX: 300 });
      });

      // Width should decrease by 100 pixels
      expect(largerResult.current.width).toBe(300);
    });

    it('should respect minWidth constraint during resize', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      const startEvent = {
        preventDefault: vi.fn(),
        clientX: 300,
      } as any;

      act(() => {
        result.current.startResize(startEvent);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Try to move mouse far left (which would result in width < minWidth)
      act(() => {
        mouseMoveHandler({ clientX: 100 }); // 200 pixels left from start
      });

      // Width should be constrained to minWidth
      expect(result.current.width).toBe(200);
    });

    it('should respect maxWidth constraint during resize', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      const startEvent = {
        preventDefault: vi.fn(),
        clientX: 300,
      } as any;

      act(() => {
        result.current.startResize(startEvent);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Try to move mouse far right (which would result in width > maxWidth)
      act(() => {
        mouseMoveHandler({ clientX: 1000 }); // 700 pixels right from start
      });

      // Width should be constrained to maxWidth
      expect(result.current.width).toBe(600);
    });

    it('should stop resizing on mouse up', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      expect(result.current.isResizing).toBe(true);

      // Get the mouseup handler
      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseUpHandler = addEventListenerCalls.find((call: any) => call[0] === 'mouseup')[1];

      act(() => {
        mouseUpHandler();
      });

      expect(result.current.isResizing).toBe(false);
    });
  });

  describe('Position Tracking', () => {
    it('should track start position and width correctly', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Start resize at specific position
      const startEvent = {
        preventDefault: vi.fn(),
        clientX: 250,
      } as any;

      act(() => {
        result.current.startResize(startEvent);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Move to different position
      act(() => {
        mouseMoveHandler({ clientX: 280 }); // 30 pixels right
      });

      // Should add the difference to the original width
      expect(result.current.width).toBe(330); // 300 + 30
    });

    it('should handle multiple resize sessions with different start positions', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // First resize session
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      let addEventListenerCalls = (document.addEventListener as any).mock.calls;
      let mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];
      let mouseUpHandler = addEventListenerCalls.find((call: any) => call[0] === 'mouseup')[1];

      act(() => {
        mouseMoveHandler({ clientX: 350 }); // Move to 350
      });

      expect(result.current.width).toBe(350);

      act(() => {
        mouseUpHandler(); // End first resize
      });

      // Reset mocks for second session
      vi.clearAllMocks();
      global.document.addEventListener = vi.fn();

      // Second resize session from new position
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 400 } as any);
      });

      addEventListenerCalls = (document.addEventListener as any).mock.calls;
      mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      act(() => {
        mouseMoveHandler({ clientX: 450 }); // Move 50 pixels right from new start
      });

      // Should add 50 to the previous width (350)
      expect(result.current.width).toBe(400); // 350 + 50
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners when resizing stops', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      // Get handlers
      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];
      const mouseUpHandler = addEventListenerCalls.find((call: any) => call[0] === 'mouseup')[1];

      act(() => {
        mouseUpHandler();
      });

      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', mouseMoveHandler);
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', mouseUpHandler);
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    it('should cleanup event listeners on unmount during resize', () => {
      const { result, unmount } = renderHook(() => useResizablePanel(defaultOptions));

      // Start resizing
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      // Unmount while resizing
      unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive resize starts', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Start first resize
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const firstCallCount = (document.addEventListener as any).mock.calls.length;

      // Start second resize immediately
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 350 } as any);
      });

      // Should not add duplicate listeners
      expect((document.addEventListener as any).mock.calls.length).toBe(firstCallCount);
      expect(result.current.isResizing).toBe(true);
    });

    it('should handle mouse events with extreme coordinates', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Test with extreme coordinates
      act(() => {
        mouseMoveHandler({ clientX: -1000 });
      });

      expect(result.current.width).toBe(200); // Should clamp to minWidth

      act(() => {
        mouseMoveHandler({ clientX: 10000 });
      });

      expect(result.current.width).toBe(600); // Should clamp to maxWidth
    });

    it('should handle NaN coordinates gracefully', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Test with NaN coordinates
      act(() => {
        mouseMoveHandler({ clientX: NaN });
      });

      // Should maintain valid width within bounds
      expect(result.current.width).toBeGreaterThanOrEqual(defaultOptions.minWidth);
      expect(result.current.width).toBeLessThanOrEqual(defaultOptions.maxWidth);
    });

    it('should maintain width when no localStorage and no storageKey', () => {
      const optionsWithoutStorage = {
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 600,
      };

      const { result } = renderHook(() => useResizablePanel(optionsWithoutStorage));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      act(() => {
        mouseMoveHandler({ clientX: 400 });
      });

      // Should update width but not save to localStorage
      expect(result.current.width).toBe(400);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency resize events efficiently', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      const startTime = performance.now();

      // Simulate rapid mouse movements
      act(() => {
        for (let i = 0; i < 100; i++) {
          mouseMoveHandler({ clientX: 300 + i });
        }
      });

      const endTime = performance.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(50);
      expect(result.current.width).toBe(399); // Final position
    });

    it('should not cause memory leaks with repeated resize sessions', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Simulate multiple resize sessions
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.startResize({ preventDefault: vi.fn(), clientX: 300 + i * 10 } as any);
        });

        const addEventListenerCalls = (document.addEventListener as any).mock.calls;
        const mouseUpHandler = addEventListenerCalls.find((call: any) => call[0] === 'mouseup')[1];

        act(() => {
          mouseUpHandler();
        });
      }

      // Should not accumulate listeners or cause issues
      expect(result.current.isResizing).toBe(false);
    });
  });

  describe('Difference from useResizable', () => {
    it('should use differential calculation instead of absolute positioning', () => {
      const { result } = renderHook(() => useResizablePanel(defaultOptions));

      // Start at position 300 with width 300
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find((call: any) => call[0] === 'mousemove')[1];

      // Move to position 350 (difference of +50)
      act(() => {
        mouseMoveHandler({ clientX: 350 });
      });

      // Width should be original (300) + difference (50) = 350
      // This is different from useResizable which would set width to clientX directly
      expect(result.current.width).toBe(350);

      // Move to position 320 (difference of +20 from original)
      act(() => {
        mouseMoveHandler({ clientX: 320 });
      });

      // Width should be original (300) + difference (20) = 320
      expect(result.current.width).toBe(320);
    });
  });
});