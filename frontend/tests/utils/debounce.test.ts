import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, type DebouncedFunction } from '../../src/utils/debounce';

describe('debounce utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledOnce();
  });

  test('should cancel previous timeout when called multiple times', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledOnce();
  });

  test('should reset timeout on each call', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn();
    vi.advanceTimersByTime(500);
    
    debouncedFn(); // Should reset the timer
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledOnce();
  });

  test('should pass arguments to the original function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn('arg1', 'arg2', 123);
    vi.advanceTimersByTime(1000);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  test('should pass the most recent arguments when called multiple times', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('third');

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledWith('third');
    expect(fn).toHaveBeenCalledOnce();
  });

  test('should preserve this context', () => {
    const obj = {
      value: 42,
      method: function(this: any) {
        return this.value;
      }
    };

    const fn = vi.fn(function(this: any) {
      return obj.method.call(this);
    });

    const debouncedFn = debounce(fn, 1000);
    debouncedFn.call(obj);

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledOnce();
  });

  test('should work with different wait times', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const debouncedFn1 = debounce(fn1, 500);
    const debouncedFn2 = debounce(fn2, 1500);

    debouncedFn1();
    debouncedFn2();

    vi.advanceTimersByTime(500);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(fn2).toHaveBeenCalledOnce();
  });

  test('should handle zero wait time', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 0);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledOnce();
  });

  describe('cancel functionality', () => {
    test('should have a cancel method', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      expect(typeof debouncedFn.cancel).toBe('function');
    });

    test('should cancel pending execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      debouncedFn.cancel();

      vi.advanceTimersByTime(1000);
      expect(fn).not.toHaveBeenCalled();
    });

    test('should be safe to call cancel multiple times', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      debouncedFn.cancel();
      debouncedFn.cancel();
      debouncedFn.cancel();

      vi.advanceTimersByTime(1000);
      expect(fn).not.toHaveBeenCalled();
    });

    test('should be safe to call cancel when no execution is pending', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn.cancel(); // No pending execution
      expect(() => debouncedFn.cancel()).not.toThrow();
    });

    test('should allow new executions after cancel', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      debouncedFn.cancel();

      debouncedFn(); // New execution
      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledOnce();
    });

    test('should cancel and then allow immediate re-execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn('first');
      vi.advanceTimersByTime(500);
      
      debouncedFn.cancel();
      debouncedFn('second');
      
      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledWith('second');
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('type safety', () => {
    test('should maintain function signature with no parameters', () => {
      const fn = () => 'result';
      const debouncedFn: DebouncedFunction<typeof fn> = debounce(fn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(1000);
    });

    test('should maintain function signature with parameters', () => {
      const fn = (a: string, b: number) => `${a}-${b}`;
      const debouncedFn: DebouncedFunction<typeof fn> = debounce(fn, 1000);

      debouncedFn('test', 123);
      vi.advanceTimersByTime(1000);
    });

    test('should maintain function signature with optional parameters', () => {
      const fn = (a: string, b?: number) => `${a}-${b || 0}`;
      const debouncedFn: DebouncedFunction<typeof fn> = debounce(fn, 1000);

      debouncedFn('test');
      debouncedFn('test', 456);
      vi.advanceTimersByTime(1000);
    });

    test('should handle rest parameters', () => {
      const fn = (...args: string[]) => args.join(',');
      const debouncedFn: DebouncedFunction<typeof fn> = debounce(fn, 1000);

      debouncedFn('a', 'b', 'c');
      vi.advanceTimersByTime(1000);
    });
  });

  describe('edge cases', () => {
    test('should handle rapid successive calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      // Call 100 times rapidly
      for (let i = 0; i < 100; i++) {
        debouncedFn(i);
      }

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith(99); // Last call wins
    });

    test('should handle very short delays', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1);

      debouncedFn();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledOnce();
    });

    test('should handle very long delays', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100000);

      debouncedFn();
      vi.advanceTimersByTime(50000);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50000);
      expect(fn).toHaveBeenCalledOnce();
    });

    test('should handle multiple debounced functions independently', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debouncedFn1 = debounce(fn1, 500);
      const debouncedFn2 = debounce(fn2, 1000);

      debouncedFn1();
      debouncedFn2();

      vi.advanceTimersByTime(500);
      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).not.toHaveBeenCalled();

      debouncedFn1(); // Reset timer for fn1
      vi.advanceTimersByTime(500);
      expect(fn1).toHaveBeenCalledOnce(); // Still only once
      expect(fn2).toHaveBeenCalledOnce(); // Now called

      vi.advanceTimersByTime(500);
      expect(fn1).toHaveBeenCalledTimes(2); // Now called again
    });

    test('should work correctly when called at exact timeout boundary', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(999);
      debouncedFn(); // Called just before timeout

      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('real-world scenarios', () => {
    test('should debounce search input simulation', () => {
      const searchFn = vi.fn();
      const debouncedSearch = debounce(searchFn, 300);

      // Simulate rapid typing
      debouncedSearch('a');
      vi.advanceTimersByTime(100);
      debouncedSearch('ap');
      vi.advanceTimersByTime(100);
      debouncedSearch('app');
      vi.advanceTimersByTime(100);
      debouncedSearch('appl');
      vi.advanceTimersByTime(100);
      debouncedSearch('apple');

      // Should not have called search yet
      expect(searchFn).not.toHaveBeenCalled();

      // User stops typing
      vi.advanceTimersByTime(300);
      expect(searchFn).toHaveBeenCalledWith('apple');
      expect(searchFn).toHaveBeenCalledOnce();
    });

    test('should debounce resize event simulation', () => {
      const resizeHandler = vi.fn();
      const debouncedResize = debounce(resizeHandler, 250);

      // Simulate window resize events
      for (let i = 0; i < 10; i++) {
        debouncedResize({ width: 800 + i * 10, height: 600 });
        vi.advanceTimersByTime(50);
      }

      // Should not have called handler during resize
      expect(resizeHandler).not.toHaveBeenCalled();

      // Resize stops
      vi.advanceTimersByTime(250);
      expect(resizeHandler).toHaveBeenCalledWith({ width: 890, height: 600 });
      expect(resizeHandler).toHaveBeenCalledOnce();
    });

    test('should debounce API call simulation', () => {
      const apiCall = vi.fn();
      const debouncedApiCall = debounce(apiCall, 500);

      // Rapid button clicks
      debouncedApiCall({ userId: 1, action: 'like' });
      debouncedApiCall({ userId: 1, action: 'like' });
      debouncedApiCall({ userId: 1, action: 'like' });

      vi.advanceTimersByTime(500);
      expect(apiCall).toHaveBeenCalledOnce();
      expect(apiCall).toHaveBeenCalledWith({ userId: 1, action: 'like' });
    });
  });
});