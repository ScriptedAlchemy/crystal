import { describe, test, expect } from 'vitest';
import { cn } from '../../src/utils/cn';

describe('cn utility function', () => {
  test('should combine classes without duplicates', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500'); // Later class should override
  });

  test('should handle undefined and null values', () => {
    const result = cn('text-black', undefined, null, 'font-bold');
    expect(result).toBe('text-black font-bold');
  });

  test('should handle empty strings', () => {
    const result = cn('', 'text-blue-500', '');
    expect(result).toBe('text-blue-500');
  });

  test('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    );
    
    expect(result).toBe('base-class active-class');
  });

  test('should handle arrays of classes', () => {
    const result = cn(['flex', 'items-center'], 'justify-center');
    expect(result).toBe('flex items-center justify-center');
  });

  test('should merge conflicting Tailwind classes correctly', () => {
    const result = cn('p-4 px-2');
    expect(result).toBe('p-4 px-2'); // Tailwind merge should handle the conflict
  });

  test('should handle objects with conditional classes', () => {
    const result = cn({
      'text-red-500': true,
      'text-blue-500': false,
      'font-bold': true
    });
    
    expect(result).toBe('text-red-500 font-bold');
  });

  test('should merge hover and focus states correctly', () => {
    const result = cn(
      'bg-white hover:bg-gray-100',
      'focus:bg-gray-200 hover:bg-blue-100'
    );
    
    expect(result).toBe('bg-white focus:bg-gray-200 hover:bg-blue-100');
  });

  test('should handle responsive classes', () => {
    const result = cn('text-sm md:text-base lg:text-lg', 'md:text-xl');
    expect(result).toBe('text-sm lg:text-lg md:text-xl');
  });

  test('should handle complex class combinations', () => {
    type Variant = 'primary' | 'secondary';
    type Size = 'large' | 'small';
    
    const variant: Variant = 'primary';
    const size: Size = 'large';
    const disabled = false;
    
    const result = cn(
      'button',
      variant === 'primary' && 'btn-primary',
      variant === 'secondary' && 'btn-secondary',
      size === 'large' && 'btn-lg',
      size === 'small' && 'btn-sm',
      disabled && 'opacity-50 cursor-not-allowed',
      'transition-colors duration-200'
    );
    
    expect(result).toBe('button btn-primary btn-lg transition-colors duration-200');
  });

  test('should return empty string for no valid classes', () => {
    const result = cn(undefined, null, false, '');
    expect(result).toBe('');
  });

  test('should handle nested arrays and objects', () => {
    const result = cn(
      ['flex', ['items-center', 'justify-center']],
      { 'bg-white': true, 'text-black': false }
    );
    
    expect(result).toBe('flex items-center justify-center bg-white');
  });
});