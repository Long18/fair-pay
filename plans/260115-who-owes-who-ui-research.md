# Research Report: "Who Owes Who" UI Patterns in Group Expense Apps
**Date**: January 15, 2026
**Scope**: Visual representations, color coding, debt simplification, settlement patterns, amount display, grouping strategies
**Status**: Complete research synthesis with actionable recommendations for FairPay

---

## Executive Summary

Group expense apps must display "who owes who" with extreme clarity—users drop off when interfaces feel confusing. This research synthesizes best practices from Splitwise, Venmo, Tricount, and financial app design principles into actionable patterns for FairPay.

**Key Finding**: Success requires combining clear language (avoid "owe"), flexible views (simplified + detailed), prominent CTAs for settlement, and accessibility-first color strategies.

---

## 1. VISUAL REPRESENTATIONS

### 1.1 Card-Based Layout (RECOMMENDED FOR FAIRPAY)

**Pattern**: Person Card with debt summary
```
┌─────────────────────────────────────┐
│ [Avatar] Name                       │
│ Badge: "I Owe" | Amount: -$45.50   │
│ Metadata: 3 expenses • Last: 12/25 │
│ [Expand ↓]                          │
└─────────────────────────────────────┘
```

**Why**:
- Avoids text-heavy walls (critical usability issue)
- Enables expandable hierarchies for expense breakdowns
- Touch-friendly (44x44px minimum targets)
- Works seamlessly on mobile and desktop

**Variants**:
- **Dense List**: For power users who want at-a-glance scanning (Splitwise 3-tab approach)
- **Expanded Cards**: Show contributing expenses inline without navigation
- **Summary + Details**: Header shows net position; click to see breakdown

**FairPay Implementation**: Use collapsible cards for dashboard overview, expand to show contributing expenses without leaving page.

### 1.2 List Views with Metadata Rows

**Pattern**: Tabular layout with condensed information
```
Alice           You owe      -$45.50     [3 expenses]
Bob             Owes you     +$120.00    [1 expense]
Carol           You owe      -$23.25     [2 expenses]
```

**Pros**:
- Scans quickly (multiple people visible)
- Compare amounts across people easily
- Mobile scrollable without expansion state management

**Cons**:
- Dense information packing
- Less suitable for mobile (narrow screens)
- Requires careful typography (contrast, spacing)

**FairPay Usage**: Secondary view in balance table; consider tabbed interface (You Owe / Owed to You / All).

### 1.3 Chart/Summary Visualization

**Pattern**: Overview statistics above list
```
Summary Cards:
┌──────────────┬──────────────┬──────────────┐
│ You Owe      │ Owed to You  │ Net Balance  │
│ $523.50      │ $234.00      │ -$289.50     │
└──────────────┴──────────────┴──────────────┘

[Person List Below]
```

**When to use**:
- Dashboard overview before detail drill-down
- Group views (show total group balance)
- Mobile top section (summary) + scrollable list (details)

**FairPay**: Already implemented (balance summary cards); enhance with visual indicators (progress bars, trend arrows).

---

## 2. COLOR CODING STRATEGIES

### 2.1 Green/Red with Accessibility Caveats

**Standard Pattern**:
- **Green (+)**: Money owed TO you (positive state)
- **Red (-)**: Money you OWE (negative/warning state)

**Critical Concern** ⚠️:
- 300 million people are colorblind (1 in 12 men, 1 in 200 women)
- Red + Green combinations strain eyes (insufficient contrast)
- **Solution**: Add secondary visual cues (icons, badges, text)

**FairPay Implementation**:
```tsx
// Bad: Color alone
<span style={{color: amount < 0 ? 'red' : 'green'}}>
  {formatCurrency(amount)}
</span>

// Good: Color + Icon + Badge + Phrasing
<span className={i_owe_them ? 'text-red-600' : 'text-green-600'}>
  {i_owe_them ? '-' : '+'}
  {formatCurrency(Math.abs(amount))}
</span>
<Badge>{i_owe_them ? 'You Owe' : 'Owes You'}</Badge>
```

