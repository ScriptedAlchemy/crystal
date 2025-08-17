# Crystal Frontend Test Suite

This directory contains comprehensive unit tests for the Crystal frontend React application.

## Overview

- **Total Test Files:** 27
- **Total Test Code:** ~14,435 lines
- **Testing Framework:** Vitest + React Testing Library
- **Coverage:** All React components, custom hooks, Zustand stores, and utility functions

## Directory Structure

```
tests/
├── components/         # React component tests (8 files)
│   ├── CreateSessionDialog.test.tsx
│   ├── Settings.test.tsx
│   ├── SessionListItem.test.tsx
│   ├── ProjectSelector.test.tsx
│   ├── CombinedDiffView.test.tsx
│   ├── SessionInput.test.tsx
│   ├── SessionHeader.test.tsx
│   └── PromptHistory.test.tsx
├── hooks/              # Custom hook tests (5 files)
│   ├── useIPCEvents.test.ts
│   ├── useNotifications.test.ts
│   ├── useResizable.test.ts
│   ├── useResizablePanel.test.ts
│   └── useSessionView.test.ts
├── stores/             # Zustand store tests (4 files)
│   ├── errorStore.test.ts
│   ├── githubStore.test.ts
│   ├── navigationStore.test.ts
│   └── sessionStore.test.ts
└── utils/              # Utility function tests (10 files)
    ├── cn.test.ts
    ├── timestampUtils.test.ts
    ├── sanitizer.test.ts
    ├── formatters.test.ts
    ├── debounce.test.ts
    ├── dashboardCache.test.ts
    ├── performanceUtils.test.ts
    ├── terminalTheme.test.ts
    ├── toolFormatter.test.ts
    └── gitStatusLogger.test.ts
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/utils/cn.test.ts

# Run tests in a specific directory
pnpm test tests/components/

# Run tests in watch mode
vitest

# Run with coverage
vitest run --coverage
```

## Test Configuration

- **Config File:** `vitest.config.ts`
- **Setup File:** `src/test/setup.ts`
- **Environment:** jsdom (for DOM testing)
- **Globals:** Enabled for `describe`, `it`, `expect`, etc.

## Key Testing Patterns

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Component from '@/components/Component'

// Mock external dependencies
vi.mock('@/utils/api')

test('should render correctly', () => {
  render(<Component />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react'
import { useCustomHook } from '@/hooks/useCustomHook'

test('should handle state changes', () => {
  const { result } = renderHook(() => useCustomHook())
  
  act(() => {
    result.current.updateState('new value')
  })
  
  expect(result.current.state).toBe('new value')
})
```

### Store Testing
```typescript
import { renderHook, act } from '@testing-library/react'
import { useStore } from '@/stores/store'

beforeEach(() => {
  useStore.setState(initialState)
})

test('should update store', () => {
  const { result } = renderHook(() => useStore())
  
  act(() => {
    result.current.updateData(newData)
  })
  
  expect(result.current.data).toEqual(newData)
})
```

### Utility Testing
```typescript
import { utilityFunction } from '@/utils/utility'

test('should process input correctly', () => {
  const result = utilityFunction('input')
  expect(result).toBe('expected output')
})

test('should handle edge cases', () => {
  expect(utilityFunction('')).toBe('')
  expect(utilityFunction(null)).toBe(null)
})
```

## Mocking Strategy

The test suite comprehensively mocks:

- **Electron IPC API:** All electron communication
- **XTerm.js:** Terminal functionality
- **Monaco Editor:** Code editor
- **DOM APIs:** ResizeObserver, IntersectionObserver, localStorage
- **Web APIs:** Notification API, Web Audio API
- **External Libraries:** DOMPurify, date-fns, etc.

## Test Categories

### 1. Utility Functions (Highest Priority)
Pure functions with comprehensive edge case testing:
- Timestamp handling and timezone safety
- HTML sanitization and XSS prevention
- CSS class merging and theme utilities
- Performance optimization helpers

### 2. Zustand Stores (Critical Business Logic)
State management with complex workflows:
- Session lifecycle and dual storage
- Git status batching mechanisms
- GitHub API integration with caching
- Error state management

### 3. Custom Hooks (Integration Logic)
React hooks managing side effects:
- IPC event handling and throttling
- Terminal management and session switching
- Notification system with permissions
- Resizable panel behavior

### 4. React Components (User Interface)
UI components with user interactions:
- Form validation and submission
- Modal dialogs and settings
- Session management interfaces
- Git operation displays

## Key Testing Features

✅ **Comprehensive Coverage:** All major functions, components, and workflows tested

✅ **Edge Case Handling:** Boundary conditions, invalid inputs, error scenarios

✅ **Performance Testing:** Memory leaks, throttling, debouncing behavior

✅ **Async Operations:** Proper testing of API calls, timers, and event handling

✅ **Type Safety:** Full TypeScript coverage in all tests

✅ **Realistic Data:** Test data matching actual Crystal data structures

✅ **Isolation:** Independent tests with proper setup/teardown

✅ **Maintainability:** Clear, descriptive tests with good organization

## High-Value Test Areas

### Critical Business Logic
- Session management and git operations
- Terminal output processing and formatting
- GitHub integration with CI status
- Configuration management and persistence

### Security & Safety
- HTML sanitization to prevent XSS
- Input validation and error handling
- Timezone-safe timestamp processing
- API error recovery and fallbacks

### Performance & UX
- Debouncing and throttling mechanisms
- Cache management and expiration
- Memory leak prevention
- Loading state management

### Integration Points
- IPC communication with main process
- Store synchronization across components
- Event handling and cleanup
- Theme management and CSS variables

## Contributing to Tests

When adding new functionality:

1. **Write tests first** for new utilities (TDD approach)
2. **Mock external dependencies** appropriately
3. **Test edge cases** and error scenarios
4. **Follow naming conventions** with descriptive test names
5. **Maintain test isolation** with proper setup/teardown
6. **Update this README** when adding new test categories

## Common Issues & Solutions

### Mock Configuration
- Ensure all external dependencies are mocked in `setup.ts`
- Use `vi.mock()` for module-level mocking
- Reset mocks between tests with proper cleanup

### Async Testing
- Use `act()` for state updates in React hooks
- Use `waitFor()` for async operations
- Mock timers when testing time-dependent behavior

### Component Testing
- Mock all API calls and external dependencies
- Provide realistic props and context
- Test user interactions, not implementation details

### Store Testing
- Reset store state in `beforeEach`
- Test both individual actions and complex workflows
- Verify state persistence across hook instances

This test suite ensures Crystal's frontend code quality, catches regressions, and provides confidence for refactoring and new feature development.