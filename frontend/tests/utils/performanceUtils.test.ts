import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDocumentVisible,
  throttle,
  debounce,
  BatchProcessor,
  createVisibilityAwareInterval,
  createAnimationObserver
} from '../../src/utils/performanceUtils';

describe('performanceUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isDocumentVisible', () => {
    test('should return true when document is visible', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      
      expect(isDocumentVisible()).toBe(true);
    });

    test('should return false when document is hidden', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      
      expect(isDocumentVisible()).toBe(false);
    });

    test('should return false when document is prerender', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'prerender',
        writable: true
      });
      
      expect(isDocumentVisible()).toBe(false);
    });
  });

  describe('throttle', () => {
    test('should execute function immediately on first call', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn();
      expect(fn).toHaveBeenCalledOnce();
    });

    test('should throttle subsequent calls within delay period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledOnce();
    });

    test('should allow execution after delay period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn();
      vi.advanceTimersByTime(1000);
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should schedule delayed execution if called during throttle period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn();
      vi.advanceTimersByTime(500);
      throttledFn(); // Should schedule a call for 500ms later

      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should pass arguments correctly', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should use latest arguments for delayed execution', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn('first');
      vi.advanceTimersByTime(500);
      throttledFn('second');

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    test('should cancel previous delayed execution when new one is scheduled', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn();
      vi.advanceTimersByTime(500);
      throttledFn(); // Schedule delayed call
      vi.advanceTimersByTime(200);
      throttledFn(); // Should cancel previous and schedule new

      vi.advanceTimersByTime(300); // 500ms from the last call
      expect(fn).toHaveBeenCalledTimes(1); // Only initial call

      vi.advanceTimersByTime(500); // Complete the delay
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    test('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledOnce();
    });

    test('should reset delay on subsequent calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(500);
      debouncedFn();

      vi.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledOnce();
    });

    test('should pass arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(1000);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('BatchProcessor', () => {
    test('should process items in batches', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      batcher.add('item1');
      batcher.add('item2');
      batcher.add('item3');

      expect(processor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
    });

    test('should use custom delay', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 500);

      batcher.add('item');

      vi.advanceTimersByTime(400);
      expect(processor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalled();
    });

    test('should use default delay if not specified', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor);

      batcher.add('item');

      vi.advanceTimersByTime(15);
      expect(processor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(processor).toHaveBeenCalledWith(['item']);
    });

    test('should accumulate items from multiple add calls', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      batcher.add('item1');
      vi.advanceTimersByTime(50);
      batcher.add('item2');
      vi.advanceTimersByTime(50);

      expect(processor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    test('should reset timer on each add call', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      batcher.add('item1');
      vi.advanceTimersByTime(90);
      batcher.add('item2'); // Should reset timer

      vi.advanceTimersByTime(90);
      expect(processor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10);
      expect(processor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    test('should flush immediately when called', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      batcher.add('item1');
      batcher.add('item2');
      batcher.flush();

      expect(processor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    test('should not process empty batch on flush', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      batcher.flush();
      expect(processor).not.toHaveBeenCalled();
    });

    test('should clear timeout on flush', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      batcher.add('item');
      batcher.flush();

      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalledOnce(); // Only from flush, not from timeout
    });

    test('should handle multiple batch cycles', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor(processor, 100);

      // First batch
      batcher.add('item1');
      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalledWith(['item1']);

      // Second batch
      batcher.add('item2');
      batcher.add('item3');
      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalledWith(['item2', 'item3']);

      expect(processor).toHaveBeenCalledTimes(2);
    });

    test('should handle complex object types', () => {
      const processor = vi.fn();
      const batcher = new BatchProcessor<{ id: number; name: string }>(processor, 100);

      batcher.add({ id: 1, name: 'test1' });
      batcher.add({ id: 2, name: 'test2' });

      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalledWith([
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' }
      ]);
    });
  });

  describe('createVisibilityAwareInterval', () => {
    let mockDocument: any;

    beforeEach(() => {
      mockDocument = {
        visibilityState: 'visible',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true
      });
    });

    test('should use active interval when document is visible', () => {
      const callback = vi.fn();
      const cleanup = createVisibilityAwareInterval(callback, 1000);

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);

      cleanup();
    });

    test('should use inactive interval when document is hidden', () => {
      mockDocument.visibilityState = 'hidden';
      
      const callback = vi.fn();
      const cleanup = createVisibilityAwareInterval(callback, 1000, 5000);

      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(4000);
      expect(callback).toHaveBeenCalledOnce();

      cleanup();
    });

    test('should use default inactive interval (10x active) when not specified', () => {
      mockDocument.visibilityState = 'hidden';
      
      const callback = vi.fn();
      const cleanup = createVisibilityAwareInterval(callback, 1000);

      vi.advanceTimersByTime(5000);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);
      expect(callback).toHaveBeenCalledOnce();

      cleanup();
    });

    test('should switch intervals on visibility change', () => {
      const callback = vi.fn();
      const cleanup = createVisibilityAwareInterval(callback, 1000, 5000);

      // Get the visibility change handler
      const visibilityHandler = mockDocument.addEventListener.mock.calls
        .find(([event]: any) => event === 'visibilitychange')?.[1];

      expect(visibilityHandler).toBeDefined();

      // Start with visible (1000ms interval)
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();

      // Change to hidden
      mockDocument.visibilityState = 'hidden';
      visibilityHandler();

      // Should now use 5000ms interval
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce(); // No new call

      vi.advanceTimersByTime(4000);
      expect(callback).toHaveBeenCalledTimes(2);

      cleanup();
    });

    test('should clean up event listeners on cleanup', () => {
      const callback = vi.fn();
      const cleanup = createVisibilityAwareInterval(callback, 1000);

      cleanup();

      expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    test('should clear intervals on cleanup', () => {
      const callback = vi.fn();
      const cleanup = createVisibilityAwareInterval(callback, 1000);

      cleanup();

      vi.advanceTimersByTime(5000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('createAnimationObserver', () => {
    let mockElement: HTMLElement;
    let mockObserver: any;

    beforeEach(() => {
      mockElement = document.createElement('div');
      
      mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn()
      };

      global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
        mockObserver.callback = callback;
        return mockObserver;
      });
    });

    test('should create intersection observer with correct threshold', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      createAnimationObserver(mockElement, onVisible, onHidden);

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { threshold: 0.1 }
      );
    });

    test('should observe the provided element', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      createAnimationObserver(mockElement, onVisible, onHidden);

      expect(mockObserver.observe).toHaveBeenCalledWith(mockElement);
    });

    test('should call onVisible when element becomes visible', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      createAnimationObserver(mockElement, onVisible, onHidden);

      // Simulate intersection change
      mockObserver.callback([{ isIntersecting: true }]);

      expect(onVisible).toHaveBeenCalledOnce();
      expect(onHidden).not.toHaveBeenCalled();
    });

    test('should call onHidden when element becomes hidden', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      createAnimationObserver(mockElement, onVisible, onHidden);

      // Simulate intersection change
      mockObserver.callback([{ isIntersecting: false }]);

      expect(onHidden).toHaveBeenCalledOnce();
      expect(onVisible).not.toHaveBeenCalled();
    });

    test('should handle multiple intersection entries', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      createAnimationObserver(mockElement, onVisible, onHidden);

      // Simulate multiple entries
      mockObserver.callback([
        { isIntersecting: true },
        { isIntersecting: false },
        { isIntersecting: true }
      ]);

      expect(onVisible).toHaveBeenCalledTimes(2);
      expect(onHidden).toHaveBeenCalledOnce();
    });

    test('should return cleanup function that disconnects observer', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      const cleanup = createAnimationObserver(mockElement, onVisible, onHidden);
      cleanup();

      expect(mockObserver.disconnect).toHaveBeenCalledOnce();
    });

    test('should not trigger callbacks after cleanup', () => {
      const onVisible = vi.fn();
      const onHidden = vi.fn();

      const cleanup = createAnimationObserver(mockElement, onVisible, onHidden);
      cleanup();

      // Try to trigger callback after cleanup
      mockObserver.callback([{ isIntersecting: true }]);

      expect(onVisible).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    test('should combine throttle with visibility awareness', () => {
      const callback = vi.fn();
      const throttledCallback = throttle(callback, 1000);
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });

      // Rapid calls while visible - should throttle
      for (let i = 0; i < 10; i++) {
        if (isDocumentVisible()) {
          throttledCallback();
        }
        vi.advanceTimersByTime(100);
      }

      expect(callback).toHaveBeenCalledOnce();
    });

    test('should use BatchProcessor with performance optimization', () => {
      const items: string[] = [];
      const processor = (batch: string[]) => {
        items.push(...batch);
      };

      const batcher = new BatchProcessor(processor, 16); // 60fps

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        batcher.add(`item-${i}`);
      }

      vi.advanceTimersByTime(16);
      expect(items).toHaveLength(100);
    });
  });
});