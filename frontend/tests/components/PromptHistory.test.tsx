import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptHistory } from '../../src/components/PromptHistory';
import { useSessionStore } from '../../src/stores/sessionStore';

// Mock dependencies
vi.mock('../../src/stores/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

interface PromptHistoryItem {
  id: string;
  prompt: string;
  sessionName: string;
  sessionId: string;
  createdAt: string;
  status: string;
}

describe('PromptHistory', () => {
  const mockCreateSession = vi.fn();
  const mockSetActiveSession = vi.fn();
  
  const createMockPrompt = (overrides: Partial<PromptHistoryItem> = {}): PromptHistoryItem => ({
    id: 'prompt-1',
    prompt: 'Implement user authentication',
    sessionName: 'Auth Feature',
    sessionId: 'session-1',
    createdAt: '2024-01-01T12:00:00Z',
    status: 'completed',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useSessionStore
    (useSessionStore as any).mockImplementation((selector: any) => {
      const state = {
        createSession: mockCreateSession,
        setActiveSession: mockSetActiveSession,
        sessions: [
          { id: 'session-1', name: 'Test Session' },
          { id: 'session-2', name: 'Another Session' },
        ],
      };
      
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    });

    // Mock API responses
    (window as any).electronAPI = {
      prompts: {
        getAll: vi.fn().mockResolvedValue({
          success: true,
          data: [
            createMockPrompt({ id: 'prompt-1', prompt: 'Implement user authentication', sessionName: 'Auth Feature' }),
            createMockPrompt({ id: 'prompt-2', prompt: 'Add data validation', sessionName: 'Validation', status: 'running' }),
            createMockPrompt({ id: 'prompt-3', prompt: 'Fix login bug', sessionName: 'Bug Fix', status: 'error' }),
          ],
        }),
        getByPromptId: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'prompt-1',
            sessionId: 'session-1',
            lineNumber: 10,
          },
        }),
      },
    };

    // Mock window events
    window.dispatchEvent = vi.fn();
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  describe('Rendering', () => {
    it('renders prompt history header', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Prompt History')).toBeDefined();
      });
    });

    it('renders search input', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts or session names/i)).toBeDefined();
      });
    });

    it('shows loading state initially', () => {
      (window as any).electronAPI.prompts.getAll.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<PromptHistory />);
      
      expect(screen.getByText('Loading prompt history...')).toBeDefined();
    });

    it('displays prompt cards after loading', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
        expect(screen.getByText('Validation')).toBeDefined();
        expect(screen.getByText('Bug Fix')).toBeDefined();
      });
    });

    it('shows empty state when no prompts exist', async () => {
      (window as any).electronAPI.prompts.getAll.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('No prompt history yet')).toBeDefined();
        expect(screen.getByText('Create a session to start building your prompt history')).toBeDefined();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters prompts by prompt text', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const searchInput = screen.getByPlaceholderText(/search prompts or session names/i);
      await userEvent.type(searchInput, 'authentication');
      
      expect(screen.getByText('Auth Feature')).toBeDefined();
      expect(screen.queryByText('Validation')).toBeNull();
      expect(screen.queryByText('Bug Fix')).toBeNull();
    });

    it('filters prompts by session name', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const searchInput = screen.getByPlaceholderText(/search prompts or session names/i);
      await userEvent.type(searchInput, 'validation');
      
      expect(screen.queryByText('Auth Feature')).toBeNull();
      expect(screen.getByText('Validation')).toBeDefined();
      expect(screen.queryByText('Bug Fix')).toBeNull();
    });

    it('shows no results message when search returns nothing', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const searchInput = screen.getByPlaceholderText(/search prompts or session names/i);
      await userEvent.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No prompts found')).toBeDefined();
      expect(screen.getByText('Try adjusting your search terms')).toBeDefined();
    });

    it('is case insensitive', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const searchInput = screen.getByPlaceholderText(/search prompts or session names/i);
      await userEvent.type(searchInput, 'AUTH');
      
      expect(screen.getByText('Auth Feature')).toBeDefined();
    });

    it('searches both prompt content and session names', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const searchInput = screen.getByPlaceholderText(/search prompts or session names/i);
      await userEvent.type(searchInput, 'bug');
      
      // Should match both the prompt content "Fix login bug" and session name "Bug Fix"
      expect(screen.getByText('Bug Fix')).toBeDefined();
    });
  });

  describe('Prompt Display', () => {
    it('shows prompt content truncated', async () => {
      const longPrompt = 'A'.repeat(250); // Long prompt that will be truncated
      (window as any).electronAPI.prompts.getAll.mockResolvedValue({
        success: true,
        data: [
          createMockPrompt({ prompt: longPrompt, sessionName: 'Long Prompt' }),
        ],
      });

      render(<PromptHistory />);
      
      await waitFor(() => {
        const truncatedText = screen.getByText(/A{190,210}\.\.\./); // Should end with ...
        expect(truncatedText).toBeDefined();
      });
    });

    it('shows full prompt in expandable details', async () => {
      const longPrompt = 'A'.repeat(250);
      (window as any).electronAPI.prompts.getAll.mockResolvedValue({
        success: true,
        data: [
          createMockPrompt({ prompt: longPrompt, sessionName: 'Long Prompt' }),
        ],
      });

      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Show full prompt')).toBeDefined();
      });
      
      const showFullButton = screen.getByText('Show full prompt');
      await userEvent.click(showFullButton);
      
      // Should show the full prompt
      expect(screen.getByText(longPrompt)).toBeDefined();
    });

    it('shows creation date and time', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText(/created 1\/1\/2024/i)).toBeDefined();
        expect(screen.getByText(/at 12:00:00/i)).toBeDefined();
      });
    });

    it('displays status badges with correct colors', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        const completedBadge = screen.getByText('completed');
        const runningBadge = screen.getByText('running');
        const errorBadge = screen.getByText('error');
        
        expect(completedBadge).toBeDefined();
        expect(runningBadge).toBeDefined();
        expect(errorBadge).toBeDefined();
        
        // Check for appropriate styling classes
        expect(completedBadge.className).toContain('text-status-success');
        expect(runningBadge.className).toContain('text-interactive');
        expect(errorBadge.className).toContain('text-status-error');
      });
    });
  });

  describe('Prompt Interactions', () => {
    it('navigates to session when prompt is clicked', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const promptCard = screen.getByText('Auth Feature').closest('div')!;
      await userEvent.click(promptCard);
      
      expect(mockSetActiveSession).toHaveBeenCalledWith('session-1');
      expect((window as any).electronAPI.prompts.getByPromptId).toHaveBeenCalledWith('prompt-1');
    });

    it('dispatches navigation event for existing session', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const promptCard = screen.getByText('Auth Feature').closest('div')!;
      await userEvent.click(promptCard);
      
      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'navigateToPrompt',
            detail: {
              sessionId: 'session-1',
              promptMarker: expect.objectContaining({
                id: 'prompt-1',
                sessionId: 'session-1',
                lineNumber: 10,
              }),
            },
          })
        );
      });
    });

    it('handles non-existent session gracefully', async () => {
      // Mock session that doesn't exist in current sessions
      (useSessionStore as any).mockImplementation((selector: any) => {
        const state = {
          createSession: mockCreateSession,
          setActiveSession: mockSetActiveSession,
          sessions: [], // No sessions
        };
        
        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const promptCard = screen.getByText('Auth Feature').closest('div')!;
      await userEvent.click(promptCard);
      
      // Should not call setActiveSession for non-existent session
      expect(mockSetActiveSession).not.toHaveBeenCalled();
    });

    it('reuses prompt when Reuse button is clicked', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const reuseButton = screen.getAllByText('Reuse')[0];
      await userEvent.click(reuseButton);
      
      expect(mockCreateSession).toHaveBeenCalledWith({
        prompt: 'Implement user authentication',
        worktreeTemplate: 'Auth Feature',
        count: 1,
      });
    });

    it('removes numbering suffix from session name for reuse', async () => {
      (window as any).electronAPI.prompts.getAll.mockResolvedValue({
        success: true,
        data: [
          createMockPrompt({ sessionName: 'Auth Feature-2', prompt: 'Test prompt' }),
        ],
      });

      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature-2')).toBeDefined();
      });
      
      const reuseButton = screen.getByText('Reuse');
      await userEvent.click(reuseButton);
      
      expect(mockCreateSession).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        worktreeTemplate: 'Auth Feature',
        count: 1,
      });
    });

    it('copies prompt to clipboard when Copy button is clicked', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const copyButton = screen.getAllByText('Copy')[0];
      await userEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Implement user authentication');
    });

    it('prevents event bubbling on button clicks', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const reuseButton = screen.getAllByText('Reuse')[0];
      await userEvent.click(reuseButton);
      
      // Clicking button should not trigger prompt navigation
      expect(mockSetActiveSession).not.toHaveBeenCalled();
    });
  });

  describe('Visual Selection', () => {
    it('shows selected prompt with different styling', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const promptCard = screen.getByText('Auth Feature').closest('div')!;
      await userEvent.click(promptCard);
      
      // Should have interactive styling when selected
      await waitFor(() => {
        expect(promptCard.className).toContain('border-interactive');
      });
    });

    it('updates selection when different prompt is clicked', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
        expect(screen.getByText('Validation')).toBeDefined();
      });
      
      const firstPrompt = screen.getByText('Auth Feature').closest('div')!;
      const secondPrompt = screen.getByText('Validation').closest('div')!;
      
      await userEvent.click(firstPrompt);
      await waitFor(() => {
        expect(firstPrompt.className).toContain('border-interactive');
      });
      
      await userEvent.click(secondPrompt);
      await waitFor(() => {
        expect(secondPrompt.className).toContain('border-interactive');
        expect(firstPrompt.className).not.toContain('border-interactive');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API fetch errors gracefully', async () => {
      (window as any).electronAPI.prompts.getAll.mockRejectedValue(new Error('API Error'));

      render(<PromptHistory />);
      
      // Should not crash and should still show the interface
      await waitFor(() => {
        expect(screen.getByText('Prompt History')).toBeDefined();
      });
    });

    it('handles prompt navigation errors', async () => {
      (window as any).electronAPI.prompts.getByPromptId.mockRejectedValue(new Error('Navigation failed'));

      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const promptCard = screen.getByText('Auth Feature').closest('div')!;
      await userEvent.click(promptCard);
      
      // Should not crash
      expect(mockSetActiveSession).toHaveBeenCalledWith('session-1');
    });

    it('handles reuse errors gracefully', async () => {
      mockCreateSession.mockRejectedValue(new Error('Creation failed'));

      render(<PromptHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Auth Feature')).toBeDefined();
      });
      
      const reuseButton = screen.getAllByText('Reuse')[0];
      await userEvent.click(reuseButton);
      
      // Should not crash
      expect(mockCreateSession).toHaveBeenCalled();
    });
  });

  describe('Status Color Mapping', () => {
    it('maps all status types to correct colors', async () => {
      (window as any).electronAPI.prompts.getAll.mockResolvedValue({
        success: true,
        data: [
          createMockPrompt({ status: 'completed' }),
          createMockPrompt({ status: 'stopped' }),
          createMockPrompt({ status: 'error' }),
          createMockPrompt({ status: 'running' }),
          createMockPrompt({ status: 'waiting' }),
          createMockPrompt({ status: 'unknown' }),
        ],
      });

      render(<PromptHistory />);
      
      await waitFor(() => {
        const completedBadge = screen.getByText('completed');
        const stoppedBadge = screen.getByText('stopped');
        const errorBadge = screen.getByText('error');
        const runningBadge = screen.getByText('running');
        const waitingBadge = screen.getByText('waiting');
        const unknownBadge = screen.getByText('unknown');
        
        expect(completedBadge.className).toContain('text-status-success');
        expect(stoppedBadge.className).toContain('text-status-success');
        expect(errorBadge.className).toContain('text-status-error');
        expect(runningBadge.className).toContain('text-interactive');
        expect(waitingBadge.className).toContain('text-status-warning');
        expect(unknownBadge.className).toContain('text-text-tertiary');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeDefined();
        expect(heading.textContent).toBe('Prompt History');
      });
    });

    it('has accessible search input', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        const searchInput = screen.getByRole('searchbox');
        expect(searchInput).toBeDefined();
      });
    });

    it('has accessible buttons', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
        
        buttons.forEach(button => {
          expect(button.textContent).toBeTruthy();
        });
      });
    });

    it('has clickable cards', async () => {
      render(<PromptHistory />);
      
      await waitFor(() => {
        const promptCards = screen.getAllByRole('generic');
        const clickableCards = promptCards.filter(card => 
          card.className.includes('cursor-pointer')
        );
        expect(clickableCards.length).toBeGreaterThan(0);
      });
    });
  });
});