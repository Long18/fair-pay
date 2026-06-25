import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useSplitCalculation hook
const mockSplitCalculation = {
  participants: [] as Array<{ user_id?: string; computed_amount: number }>,
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  setSplitValue: vi.fn(),
  recalculate: vi.fn(),
  isValid: true,
  totalSplit: 0,
};

vi.mock('@/modules/expenses/hooks/use-split-calculation', () => ({
  useSplitCalculation: () => mockSplitCalculation,
}));

// Mock formatNumber
vi.mock('@/lib/locale-utils', () => ({
  formatNumber: (num: number) => num.toLocaleString(),
}));

// Mock child components to avoid form rendering complexities
vi.mock('@/modules/expenses/components/category-grid', () => ({
  CategoryGrid: () => <div>CategoryGrid</div>,
}));

vi.mock('@/modules/expenses/components/amount-input', () => ({
  AmountInput: () => <div>AmountInput</div>,
}));

vi.mock('@/modules/expenses/components/quick-date-picker', () => ({
  QuickDatePicker: () => <div>QuickDatePicker</div>,
}));

vi.mock('@/modules/expenses/components/participant-chips', () => ({
  ParticipantChips: () => <div>ParticipantChips</div>,
}));

vi.mock('@/modules/expenses/components/quick-templates', () => ({
  QuickTemplates: () => <div>QuickTemplates</div>,
}));

vi.mock('@/modules/expenses/components/markdown-editor', () => ({
  MarkdownEditor: () => <div>MarkdownEditor</div>,
}));

vi.mock('@/modules/expenses/components/attachment-upload', () => ({
  AttachmentUpload: () => <div>AttachmentUpload</div>,
}));

vi.mock('@/modules/expenses/components/recurring-expense-form', () => ({
  RecurringExpenseForm: () => <div>RecurringExpenseForm</div>,
}));

vi.mock('@/modules/expenses/components/friend-expense/friend-expense-layout', () => ({
  FriendExpenseLayout: () => <div>FriendExpenseLayout</div>,
}));

// Types for UI component mocks
interface WithChildren { children?: React.ReactNode }
interface WithChildrenAndHTMLProps extends WithChildren, React.HTMLAttributes<HTMLElement> {}

// Mock UI components
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: WithChildren) => <form>{children}</form>,
  FormField: ({ render }: {
    render: (props: { field: Record<string, unknown>; fieldState: Record<string, unknown> }) => React.ReactNode;
  }) => <>{render({ field: {}, fieldState: {} })}</>,
  FormItem: ({ children }: WithChildren) => <div>{children}</div>,
  FormLabel: ({ children }: WithChildren) => <label>{children}</label>,
  FormControl: ({ children }: WithChildren) => <div>{children}</div>,
  FormMessage: () => <div />,
  FormDescription: ({ children }: WithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input type="checkbox" {...props} />,
}));

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, ...props }: WithChildrenAndHTMLProps) => <div {...props}>{children}</div>,
  RadioGroupItem: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input type="radio" {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: WithChildren) => <div>{children}</div>,
  CardContent: ({ children }: WithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: WithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: WithChildren) => <div>{children}</div>,
  CardDescription: ({ children }: WithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: WithChildren) => <div>{children}</div>,
  CollapsibleContent: ({ children }: WithChildren) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: WithChildren) => <button>{children}</button>,
}));

// Mock Refine useForm AFTER other mocks
vi.mock('@refinedev/react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: (data: Record<string, unknown>) => void) =>
      (e?: { preventDefault?: () => void }) => {
        e?.preventDefault?.();
        return fn({});
      },
    watch: vi.fn(() => undefined),
    formState: { errors: {} },
    reset: vi.fn(),
    saveButtonProps: { disabled: false },
    setValue: vi.fn(),
    getValues: vi.fn(),
  }),
}));

// Import AFTER all mocks are set up
import { ExpenseForm } from '@/modules/expenses/components/expense-form';

describe('ExpenseForm', () => {
  const mockMembers = [
    { id: 'user-1', full_name: 'Alice' },
    { id: 'user-2', full_name: 'Bob' },
    { id: 'user-3', full_name: 'Charlie' },
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockSplitCalculation.addParticipant.mockClear();
    mockSplitCalculation.recalculate.mockClear();
    mockSplitCalculation.participants = [];
    mockSplitCalculation.isValid = true;
    mockSplitCalculation.totalSplit = 0;
  });

  it('should render form', () => {
    const { container } = render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should auto-select all participants for group context', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    // Group context auto-selects all group members on mount
    expect(mockSplitCalculation.addParticipant).toHaveBeenCalledTimes(3);
  });

  it('should auto-select participants for friend context', () => {
    // Friend context: 2 members, no groupId
    render(
      <ExpenseForm
        members={mockMembers.slice(0, 2)}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    // Friend context (groupId undefined) auto-selects both parties
    expect(mockSplitCalculation.addParticipant).toHaveBeenCalledTimes(2);
    expect(mockSplitCalculation.addParticipant).toHaveBeenCalledWith('user-1');
    expect(mockSplitCalculation.addParticipant).toHaveBeenCalledWith('user-2');
  });

  it('should accept default values prop', () => {
    const defaultValues = {
      description: 'Default expense',
      amount: 50,
      currency: 'USD' as const,
      category: 'food',
    };

    const { container } = render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
        defaultValues={defaultValues}
      />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should accept isLoading prop', () => {
    const { container } = render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should render expense form for group context', () => {
    const { container } = render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should accept isEdit prop', () => {
    const { container } = render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
        isEdit={true}
      />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('should accept different currentUserId values', () => {
    const { container } = render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-2"
        onSubmit={mockOnSubmit}
      />
    );

    expect(container.querySelector('form')).toBeInTheDocument();
  });
});
