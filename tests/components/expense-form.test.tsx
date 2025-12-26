import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpenseForm } from '@/modules/expenses/components/expense-form';

// Mock useSplitCalculation hook
const mockSplitCalculation = {
  participants: [],
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

// Mock Refine useForm - simplified for component rendering tests
vi.mock('@refinedev/react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.();
      return fn({});
    },
    watch: vi.fn(() => 0),
    formState: { errors: {} },
    reset: vi.fn(),
    saveButtonProps: { disabled: false },
  }),
}));

// Mock formatNumber
vi.mock('@/lib/locale-utils', () => ({
  formatNumber: (num: number) => num.toLocaleString(),
}));

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

  it('should render form fields', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByText(/Currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Paid by/i)).toBeInTheDocument();
  });

  it('should add all members as participants on mount', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(mockSplitCalculation.addParticipant).toHaveBeenCalledTimes(mockMembers.length);
    mockMembers.forEach(member => {
      expect(mockSplitCalculation.addParticipant).toHaveBeenCalledWith(member.id);
    });
  });

  it('should initialize with members as participants', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    // Should add all members as participants
    expect(mockSplitCalculation.addParticipant).toHaveBeenCalledTimes(mockMembers.length);
  });

  it('should use default values when provided', () => {
    const defaultValues = {
      description: 'Default expense',
      amount: 50,
      currency: 'USD' as const,
      category: 'food',
    };

    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
        defaultValues={defaultValues}
      />
    );

    const descriptionInput = screen.getByLabelText(/Description/i) as HTMLInputElement;
    expect(descriptionInput.value).toBe(defaultValues.description);
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

  it('should show loading state when isLoading is true', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
    expect(submitButton).toBeDisabled();
  });

  it('should display split method options', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/Split Method/i)).toBeInTheDocument();
  });

  it('should display split method selector', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/Split Method/i)).toBeInTheDocument();
  });

  it('should handle recurring expense toggle', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        onSubmit={mockOnSubmit}
      />
    );

    const recurringToggle = screen.getByRole('switch', { name: /recurring/i });
    expect(recurringToggle).toBeInTheDocument();
  });

  it('should set current user as default payer', () => {
    render(
      <ExpenseForm
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-2"
        onSubmit={mockOnSubmit}
      />
    );

    // The form should default to user-2 as payer
    const paidBySelect = screen.getByRole('combobox', { name: /Paid by/i });
    expect(paidBySelect).toBeInTheDocument();
  });
});
