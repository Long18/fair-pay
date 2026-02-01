import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'expenses.participants': 'Participants',
        'expenses.selected': 'selected',
        'expenses.add': 'Add',
        'expenses.addByEmail': 'Add by Email',
        'expenses.pending': 'Pending',
        'common.you': 'You',
        'expenses.unknown': 'Unknown',
        'auth.invalidEmail': 'Invalid email address',
        'auth.emailPlaceholder': 'Enter email',
        'expenses.emailAlreadyAdded': 'Email already added',
        'expenses.enterAmounts': 'Enter amounts',
        'expenses.enterPercentages': 'Enter percentages',
        'expenses.totalSplit': 'Total Split',
        'expenses.splitMismatch': `Total (${options?.splitAmount}) doesn't match expense (${options?.expenseAmount})`,
        'expenses.noParticipants': 'No participants',
        'expenses.clickToAdd': 'Click to add',
        'common.search': 'Search',
        'groups.noGroups': 'No groups',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock formatNumber
vi.mock('@/lib/locale-utils', () => ({
  formatNumber: (num: number) => num.toLocaleString(),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, variant, size, className }: any) => (
    <button onClick={onClick} type={type} className={className}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ type, placeholder, value, onChange, onKeyDown, className, ...props }: any) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open, onOpenChange }: any) => (
    <div data-testid="popover">{children}</div>
  ),
  PopoverTrigger: ({ children, asChild }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children, className }: any) => (
    <div data-testid="popover-content" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: any) => <div data-testid="command">{children}</div>,
  CommandInput: ({ placeholder }: any) => (
    <input type="text" placeholder={placeholder} data-testid="command-input" />
  ),
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children }: any) => <div data-testid="command-group">{children}</div>,
  CommandItem: ({ children, onSelect, value }: any) => (
    <div data-testid="command-item" onClick={onSelect} className="cursor-pointer">
      {children}
    </div>
  ),
}));

