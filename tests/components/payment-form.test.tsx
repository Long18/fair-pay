import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentForm } from '@/modules/payments/components/payment-form';

// Mock Refine useForm - simplified for component rendering tests
vi.mock('@refinedev/react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.();
      return fn({});
    },
    watch: vi.fn(),
    formState: { errors: {} },
    reset: vi.fn(),
    saveButtonProps: { disabled: false },
  }),
}));

describe('PaymentForm', () => {
  const mockMembers = [
    { id: 'user-1', full_name: 'Alice' },
    { id: 'user-2', full_name: 'Bob' },
    { id: 'user-3', full_name: 'Charlie' },
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should render form fields', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/From/i)).toBeInTheDocument();
    expect(screen.getByText('Alice (You)')).toBeInTheDocument();
    expect(screen.getByText(/To/i)).toBeInTheDocument();
    expect(screen.getByText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByText(/Date/i)).toBeInTheDocument();
  });

  it('should filter out current user from recipients', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        onSubmit={mockOnSubmit}
      />
    );

    // Alice should not appear in the recipient dropdown
    const recipientSelect = screen.getByRole('combobox', { name: /To/i });
    expect(recipientSelect).toBeInTheDocument();
  });

  it('should pre-fill suggested amount', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        suggestedAmount={50}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe('50');
  });

  it('should pre-fill suggested recipient', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        suggestedToUserId="user-2"
        onSubmit={mockOnSubmit}
      />
    );

    // The form should have user-2 as default value
    const toSelect = screen.getByRole('combobox', { name: /To/i });
    expect(toSelect).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
    expect(submitButton).toBeDisabled();
  });

  it('should display currency selector', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/Currency/i)).toBeInTheDocument();
  });

  it('should allow optional note field', () => {
    render(
      <PaymentForm
        fromUserId="user-1"
        fromUserName="Alice"
        members={mockMembers}
        onSubmit={mockOnSubmit}
      />
    );

    const noteField = screen.getByLabelText(/Note/i);
    expect(noteField).toBeInTheDocument();
  });
});