### 2.2 Badge-Based Color Coding

**More Accessible Pattern**:
- **Badge: "You Owe"** (warm/red background) + amount
- **Badge: "Owes You"** (cool/green background) + amount
- Both have clear text, contrast > 3:1 ratio

**Example** (from research):
```
[Avatar] Alice
[Red Badge] YOU OWE  |  $45.50
Metadata: 3 expenses
```

**Why Better**:
- Colorblind-safe (text + badge shape + color)
- Consistent with modern fintech (Stripe, Wise, N26)
- Accessible at any zoom level

### 2.3 Avatar + Color Indicator

**Subtle Approach**:
- Avatar border: `border-2 border-red-500` (you owe) vs `border-green-500` (owed)
- Amount text color: red/green secondary
- Badge: primary identifier

**FairPay Current**: Already uses this in phase 2 plan; maintain consistency.

### 2.4 Context-Aware Colors

**For Multi-Person Views**:
- Don't use green/red for every person
- Use avatar backgrounds (user's color) + amount color
- Group by status (You Owe / Owed to You sections)

**Example**:
```
SECTION: You Owe These People
├── Alice (-$45.50) [red text]
├── Bob (-$23.25) [red text]

SECTION: These People Owe You
├── Carol (+$120.00) [green text]
├── Diana (+$50.75) [green text]
```

---

## 3. DEBT SIMPLIFICATION UI

### 3.1 Simplified vs. Full Transactions Toggle

**Pattern**: Two modes with easy switching

```
┌──────────────────────────────┐
│ [Simplified Mode] [Full Mode] │  ← Toggle
└──────────────────────────────┘

SIMPLIFIED (Default):
Alice: -$100  ← Pay once, covers all debts

FULL TRANSACTIONS:
Alice (Expense 1): -$50
Alice (Expense 2): -$30
Alice (Expense 3): -$20  ← All listed
```

**When to Show**:
- **Dashboard**: Simplified by default (less cognitive load)
- **Debt breakdown page**: Simplified primary, full expandable
- **Settlement**: Always show full (what exactly are you settling?)

### 3.2 Algorithm Explanation

**Key UX Principle**: Users don't need to understand the algorithm, but should understand they're getting efficient settlements.

**What to Display**:
```
✓ Number of people you need to pay
✓ Total amount owed
✓ Minimum transactions needed (vs. actual)
✗ Graph algorithms or mathematical details (hidden)
```

**Example Copy**:
```
"You owe Alice $100 total across 3 expenses.
You can settle this with a single payment."
```

### 3.3 Settlement Recommendation Logic

**Best Practice**: Show "what you should pay now"

```
RECOMMENDED SETTLEMENT
┌─────────────────────────────┐
│ Pay Alice: $100.00          │
│ This covers all debts       │
│ [Settle Amount]             │
└─────────────────────────────┘

GRANULAR CONTROL (Optional Expand):
☐ Expense 1 ($50)
☐ Expense 2 ($30)
☐ Expense 3 ($20)
Total Selected: $50
```

**Flow**:
1. Show default (all unpaid)
2. Allow deselection for partial settlement
3. Update recommended amount in real-time

---

## 4. SETTLEMENT ACTION PLACEMENT

### 4.1 Primary CTA Location

**Best Positions** (in priority order):

1. **Sticky Panel** (MOST EFFECTIVE)
   - Fixed bottom/right of screen
   - Always visible during scrolling
   - Shows real-time total as items selected
   - Works on mobile + desktop

2. **Card-Based** (SECONDARY)
   - Dedicated "What to Pay Now" card
   - Positioned after summary, before expense list
   - Converts as part of page content
   - Less interruptive

3. **Floating Action Button** (Mobile)
   - Round button, bottom-right
   - Trigger modal or slide-up sheet
   - Touch-friendly (56x56px minimum)

### 4.2 CTA Button Specifications

**Size Requirements**:
- Minimum: 44x44px (Apple, WCAG)
- Recommended: 48x48px (Google Material)
- Desktop: 40-44px height

**Color & Contrast**:
- Foreground/background: 3:1 minimum ratio
- Primary CTA: Brand color (usually blue/teal)
- Use `text-white` or `text-black` for text (high contrast)

**Copy**:
- ✓ "Settle $100" (specific, action-oriented)
- ✓ "Settle All" (clear scope)
- ✗ "OK" or "Submit" (vague)

**Disabled State**:
- Show when no items selected
- Change to `disabled` attribute + reduced opacity
- Keep visible (don't hide)

### 4.3 Secondary Actions

**Pattern**: Below primary CTA or in button group

```
┌──────────────────────────────┐
│ [Settle $100] (Primary)      │
├──────────────────────────────┤
│ [View Profile] [View History]│  (Secondary)
└──────────────────────────────┘
```

**Which Secondary Actions Matter**:
- **View Profile**: See who this person is
- **View History**: Payment history with this person
- **Record Payment**: If payment made outside app
- **Add Expense**: Quick action to log new split with this person

---

## 5. AMOUNT DISPLAY CONVENTIONS

### 5.1 Positive/Negative Sign Phrasing

**Pattern 1: Sign + Amount (Most Intuitive)**
```
You owe Alice: -$45.50
Alice owes you: +$120.00
```

**Pro**: Mathematically accurate, familiar from banking
**Con**: Negative sign confuses some users

**Pattern 2: "From/To" Language (Clearer)**
```
Pay Alice: $45.50
Receive from Alice: $120.00
```

**Pro**: Natural English, no mathematical thinking
**Con**: Takes more space

**Pattern 3: Badge + Amount (Best for UI)**
```
[YOU OWE] $45.50
[OWES YOU] $120.00
```

**FairPay Recommendation**: Use Pattern 3 (badge) + Pattern 2 (from/to) copy combined:
```
Badge: "YOU OWE"
Phrase: "Pay Alice"
Amount: "$45.50"
```

### 5.2 Amount Prominence

**Visual Hierarchy**:
```
Primary Line (Larger, Bold):
  Person Name | Status Badge | Amount

Secondary Line (Smaller, Muted):
  3 expenses • Last: 12/25 • $234 total
```

**Example**:
```
Alice                  YOU OWE: -$45.50
3 expenses • 12/25                    [▼]
```

**Typography**:
- Amount font: 18-24px, semibold/bold
- Metadata: 12px, #999/muted-foreground
- Badge: 11-12px, medium weight

### 5.3 Precision & Rounding

**Rules**:
- Display: 2 decimal places always ($45.50, not $45.5 or $46)
- Calculation: Full precision until settlement
- Summary: May round to nearest .00 (display only)

**Example**:
```
Contributing Expenses:
  Dinner: $15.67 (my share)
  Drinks: $10.83 (my share)
  Total: $26.50 ✓ (not $26.51 from rounding errors)
```

---

## 6. GROUPING STRATEGIES

### 6.1 Group by Relationship Status (RECOMMENDED)

**Primary Grouping**:
```
SECTION: You Owe These People
├── [Sorted by amount descending]
├── Alice: -$100
├── Bob: -$50
├── Carol: -$25

SECTION: These People Owe You
├── [Sorted by amount descending]
├── Diana: +$150
├── Eve: +$75
```

**Why**:
- Immediate understanding (positive vs. negative)
- Reduces cognitive load (scan one section for action items)
- Separates receiver vs. payer contexts

### 6.2 Group by Time Period

**For Payment History View**:
```
SECTION: This Month (Dec 2025)
├── Alice: -$45
├── Bob: +$120

SECTION: Last Month (Nov 2025)
├── Carol: -$67
├── Diana: +$45

SECTION: Settled (Archived)
├── [Historical debts]
```

**Best For**: Long-term views, history exploration

### 6.3 Group by Context/Group

**For Multi-Group Users**:
```
GROUP: NYC Apartment
├── Alice: -$500 (rent splits)
├── Bob: +$300

GROUP: Weekend Trip
├── Carol: -$450 (travel)
├── Diana: -$200

GROUP: Friends
├── Eve: -$45
```

**Challenges**:
- More sections = more scrolling
- User must remember which groups
- Better: Filterable list instead

### 6.4 Smart Defaults + Filtering

**Best Practice**:
```
Default: Grouped by relationship (Owe/Owed)
Optional Filter Menu:
  ☑ You Owe
  ☑ Owed to You
  ☑ Settled

Filter by Group: [Dropdown]
Filter by Status: [Unpaid / Partial / Paid]
```

---

## 7. FAIRPAY-SPECIFIC RECOMMENDATIONS

### 7.1 Dashboard Overview

**Current State** (from review):
- Balance summary cards implemented ✓
- Expandable debt rows planned ✓
- Need to add: Simplified view toggle, better grouping

**Recommendations**:

1. **Add Simplified/Full Toggle**
   ```tsx
   // In dashboard debt section header
   <SegmentedControl value={mode} onChange={setMode}>
     <SegmentItem value="simplified">Simplified</SegmentItem>
     <SegmentItem value="full">Full Details</SegmentItem>
   </SegmentedControl>
   ```

2. **Improve Card Layout** (Phase 2 plan good, enhance):
   ```tsx
   <DebtRowExpandable>
     {/* Header Row */}
     <Avatar />
     <div>
       <Name />
       <Badge>{i_owe_them ? 'YOU OWE' : 'OWES YOU'}</Badge>
       <Metadata>3 expenses • Last: 12/25</Metadata>
     </div>
     <Amount severity={i_owe_them ? 'destructive' : 'success'} />
     {/* Expanded Section */}
     <ExpenseList />
   </DebtRowExpandable>
   ```

3. **Color Implementation**
   ```tsx
   // Use from existing `getOweStatusColors()` utility
   const statusColors = getOweStatusColors(i_owe_them ? 'owe' : 'owed');
   // Returns: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
   ```

### 7.2 Settlement Flow (/debts/:userId page)

**Three-Part Layout**:

1. **Header**
   - Avatar (64x64px)
   - Name (large, bold)
   - Net position (red if owe, green if owed)
   - Status badges (Unpaid / Partial / Paid counts)

2. **Action Panel** (Sticky on mobile, sidebar on desktop)
   ```
   WHAT TO PAY NOW
   ├── Recommended: -$100.00 (red)
   ├── [Checkbox] All Expenses
   │   ├── ☑ Dinner ($50)
   │   ├── ☑ Drinks ($30)
   │   ├── ☑ Dessert ($20)
   ├── Total Selected: -$100.00
   └── [Settle Selected] (44px, full width mobile)
   ```

3. **Expenses List**
   ```
   Dinner              12/25  -$50.00  [Unpaid]
   Drinks              12/24  -$30.00  [Unpaid]
   Dessert             12/23  -$20.00  [Paid]
   ```

**Key Pattern**: Checkboxes + real-time calculation = users see exact amount before settling

### 7.3 Color Palette for FairPay

**Recommended**:
```
You Owe (Negative):
  Text: #dc2626 (red-600)
  Badge BG: #fecaca (red-200)
  Badge Text: #991b1b (red-900)
  Border: #fca5a5 (red-300)

Owed to You (Positive):
  Text: #16a34a (green-600)
  Badge BG: #bbf7d0 (green-200)
  Badge Text: #15803d (green-900)
  Border: #86efac (green-300)

Partial:
  Text: #ea580c (orange-600)
  Badge BG: #fed7aa (orange-200)
  Badge Text: #7c2d12 (orange-900)

Paid:
  Text: #4b5563 (slate-600)
  Badge BG: #e2e8f0 (slate-200)
  Badge Text: #1e293b (slate-900)
```

**Accessibility Check**:
- All text: 4.5:1+ contrast ratio (WCAG AAA)
- Not colorblind-dependent (badges + text)
- Works on light/dark modes

### 7.4 Mobile vs. Desktop Layouts

**Mobile**:
- Cards: full width, stacked
- Settlement panel: sticky bottom or modal
- Checkboxes: larger touch targets (48x48px)
- Amounts: right-aligned, consistent column width

**Desktop**:
- Cards: 100% width in container
- Settlement panel: sidebar (right, 25% width)
- List: two-column option (name left, amount right)
- Hover states: expand icon, link cursor

---

## 8. EMERGING PATTERNS & INSIGHTS

### 8.1 What Splitwise Does Right

**Three-Tab Interface**:
- Tab 1: "You Owe"
- Tab 2: "You Are Owed"
- Tab 3: "Overall Balance"

**Benefit**: Users filter their own view (less mental load)
**Issue**: Light green on white contrast problem (noted in research)

**Recommendation for FairPay**: Use segmented control instead of tabs, with better color contrast.

### 8.2 Tricount's Organizational Approach

**Two-Tab System**:
- Expenses tab: Lists all costs + who paid
- Balances tab: Debt breakdown with "Who owes whom"

**Key Insight**: Separate concerns
- Expenses: Transaction history
- Balances: Financial state

**FairPay Implementation**: Maintain current approach (dashboard balances view + expandable debts).

### 8.3 Settlement Prevention Patterns

**Important UX Detail** (from Phase 3 plan):
Users must confirm settlements. Add friction intentionally:

```
"Settlements are marked manually. Make sure to complete
payment outside the app before marking as settled."

[Checkbox] I have sent payment
[Settle] button (disabled until checked)
```

This prevents accidental settlements.

### 8.4 Mobile-First Considerations

**Touch-Optimized Patterns**:
1. Swipeable cards (right-to-left actions)
2. Bottom sheets for modals (not centered dialogs)
3. 44x44px+ touch targets (FairPay has SwipeableCard, good)
4. Avoid horizontal scrolling (vertical only)

**FairPay Current**: Has SwipeableCard, ResponsiveDialog ✓

---

## 9. ACCESSIBILITY REQUIREMENTS

### 9.1 Color Contrast

**WCAG AA Minimum**:
- Text on background: 4.5:1
- Large text (18px+): 3:1
- UI Components: 3:1

**FairPay Audit**:
- Check red/green amounts at all sizes
- Test badge contrast on light/dark backgrounds
- Verify icons are not color-only indicators

### 9.2 Keyboard Navigation

**Must Support**:
- Tab through debt rows
- Enter to expand/collapse
- Space to toggle checkboxes
- Arrow keys for list navigation

**Test**: Tab through entire settlement page, no mouse

### 9.3 Screen Reader Support

**Announce**:
- "Alice. Badge: You owe. Amount: $45.50. 3 expenses"
- "Checkbox: Dinner, unpaid, $50"
- "Button: Settle selected, $100, disabled until items selected"

---

## 10. IMPLEMENTATION PRIORITY FOR FAIRPAY

### Phase 1 (Current): Dashboard Debt Breakdown
**Focus**: Clear grouping, expandable expenses
- ✓ Use card layout (collapsible)
- ✓ Add badges (YOU OWE / OWES YOU)
- ✓ Improve color contrast
- ✓ Add metadata (expense count, last transaction)

**File Impact**:
- `/src/components/dashboard/debt-row-expandable.tsx` (exists, enhance)
- `/src/lib/status-colors.ts` (add color palette from section 7.3)

### Phase 2 (Planned): Settlement Page (/debts/:userId)
**Focus**: Clear settlement actions, amount prominence
- ✓ Sticky settlement panel
- ✓ Real-time checkbox calculation
- ✓ Prominent CTA button (settle)
- ✓ Expense list with status badges

**File Impact**:
- `/src/pages/person-debt-breakdown.tsx` (create)
- `/src/components/debts/what-to-pay-now-panel.tsx` (create, enhance with real-time calc)
- `/src/components/debts/debt-breakdown-header.tsx` (exists, verify color usage)

### Phase 3 (Future): Simplified View Toggle
**Focus**: Choice between simplified + detailed transactions
- Toggle: "Simplified / Full"
- Smart grouping by relationship status
- Optional group filtering

**File Impact**:
- `/src/hooks/use-simplified-debts.ts` (exists, verify output)
- New component: `simplified-vs-full-toggle.tsx`

---

## 11. EXTERNAL REFERENCES

**Design Case Studies**:
- [Splitwise Redesign - UX Planet](https://uxplanet.org/splitwiser-the-all-new-splitwise-mobile-app-redesign-ui-ux-case-study-4d3c0313ae6f)
- [Bill Splitting Design - Medium](https://medium.com/design-bootcamp/designing-a-bill-splitting-app-de556d296e33)
- [Tricount UI Redesign - Medium](https://medium.com/design-bootcamp/tricount-ui-redesign-81704385eb57)

**Technical Implementation**:
- [Debt Simplification Algorithm - Medium](https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688)

**Financial App UX**:
- [Banking App Best Practices 2026](https://procreator.design/blog/banking-app-ui-top-best-practices/)
- [Fintech Design Guide - UXDA](https://theuxda.com/blog/top-20-financial-ux-dos-and-donts-to-boost-customer-experience/)

**Accessibility & Color**:
- [Color in UX Design - Toptal](https://www.toptal.com/designers/ux/color-in-ux)
- [Red/Green Colorblind Accessibility - Enterwell](https://enterwell.net/articles/red-and-green-combo-is-bad-for-ux-heres-why)

**CTA Button Design**:
- [CTA Button Best Practices - UX Paradise](https://blog.logrocket.com/ux-design/cta-button-design-best-practices/)

---

## 12. UNRESOLVED QUESTIONS

1. **Multi-Currency Handling**: Should FairPay show "You owe $50 USD + 1,000,000 VND" separately or convert? Research didn't address this.

2. **Group vs. Friend Debts**: Should grouping differ between friend 1-on-1 debts and group expense debts? Separate sections or same UX?

3. **Payment Methods Integration**: How to handle "Settle via Venmo" vs. "Record cash payment"? Separate buttons or unified flow?

4. **Partial Settlements**: Current plan shows full settlement. Should UI support partial payments (e.g., pay $50 of $100 owed)? Requires DB changes.

5. **Settlement History**: Should settled debts remain visible with status "Paid" or archive to history tab? Affects dashboard clutter vs. transparency.

---

## 13. SUCCESS METRICS

**Dashboard View**:
- Users can identify who they owe/are owed within 3 seconds
- Expand action taken by 40%+ of users
- Mobile touch targets: all 44x44px+

**Settlement Page**:
- Settlement completion rate: >60% when user lands on page
- Average time to settle: <2 minutes
- Error rate: <1% (accidental settlements)

**Accessibility**:
- Color contrast: 4.5:1 all amounts
- Keyboard navigation: fully functional (no mouse needed)
- Screen reader: all elements announced correctly

---

## Recommendations Summary

1. **Use card-based layout** with collapsible expense lists (less text-heavy)
2. **Badge + color strategy** for debt status (accessibility-first)
3. **Sticky settlement panel** on settlement page (always visible during scroll)
4. **Real-time calculation** when selecting expenses (transparent UX)
5. **Simplified/Full toggle** for different user needs (power users + novices)
6. **Group by relationship status** (You Owe / Owed to You sections)
7. **Add confirmation friction** before settlement (prevent accidents)
8. **Test colorblind users** before launch (300M affected worldwide)

---

*Report compiled from analysis of Splitwise, Venmo, Tricount, and financial app design best practices. Tailored for FairPay's current architecture and roadmap.*