// Mock icons
vi.mock('@/components/ui/icons', () => ({
  UserPlusIcon: () => <span data-testid="user-plus-icon">+</span>,
  XIcon: () => <span data-testid="x-icon">✕</span>,
  CheckIcon: () => <span data-testid="check-icon">✓</span>,
  UsersIcon: () => <span data-testid="users-icon">👥</span>,
  MailIcon: () => <span data-testid="mail-icon">✉</span>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Import AFTER mocks
import { ParticipantChips } from '@/modules/expenses/components/participant-chips';

describe('ParticipantChips', () => {
  const mockMembers = [
    { id: 'user-1', full_name: 'Alice' },
    { id: 'user-2', full_name: 'Bob' },
    { id: 'user-3', full_name: 'Charlie' },
  ];

  const mockOnAddParticipant = vi.fn();
  const mockOnAddParticipantByEmail = vi.fn();
  const mockOnRemoveParticipant = vi.fn();
  const mockOnSplitValueChange = vi.fn();

  const defaultProps = {
    members: mockMembers,
    participants: [],
    availableMembers: mockMembers,
    currentUserId: 'user-1',
    splitMethod: 'equal' as const,
    currency: 'USD',
    onAddParticipant: mockOnAddParticipant,
    onAddParticipantByEmail: mockOnAddParticipantByEmail,
    onRemoveParticipant: mockOnRemoveParticipant,
    onSplitValueChange: mockOnSplitValueChange,
    totalSplit: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email input field', () => {
    render(<ParticipantChips {...defaultProps} />);
    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    expect(emailInputs.length).toBeGreaterThan(0);
  });

  it('should reject invalid email format', async () => {
    const user = userEvent.setup();
    render(<ParticipantChips {...defaultProps} />);

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0];

    await user.type(emailInput, 'invalid-email');

    const addButtons = screen.getAllByText('Add');
    const addButton = addButtons[addButtons.length - 1]; // Email add button

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('should accept valid email format', async () => {
    const user = userEvent.setup();
    render(<ParticipantChips {...defaultProps} />);

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0];

    await user.type(emailInput, 'test@example.com');

    const addButtons = screen.getAllByText('Add');
    const addButton = addButtons[addButtons.length - 1];

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnAddParticipantByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should prevent duplicate email addition', async () => {
    const user = userEvent.setup();
    const participants = [
      {
        pending_email: 'existing@example.com',
        computed_amount: 100,
      },
    ];

    render(
      <ParticipantChips {...defaultProps} participants={participants as any} />
    );

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0];

    await user.type(emailInput, 'existing@example.com');

    const addButtons = screen.getAllByText('Add');
    const addButton = addButtons[addButtons.length - 1];

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Email already added')).toBeInTheDocument();
    });
    expect(mockOnAddParticipantByEmail).not.toHaveBeenCalled();
  });

  it('should add pending participant by email', async () => {
    const user = userEvent.setup();
    render(<ParticipantChips {...defaultProps} />);

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0];

    await user.type(emailInput, 'pending@example.com');

    const addButtons = screen.getAllByText('Add');
    const addButton = addButtons[addButtons.length - 1];

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnAddParticipantByEmail).toHaveBeenCalledWith('pending@example.com');
    });
  });

  it('should display pending chip with visual distinction', () => {
    const participants = [
      {
        pending_email: 'pending@example.com',
        computed_amount: 50,
      },
    ];

    render(
      <ParticipantChips {...defaultProps} participants={participants as any} />
    );

    // Check for pending email display
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();

    // Check for mail icon (visual distinction)
    const mailIcons = screen.getAllByTestId('mail-icon');
    expect(mailIcons.length).toBeGreaterThan(0);

    // Check for "Pending" badge
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should remove pending participant chip', async () => {
    const participants = [
      {
        pending_email: 'pending@example.com',
        computed_amount: 50,
      },
    ];

    render(
      <ParticipantChips {...defaultProps} participants={participants as any} />
    );

    const xIcons = screen.getAllByTestId('x-icon');
    expect(xIcons.length).toBeGreaterThan(0);

    fireEvent.click(xIcons[0]);

    await waitFor(() => {
      expect(mockOnRemoveParticipant).toHaveBeenCalledWith('pending@example.com');
    });
  });

  it('should mix user_id and email participants', () => {
    const participants = [
      {
        user_id: 'user-1',
        computed_amount: 50,
      },
      {
        pending_email: 'pending@example.com',
        computed_amount: 50,
      },
    ];

    render(
      <ParticipantChips {...defaultProps} participants={participants as any} />
    );

    // Check for user name
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Check for pending email
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();

    // Check for "You" badge (current user)
    expect(screen.getByText('You')).toBeInTheDocument();

    // Check for "Pending" badge
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should submit email on Enter key', async () => {
    const user = userEvent.setup();
    render(<ParticipantChips {...defaultProps} />);

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0];

    await user.type(emailInput, 'enter-test@example.com');
    fireEvent.keyDown(emailInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnAddParticipantByEmail).toHaveBeenCalledWith('enter-test@example.com');
    });
  });

  it('should clear email input on successful add', async () => {
    const user = userEvent.setup();
    render(<ParticipantChips {...defaultProps} />);

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0] as HTMLInputElement;

    await user.type(emailInput, 'clear-test@example.com');

    const addButtons = screen.getAllByText('Add');
    const addButton = addButtons[addButtons.length - 1];

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(emailInput.value).toBe('');
    });
  });

  it('should normalize email to lowercase', async () => {
    const user = userEvent.setup();
    render(<ParticipantChips {...defaultProps} />);

    const emailInputs = screen.getAllByPlaceholderText('Enter email');
    const emailInput = emailInputs[0];

    await user.type(emailInput, 'Test@Example.COM');

    const addButtons = screen.getAllByText('Add');
    const addButton = addButtons[addButtons.length - 1];

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnAddParticipantByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});
