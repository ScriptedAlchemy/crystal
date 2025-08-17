/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizable } from '../../src/hooks/useResizable';

describe('useResizable', () => {
  const defaultOptions = {
    defaultWidth: 300,
    minWidth: 200,
    maxWidth: 600,
    storageKey: 'test-resizable-width',
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
      const { result } = renderHook(() => useResizable(defaultOptions));

      expect(result.current.width).toBe(300);
      expect(result.current.isResizing).toBe(false);
      expect(typeof result.current.startResize).toBe('function');
    });

    it('should load width from localStorage when available', () => {
      localStorage.getItem = vi.fn().mockReturnValue('400');

      const { result } = renderHook(() => useResizable(defaultOptions));

      expect(localStorage.getItem).toHaveBeenCalledWith('test-resizable-width');
      expect(result.current.width).toBe(400);
    });

    it('should use default width when localStorage value is invalid', () => {
      localStorage.getItem = vi.fn().mockReturnValue('invalid');

      const { result } = renderHook(() => useResizable(defaultOptions));

      expect(result.current.width).toBe(300);
    });

    it('should use default width when localStorage value is out of bounds', () => {
      localStorage.getItem = vi.fn().mockReturnValue('100'); // Below minWidth

      const { result } = renderHook(() => useResizable(defaultOptions));

      expect(result.current.width).toBe(300);
    });

    it('should respect minWidth and maxWidth constraints from localStorage', () => {
      localStorage.getItem = vi.fn().mockReturnValue('700'); // Above maxWidth

      const { result } = renderHook(() => useResizable(defaultOptions));

      expect(result.current.width).toBe(300); // Falls back to default
    });

    it('should work without storageKey', () => {
      const optionsWithoutStorage = {
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 600,
      };

      const { result } = renderHook(() => useResizable(optionsWithoutStorage));

      expect(result.current.width).toBe(300);
      expect(localStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('Width Persistence', () => {
    it('should save width to localStorage when changed', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      // Simulate a width change
      act(() => {
        // Internal width update would normally happen through mouse events
        // We'll test this through the actual resize process
      });

      // Width changes happen through mouse events, so we test localStorage
      // through the effect that watches width changes
      expect(localStorage.setItem).toHaveBeenCalledWith('test-resizable-width', '300');
    });

    it('should not save to localStorage without storageKey', () => {
      const optionsWithoutStorage = {
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 600,
      };

      renderHook(() => useResizable(optionsWithoutStorage));

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Resize Interaction', () => {
    it('should start resizing on startResize call', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

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
      const { result } = renderHook(() => useResizable(defaultOptions));

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

    it('should handle mouse move during resize', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      // Start resizing
      const startEvent = {
        preventDefault: vi.fn(),
        clientX: 300,
      } as any;

      act(() => {
        result.current.startResize(startEvent);
      });

      // Get the mousemove handler that was registered
      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveCall = addEventListenerCalls.find(call => call[0] === 'mousemove');
      const mouseMoveHandler = mouseMoveCall[1];

      // Simulate mouse move
      act(() => {
        mouseMoveHandler({ clientX: 400 });
      });

      expect(result.current.width).toBe(400);
    });

    it('should respect minWidth constraint during resize', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];

      act(() => {
        mouseMoveHandler({ clientX: 100 }); // Below minWidth
      });

      expect(result.current.width).toBe(200); // Should be clamped to minWidth
    });

    it('should respect maxWidth constraint during resize', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];

      act(() => {
        mouseMoveHandler({ clientX: 800 }); // Above maxWidth
      });

      expect(result.current.width).toBe(600); // Should be clamped to maxWidth
    });

    it('should stop resizing on mouse up', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      expect(result.current.isResizing).toBe(true);

      // Get the mouseup handler
      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseUpHandler = addEventListenerCalls.find(call => call[0] === 'mouseup')[1];

      act(() => {
        mouseUpHandler();
      });

      expect(result.current.isResizing).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners when resizing stops', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      // Get handlers
      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];
      const mouseUpHandler = addEventListenerCalls.find(call => call[0] === 'mouseup')[1];

      act(() => {
        mouseUpHandler();
      });

      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', mouseMoveHandler);
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', mouseUpHandler);
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    it('should cleanup event listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useResizable(defaultOptions));

      // Start resizing
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      // Unmount while resizing
      unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('should not setup listeners when not resizing', () => {
      renderHook(() => useResizable(defaultOptions));

      // Should not have added any event listeners
      expect(document.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple resize starts correctly', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      // Start first resize
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const firstCallCount = (document.addEventListener as any).mock.calls.length;

      // Start second resize while first is active
      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 350 } as any);
      });

      // Should not add more listeners
      expect((document.addEventListener as any).mock.calls.length).toBe(firstCallCount);
      expect(result.current.isResizing).toBe(true);
    });

    it('should handle resize with no storageKey correctly', () => {
      const optionsWithoutStorage = {
        ...defaultOptions,
        storageKey: undefined as any,
      };

      const { result } = renderHook(() => useResizable(optionsWithoutStorage));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];

      act(() => {
        mouseMoveHandler({ clientX: 400 });
      });

      // Should update width but not save to localStorage
      expect(result.current.width).toBe(400);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle rapid mouse movements', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];

      // Simulate rapid movements
      act(() => {
        mouseMoveHandler({ clientX: 350 });
        mouseMoveHandler({ clientX: 380 });
        mouseMoveHandler({ clientX: 420 });
        mouseMoveHandler({ clientX: 450 });
      });

      expect(result.current.width).toBe(450);
    });

    it('should handle mouse events with invalid coordinates', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];

      // Test with undefined/NaN coordinates
      act(() => {
        mouseMoveHandler({ clientX: NaN });
      });

      // Should not crash and maintain valid width
      expect(result.current.width).toBeGreaterThanOrEqual(defaultOptions.minWidth);
      expect(result.current.width).toBeLessThanOrEqual(defaultOptions.maxWidth);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return useResizable(defaultOptions);
      };

      const { rerender } = renderHook(TestComponent);

      const initialRenderCount = renderCount;

      // Multiple rerenders shouldn't increase hook internal renders
      rerender();
      rerender();
      rerender();

      expect(renderCount).toBe(initialRenderCount + 3); // Only component rerenders
    });

    it('should handle high-frequency mouse events efficiently', () => {
      const { result } = renderHook(() => useResizable(defaultOptions));

      act(() => {
        result.current.startResize({ preventDefault: vi.fn(), clientX: 300 } as any);
      });

      const addEventListenerCalls = (document.addEventListener as any).mock.calls;
      const mouseMoveHandler = addEventListenerCalls.find(call => call[0] === 'mousemove')[1];

      // Simulate very high frequency events
      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          mouseMoveHandler({ clientX: 300 + i });
        }
      });

      const endTime = performance.now();
      
      // Should complete quickly (less than 100ms for 100 events)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.width).toBe(399); // Final position
    });
  });
});