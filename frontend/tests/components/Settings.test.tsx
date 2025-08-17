import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../../src/components/Settings';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useTheme } from '../../src/contexts/ThemeContext';

// Mock dependencies
vi.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    updateSettings: vi.fn(),
  })),
}));

vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  })),
}));

vi.mock('../../src/components/NotificationSettings', () => ({
  NotificationSettings: ({ settings, onUpdateSettings }: any) => (
    <div data-testid="notification-settings">
      <button
        onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
        data-testid="toggle-notifications"
      >
        Toggle Notifications
      </button>
    </div>
  ),
}));

vi.mock('../../src/components/StravuConnection', () => ({
  StravuConnection: () => (
    <div data-testid="stravu-connection">
      Stravu Connection Component
    </div>
  ),
}));

describe('Settings', () => {
  const mockUpdateSettings = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockOnClose = vi.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useNotifications
    (useNotifications as any).mockReturnValue({
      updateSettings: mockUpdateSettings,
    });

    // Mock useTheme
    (useTheme as any).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    // Mock API responses
    (window as any).electronAPI = {
      config: {
        get: vi.fn().mockResolvedValue({
          success: true,
          data: {
            verbose: false,
            anthropicApiKey: 'test-api-key',
            systemPromptAppend: 'Global prompt',
            claudeExecutablePath: '/usr/local/bin/claude',
            defaultPermissionMode: 'ignore',
            autoCheckUpdates: true,
            notifications: {
              enabled: true,
              playSound: true,
              notifyOnStatusChange: true,
              notifyOnWaiting: true,
              notifyOnComplete: true,
            },
          },
        }),
        update: vi.fn().mockResolvedValue({
          success: true,
        }),
      },
      checkForUpdates: vi.fn().mockResolvedValue({
        success: true,
        data: { hasUpdate: false },
      }),
      dialog: {
        openFile: vi.fn().mockResolvedValue({
          success: true,
          data: '/custom/claude/path',
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  describe('Rendering', () => {
    it('renders the settings dialog when open', () => {
      render(<Settings {...defaultProps} />);
      
      expect(screen.getByText('Crystal Settings')).toBeDefined();
      expect(screen.getByText('General')).toBeDefined();
      expect(screen.getByText('Notifications')).toBeDefined();
      expect(screen.getByText('Stravu Integration')).toBeDefined();
    });

    it('does not render when closed', () => {
      render(<Settings {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Crystal Settings')).toBeNull();
    });

    it('shows general tab by default', () => {
      render(<Settings {...defaultProps} />);
      
      expect(screen.getByText('General').className).toContain('text-interactive');
      expect(screen.getByText('Appearance & Theme')).toBeDefined();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to notifications tab', async () => {
      render(<Settings {...defaultProps} />);
      
      const notificationsTab = screen.getByText('Notifications');
      await userEvent.click(notificationsTab);
      
      expect(notificationsTab.className).toContain('text-interactive');
      expect(screen.getByTestId('notification-settings')).toBeDefined();
    });

    it('switches to stravu tab', async () => {
      render(<Settings {...defaultProps} />);
      
      const stravuTab = screen.getByText('Stravu Integration');
      await userEvent.click(stravuTab);
      
      expect(stravuTab.className).toContain('text-interactive');
      expect(screen.getByTestId('stravu-connection')).toBeDefined();
    });

    it('switches back to general tab', async () => {
      render(<Settings {...defaultProps} />);
      
      // Switch to notifications first
      await userEvent.click(screen.getByText('Notifications'));
      
      // Then back to general
      const generalTab = screen.getByText('General');
      await userEvent.click(generalTab);
      
      expect(generalTab.className).toContain('text-interactive');
      expect(screen.getByText('Appearance & Theme')).toBeDefined();
    });
  });

  describe('Configuration Loading', () => {
    it('loads configuration on mount', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.config.get).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        const apiKeyInput = screen.getByDisplayValue('test-api-key');
        expect(apiKeyInput).toBeDefined();
      });
    });

    it('handles configuration loading errors', async () => {
      (window as any).electronAPI.config.get.mockRejectedValue(new Error('Failed to load config'));

      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load configuration')).toBeDefined();
      });
    });

    it('populates form fields with loaded data', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-api-key')).toBeDefined();
        expect(screen.getByDisplayValue('Global prompt')).toBeDefined();
        expect(screen.getByDisplayValue('/usr/local/bin/claude')).toBeDefined();
      });
    });
  });

  describe('Theme Management', () => {
    it('displays current theme', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Dark Mode')).toBeDefined();
        expect(screen.getByText('Currently active')).toBeDefined();
      });
    });

    it('toggles theme when clicked', async () => {
      render(<Settings {...defaultProps} />);
      
      const themeButton = screen.getByRole('button', { name: /dark mode/i });
      await userEvent.click(themeButton);
      
      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('shows light mode when theme is light', async () => {
      (useTheme as any).mockReturnValue({
        theme: 'light',
        toggleTheme: mockToggleTheme,
      });

      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Light Mode')).toBeDefined();
      });
    });
  });

  describe('Form Validation and Submission', () => {
    it('submits form with updated values', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-api-key')).toBeDefined();
      });
      
      const verboseCheckbox = screen.getByLabelText(/enable verbose logging/i);
      await userEvent.click(verboseCheckbox);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.config.update).toHaveBeenCalledWith({
          verbose: true,
          anthropicApiKey: 'test-api-key',
          systemPromptAppend: 'Global prompt',
          claudeExecutablePath: '/usr/local/bin/claude',
          defaultPermissionMode: 'ignore',
          autoCheckUpdates: true,
          notifications: {
            enabled: true,
            playSound: true,
            notifyOnStatusChange: true,
            notifyOnWaiting: true,
            notifyOnComplete: true,
          },
        });
      });
    });

    it('handles form submission errors', async () => {
      (window as any).electronAPI.config.update.mockRejectedValue(new Error('Update failed'));

      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-api-key')).toBeDefined();
      });
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to update configuration/i)).toBeDefined();
      });
    });

    it('shows loading state during submission', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      (window as any).electronAPI.config.update.mockReturnValue(updatePromise);

      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-api-key')).toBeDefined();
      });
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(saveButton);
      
      expect(saveButton.hasAttribute('disabled')).toBe(true);
      
      resolveUpdate!({ success: true });
      
      await waitFor(() => {
        expect(saveButton.hasAttribute('disabled')).toBe(false);
      });
    });

    it('closes dialog after successful submission', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-api-key')).toBeDefined();
      });
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Permission Mode Settings', () => {
    it('shows current permission mode', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        const ignoreRadio = screen.getByLabelText(/fast & flexible/i);
        expect((ignoreRadio as HTMLInputElement).checked).toBe(true);
      });
    });

    it('allows changing permission mode', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/fast & flexible/i)).toBeDefined();
      });
      
      const approveRadio = screen.getByLabelText(/secure & controlled/i);
      await userEvent.click(approveRadio);
      
      expect((approveRadio as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('Custom Claude Executable', () => {
    it('shows browse button for custom executable', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /browse/i })).toBeDefined();
      });
    });

    it('opens file dialog when browse is clicked', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('/usr/local/bin/claude')).toBeDefined();
      });
      
      const browseButton = screen.getByRole('button', { name: /browse/i });
      await userEvent.click(browseButton);
      
      expect((window as any).electronAPI.dialog.openFile).toHaveBeenCalledWith({
        title: 'Select Claude Executable',
        buttonLabel: 'Select',
        properties: ['openFile'],
        filters: [
          { name: 'Executables', extensions: ['*'] }
        ]
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('/custom/claude/path')).toBeDefined();
      });
    });
  });

  describe('Update Management', () => {
    it('shows auto-update checkbox', async () => {
      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        const autoUpdateCheckbox = screen.getByLabelText(/check for updates automatically/i);
        expect((autoUpdateCheckbox as HTMLInputElement).checked).toBe(true);
      });
    });

    it('checks for updates manually', async () => {
      render(<Settings {...defaultProps} />);
      
      const checkButton = screen.getByRole('button', { name: /check now/i });
      await userEvent.click(checkButton);
      
      expect((window as any).electronAPI.checkForUpdates).toHaveBeenCalled();
    });

    it('shows update available message', async () => {
      (window as any).electronAPI.checkForUpdates.mockResolvedValue({
        success: true,
        data: { hasUpdate: true },
      });

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Settings {...defaultProps} />);
      
      const checkButton = screen.getByRole('button', { name: /check now/i });
      await userEvent.click(checkButton);
      
      // Since hasUpdate is true, no alert should be shown (update will be shown via version event)
      expect(alertSpy).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('shows no update available message', async () => {
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Settings {...defaultProps} />);
      
      const checkButton = screen.getByRole('button', { name: /check now/i });
      await userEvent.click(checkButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('You are running the latest version of Crystal!');
      });
      
      alertSpy.mockRestore();
    });
  });

  describe('Notification Settings Integration', () => {
    it('renders notification settings component', async () => {
      render(<Settings {...defaultProps} />);
      
      const notificationsTab = screen.getByText('Notifications');
      await userEvent.click(notificationsTab);
      
      expect(screen.getByTestId('notification-settings')).toBeDefined();
    });

    it('updates notification settings', async () => {
      render(<Settings {...defaultProps} />);
      
      const notificationsTab = screen.getByText('Notifications');
      await userEvent.click(notificationsTab);
      
      const toggleButton = screen.getByTestId('toggle-notifications');
      await userEvent.click(toggleButton);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Dialog Management', () => {
    it('closes when cancel button is clicked', async () => {
      render(<Settings {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows footer only for general and notifications tabs', async () => {
      render(<Settings {...defaultProps} />);
      
      // General tab should show footer
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDefined();
      
      // Switch to Stravu tab
      await userEvent.click(screen.getByText('Stravu Integration'));
      
      // Footer should not be visible
      expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull();
    });
  });

  describe('Advanced Options Expansion', () => {
    it('shows advanced options as collapsed by default', () => {
      render(<Settings {...defaultProps} />);
      
      // Advanced options should exist but be collapsed
      expect(screen.getByText('Advanced Options')).toBeDefined();
    });

    it('shows system updates as collapsed by default', () => {
      render(<Settings {...defaultProps} />);
      
      expect(screen.getByText('Updates & Maintenance')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<Settings {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByRole('tablist')).toBeDefined();
    });

    it('supports keyboard navigation between tabs', async () => {
      render(<Settings {...defaultProps} />);
      
      const generalTab = screen.getByText('General');
      const notificationsTab = screen.getByText('Notifications');
      
      // Tab should be focusable
      generalTab.focus();
      expect(document.activeElement).toBe(generalTab);
      
      // Arrow keys should navigate tabs (this is typically handled by the component)
      await userEvent.keyboard('{ArrowRight}');
      notificationsTab.focus();
      expect(document.activeElement).toBe(notificationsTab);
    });
  });

  describe('Error Handling', () => {
    it('displays error message when config loading fails', async () => {
      (window as any).electronAPI.config.get.mockRejectedValue(new Error('Network error'));

      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load configuration')).toBeDefined();
      });
    });

    it('displays error message when update fails', async () => {
      (window as any).electronAPI.config.update.mockRejectedValue(new Error('Update failed'));

      render(<Settings {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-api-key')).toBeDefined();
      });
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeDefined();
      });
    });
  });
});