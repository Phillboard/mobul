/**
 * AI Designer Components Tests
 * 
 * Basic rendering and interaction tests for the AI Designer components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AILandingPageChat, TEMPLATE_STARTERS } from '../components/AILandingPageChat';
import { VersionHistory } from '../components/VersionHistory';
import type { ChatMessage, Version } from '../types';

// Mock components that depend on external libraries
vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mock Editor</div>,
}));

describe('AILandingPageChat', () => {
  const defaultProps = {
    messages: [] as ChatMessage[],
    isGenerating: false,
    selectedElement: null,
    hasContent: false,
    onSendMessage: vi.fn(),
    onGenerateFromTemplate: vi.fn(),
    onClearChat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render template gallery when no content', () => {
      render(<AILandingPageChat {...defaultProps} />);
      
      expect(screen.getByText('Create Your Landing Page')).toBeInTheDocument();
      expect(screen.getByText(/Start with a template/i)).toBeInTheDocument();
    });

    it('should show template buttons', () => {
      render(<AILandingPageChat {...defaultProps} />);
      
      // Check that some templates are rendered
      TEMPLATE_STARTERS.forEach(template => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      });
    });

    it('should show example prompts', () => {
      render(<AILandingPageChat {...defaultProps} />);
      
      expect(screen.getByText(/Or try these examples/i)).toBeInTheDocument();
    });
  });

  describe('With Content', () => {
    const messagesProps = {
      ...defaultProps,
      hasContent: true,
      messages: [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Create a SaaS landing page',
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Your landing page has been generated!',
          timestamp: new Date(),
          metadata: { tokensUsed: 500 },
        },
      ],
    };

    it('should render messages when content exists', () => {
      render(<AILandingPageChat {...messagesProps} />);
      
      expect(screen.getByText('Create a SaaS landing page')).toBeInTheDocument();
      expect(screen.getByText('Your landing page has been generated!')).toBeInTheDocument();
    });

    it('should show token badge for AI messages', () => {
      render(<AILandingPageChat {...messagesProps} />);
      
      expect(screen.getByText('500 tokens')).toBeInTheDocument();
    });

    it('should show quick suggestions when has content', () => {
      render(<AILandingPageChat {...messagesProps} />);
      
      // Quick suggestions like "Add contact form" should appear
      expect(screen.getByText('Add contact form')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should have an input textarea', () => {
      render(<AILandingPageChat {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText(/Describe your landing page/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should call onSendMessage when form is submitted', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();
      
      render(<AILandingPageChat {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByPlaceholderText(/Describe your landing page/i);
      await user.type(textarea, 'Create a landing page');
      
      const submitButton = screen.getByRole('button', { name: /generate/i });
      await user.click(submitButton);
      
      expect(onSendMessage).toHaveBeenCalledWith('Create a landing page');
    });

    it('should disable submit when generating', () => {
      render(<AILandingPageChat {...defaultProps} isGenerating={true} />);
      
      const submitButton = screen.getByRole('button', { name: /generate/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Template Selection', () => {
    it('should call onGenerateFromTemplate when template is clicked', async () => {
      const user = userEvent.setup();
      const onGenerateFromTemplate = vi.fn();
      
      render(<AILandingPageChat {...defaultProps} onGenerateFromTemplate={onGenerateFromTemplate} />);
      
      const template = TEMPLATE_STARTERS[0];
      const templateButton = screen.getByText(template.name);
      await user.click(templateButton);
      
      expect(onGenerateFromTemplate).toHaveBeenCalledWith(template);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when generating', () => {
      render(<AILandingPageChat {...defaultProps} isGenerating={true} hasContent={true} messages={[
        { id: '1', role: 'user', content: 'Test', timestamp: new Date() }
      ]} />);
      
      expect(screen.getByText(/Generating/i)).toBeInTheDocument();
    });
  });

  describe('Clear Chat', () => {
    it('should show clear button when messages exist', () => {
      render(<AILandingPageChat 
        {...defaultProps} 
        messages={[{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }]}
        hasContent={true}
      />);
      
      // Clear button should be visible
      const clearButton = screen.getByTitle('Clear conversation');
      expect(clearButton).toBeInTheDocument();
    });
  });
});

describe('VersionHistory', () => {
  const mockVersions: Version[] = [
    {
      version: 1,
      html: '<div>Version 1</div>',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      changeDescription: 'Initial generation',
      tokensUsed: 1000,
    },
    {
      version: 2,
      html: '<div>Version 2</div>',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
      changeDescription: 'Added contact form',
      tokensUsed: 500,
    },
    {
      version: 3,
      html: '<div>Version 3</div>',
      timestamp: new Date().toISOString(), // Now
      changeDescription: 'Changed colors',
      tokensUsed: 300,
      isManualEdit: true,
    },
  ];

  const defaultProps = {
    versions: mockVersions,
    currentVersion: 3,
    onRestoreVersion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state when no versions', () => {
      render(<VersionHistory {...defaultProps} versions={[]} />);
      
      expect(screen.getByText('No History Yet')).toBeInTheDocument();
    });
  });

  describe('Version List', () => {
    it('should render all versions', () => {
      render(<VersionHistory {...defaultProps} />);
      
      expect(screen.getByText('Version 1')).toBeInTheDocument();
      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Version 3')).toBeInTheDocument();
    });

    it('should show current version badge', () => {
      render(<VersionHistory {...defaultProps} />);
      
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('should show manual edit badge for manual edits', () => {
      render(<VersionHistory {...defaultProps} />);
      
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('should show change descriptions', () => {
      render(<VersionHistory {...defaultProps} />);
      
      expect(screen.getByText('Initial generation')).toBeInTheDocument();
      expect(screen.getByText('Added contact form')).toBeInTheDocument();
      expect(screen.getByText('Changed colors')).toBeInTheDocument();
    });
  });

  describe('Version Stats', () => {
    it('should show version count', () => {
      render(<VersionHistory {...defaultProps} />);
      
      expect(screen.getByText('3 versions')).toBeInTheDocument();
    });

    it('should show total tokens used', () => {
      render(<VersionHistory {...defaultProps} />);
      
      // 1000 + 500 + 300 = 1800
      expect(screen.getByText('1,800')).toBeInTheDocument();
    });
  });

  describe('Version Expansion', () => {
    it('should expand version details on click', async () => {
      const user = userEvent.setup();
      render(<VersionHistory {...defaultProps} />);
      
      // Click on version 1 to expand
      const version1 = screen.getByText('Version 1');
      await user.click(version1);
      
      // Should now show metadata
      await waitFor(() => {
        expect(screen.getByText(/1,000 tokens/)).toBeInTheDocument();
      });
    });

    it('should show restore button for non-current versions', async () => {
      const user = userEvent.setup();
      render(<VersionHistory {...defaultProps} />);
      
      // Expand version 1
      const version1 = screen.getByText('Version 1');
      await user.click(version1);
      
      await waitFor(() => {
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });
    });
  });

  describe('Restore Functionality', () => {
    it('should show confirmation dialog when restore is clicked', async () => {
      const user = userEvent.setup();
      render(<VersionHistory {...defaultProps} />);
      
      // Expand version 1
      await user.click(screen.getByText('Version 1'));
      
      // Click restore
      await waitFor(async () => {
        const restoreButton = screen.getByText('Restore');
        await user.click(restoreButton);
      });
      
      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/Restore Version 1/)).toBeInTheDocument();
      });
    });

    it('should call onRestoreVersion when confirmed', async () => {
      const user = userEvent.setup();
      const onRestoreVersion = vi.fn();
      
      render(<VersionHistory {...defaultProps} onRestoreVersion={onRestoreVersion} />);
      
      // Expand version 1
      await user.click(screen.getByText('Version 1'));
      
      // Click restore
      await waitFor(async () => {
        const restoreButton = screen.getByText('Restore');
        await user.click(restoreButton);
      });
      
      // Confirm restore
      await waitFor(async () => {
        const confirmButton = screen.getAllByText('Restore')[1]; // Second restore button in dialog
        await user.click(confirmButton);
      });
      
      expect(onRestoreVersion).toHaveBeenCalledWith(1);
    });
  });
});



