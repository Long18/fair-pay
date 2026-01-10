/**
 * Payment State Badge Component Examples
 * 
 * This file demonstrates usage of the PaymentStateBadge component.
 * It is not imported anywhere and serves as documentation.
 */

import { PaymentStateBadge } from "./payment-state-badge";

export function PaymentStateBadgeExamples() {
  return (
    <div className="space-y-8 p-8">
      {/* Basic States */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Basic States</h2>
        <div className="flex gap-4">
          <PaymentStateBadge state="paid" />
          <PaymentStateBadge state="unpaid" />
          <PaymentStateBadge state="partial" />
        </div>
      </section>

      {/* Partial with Percentage */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Partial with Percentage</h2>
        <div className="flex gap-4">
          <PaymentStateBadge state="partial" percentage={25} />
          <PaymentStateBadge state="partial" percentage={50} />
          <PaymentStateBadge state="partial" percentage={75} />
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Size Variants</h2>
        <div className="flex items-center gap-4">
          <PaymentStateBadge state="paid" size="sm" />
          <PaymentStateBadge state="paid" size="md" />
          <PaymentStateBadge state="paid" size="lg" />
        </div>
      </section>

      {/* All Combinations */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Combinations</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <PaymentStateBadge state="paid" size="sm" />
            <PaymentStateBadge state="paid" size="md" />
            <PaymentStateBadge state="paid" size="lg" />
          </div>
          <div className="flex gap-4">
            <PaymentStateBadge state="unpaid" size="sm" />
            <PaymentStateBadge state="unpaid" size="md" />
            <PaymentStateBadge state="unpaid" size="lg" />
          </div>
          <div className="flex gap-4">
            <PaymentStateBadge state="partial" percentage={60} size="sm" />
            <PaymentStateBadge state="partial" percentage={60} size="md" />
            <PaymentStateBadge state="partial" percentage={60} size="lg" />
          </div>
        </div>
      </section>

      {/* Usage in Context */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Usage in Context</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Dinner at Restaurant</p>
              <p className="text-sm text-muted-foreground">$120.00</p>
            </div>
            <PaymentStateBadge state="paid" />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Movie Tickets</p>
              <p className="text-sm text-muted-foreground">$45.00</p>
            </div>
            <PaymentStateBadge state="unpaid" />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Grocery Shopping</p>
              <p className="text-sm text-muted-foreground">$85.00</p>
            </div>
            <PaymentStateBadge state="partial" percentage={50} />
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Usage Examples:
 * 
 * // Basic usage
 * <PaymentStateBadge state="paid" />
 * <PaymentStateBadge state="unpaid" />
 * <PaymentStateBadge state="partial" />
 * 
 * // With percentage (for partial state)
 * <PaymentStateBadge state="partial" percentage={75} />
 * 
 * // With size variants
 * <PaymentStateBadge state="paid" size="sm" />
 * <PaymentStateBadge state="paid" size="md" />
 * <PaymentStateBadge state="paid" size="lg" />
 * 
 * // With custom className
 * <PaymentStateBadge state="paid" className="ml-2" />
 * 
 * // In activity rows
 * <div className="flex items-center gap-2">
 *   <PaymentStateBadge state={expense.paymentState} percentage={expense.partialPercentage} />
 *   <span>{expense.description}</span>
 * </div>
 * 
 * // In split cards
 * <div className="flex items-center justify-between">
 *   <span>{split.userName}</span>
 *   <PaymentStateBadge 
 *     state={split.settled ? "paid" : "unpaid"} 
 *     size="sm"
 *   />
 * </div>
 */
