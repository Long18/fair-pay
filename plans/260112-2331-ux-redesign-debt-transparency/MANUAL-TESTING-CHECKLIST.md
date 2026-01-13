# Manual Testing Checklist

**Purpose:** Validate UI/UX redesign implementation in browser
**Estimated Time:** 2-3 hours
**Prerequisites:** Local dev server running (`npm run dev`)

---

## Setup

1. [ ] Start development server: `npm run dev`
2. [ ] Open browser (Chrome recommended for DevTools)
3. [ ] Login with test account
4. [ ] Ensure test data exists (expenses with various statuses)

---

## Test 1: Typography Consistency

**Goal:** Verify typography hierarchy is consistent across all screens

### Dashboard
- [ ] Page title "Dashboard" is large and bold (typography-page-title)
- [ ] "Debt Breakdown" section title is prominent (typography-section-title)
- [ ] Card titles in debt breakdown are medium weight (typography-card-title)
- [ ] Person names in rows are legible (typography-row-title)
- [ ] Dates and metadata are small and muted (typography-metadata)
- [ ] Amounts are bold, right-aligned, tabular-nums (typography-amount-prominent)

### Person Debt Breakdown (`/debts/:userId`)
- [ ] Person name in header is large
- [ ] "Net Balance" amount is very prominent
- [ ] "Contributing Expenses" is section title
- [ ] Expense descriptions are row titles
- [ ] "My Share" amounts are bold and prominent

### Expense Detail (`/expenses/show/:id`)
- [ ] "Your Position" card title is prominent
- [ ] Amounts in position card are bold
- [ ] Participant names are row titles
- [ ] Split amounts are bold and right-aligned

**Pass Criteria:** Typography feels consistent and hierarchical across all screens

---

## Test 2: Navigation Flow

**Goal:** Verify navigation matches user expectations (no surprise profile redirects)

### Flow A: Dashboard → Person Debt Breakdown
1. [ ] Go to Dashboard
2. [ ] Scroll to "Debt Breakdown" section
3. [ ] Find person row (e.g., "Alice")
4. [ ] Click "View Full Breakdown" button or person name
5. [ ] **Verify:** URL changes to `/debts/:userId` (NOT `/profile/:userId`)
6. [ ] **Verify:** Person Debt Breakdown page loads
7. [ ] Click "View Profile" button in header
8. [ ] **Verify:** URL changes to `/profile/:userId`
9. [ ] **Verify:** Profile page loads

**Pass Criteria:** Clicking person from dashboard goes to debt breakdown first, not profile

### Flow B: Dashboard → Expense Detail
1. [ ] Go to Dashboard
2. [ ] Expand person row (click chevron or row itself)
3. [ ] **Verify:** Contributing expenses list expands
4. [ ] Click an expense in the list
5. [ ] **Verify:** URL changes to `/expenses/show/:id`
6. [ ] **Verify:** Expense detail page loads
7. [ ] **Verify:** "Your Position" card visible at top
8. [ ] **Verify:** User's row is emphasized (border + background) in participants table

**Pass Criteria:** Clicking expense navigates to detail with user-centric view

### Flow C: Person Debt Breakdown → Settlement
1. [ ] Navigate to `/debts/:userId` for person you owe money
2. [ ] **Verify:** "What to Pay Now" panel visible
3. [ ] Check checkbox for one expense
4. [ ] **Verify:** Selected amount updates in panel
5. [ ] Check checkbox for another expense
6. [ ] **Verify:** Selected amount increases
7. [ ] Click "Settle Selected" button
8. [ ] **Verify:** Success message appears
9. [ ] **Verify:** Checkboxes clear
10. [ ] **Verify:** Settled expenses update status

**Pass Criteria:** Settlement flow works smoothly without errors

---

## Test 3: Debt Transparency

**Goal:** User can identify who they owe and which expenses in <10 seconds

### Setup Test Data (if needed)
Create 3 expenses with Alice:
- Expense 1: Lunch $30 (you owe)
- Expense 2: Dinner $45 (you owe)
- Expense 3: Coffee $20 (Alice owes you)
- **Net:** You owe Alice $55

### Dashboard Test
1. [ ] Go to Dashboard
2. [ ] Find "Debt Breakdown" section
3. [ ] **Verify:** Alice appears in list
4. [ ] **Verify:** Amount shown is $55 (net position)
5. [ ] **Verify:** Transaction count shows "3 expenses"
6. [ ] **Verify:** Latest date is most recent transaction
7. [ ] Expand Alice's row
8. [ ] **Verify:** 3 expenses appear
9. [ ] **Verify:** Each shows "My Share" prominently (+$30, +$45, -$20)

**Timing Test:** Start timer. Can you identify:
- Who you owe? (Alice)
- How much? ($55)
- Which expenses? (3 expenses listed)

**Pass Criteria:** All information identified in <10 seconds

### Person Debt Breakdown Test
1. [ ] Click "View Full Breakdown" for Alice
2. [ ] **Verify:** Header shows "You owe Alice"
3. [ ] **Verify:** Net balance shows $55
4. [ ] **Verify:** Contributing expenses section shows 3 items
5. [ ] **Verify:** Each expense shows "My Share" prominently
6. [ ] **Verify:** Total expense amounts are shown but smaller/muted
7. [ ] **Verify:** Status badges accurate (Paid/Unpaid/Partial)

**Pass Criteria:** Clear debt information without confusion

---

## Test 4: Expense Detail User-Centric View

**Goal:** User immediately sees their position in any expense

### Scenario A: User Owes Money
1. [ ] Find expense where you owe money (not the payer)
2. [ ] Navigate to expense detail
3. [ ] **Verify:** "Your Position" card appears at top
4. [ ] **Verify:** "You owe" section shows correct amount
5. [ ] **Verify:** "Net for this expense" shows negative amount
6. [ ] **Verify:** Your row in participants table has border + background
7. [ ] **Verify:** "Settle Your Share" section visible below splits
8. [ ] **Verify:** Shows payer name and amount you owe
9. [ ] **Verify:** "Mark as Paid" button present
10. [ ] Click "Mark as Paid"
11. [ ] **Verify:** Split status updates to "Settled"
12. [ ] **Verify:** "Settle" section disappears
13. [ ] **Verify:** "Your Position" shows "Settled" badge

**Pass Criteria:** User position is immediately clear, settlement works

### Scenario B: User Paid (Receives Money)
1. [ ] Find expense where you are the payer
2. [ ] Navigate to expense detail
3. [ ] **Verify:** "Your Position" card shows "You are owed"
4. [ ] **Verify:** Amounts show credit (positive)
5. [ ] **Verify:** Net position is positive
6. [ ] **Verify:** No "Settle Your Share" section (you're the payer)
7. [ ] **Verify:** Your row still emphasized in table

**Pass Criteria:** Credit position is clear

### Scenario C: Already Settled
1. [ ] Find expense where your split is already settled
2. [ ] Navigate to expense detail
3. [ ] **Verify:** "Your Position" shows "Settled" badge
4. [ ] **Verify:** No "Settle" section visible
5. [ ] **Verify:** Status indicates payment complete

**Pass Criteria:** Settled state is clear

---

## Test 5: Filter Functionality

**Goal:** Filters are reliable and predictable

### Filter Counts Test
1. [ ] Go to Dashboard
2. [ ] Scroll to activity list (if filters exist there)
3. [ ] **Verify:** "All" chip shows total count (e.g., "All (15)")
4. [ ] **Verify:** "Paid" chip shows count (e.g., "Paid (8)")
5. [ ] **Verify:** "Unpaid" chip shows count (e.g., "Unpaid (5)")
6. [ ] **Verify:** "Partial" chip shows count (e.g., "Partial (2)")
7. [ ] **Verify:** Counts add up to total

**Pass Criteria:** Chip counts are accurate

### Filter Application Test
1. [ ] Click "Paid" filter chip
2. [ ] **Verify:** Only paid expenses visible in list
3. [ ] **Verify:** List count matches "Paid" chip count
4. [ ] **Verify:** Reset button appears
5. [ ] Click "Unpaid" filter chip
6. [ ] **Verify:** Only unpaid expenses visible
7. [ ] **Verify:** List count matches "Unpaid" chip count
8. [ ] Click Reset button
9. [ ] **Verify:** Filter returns to "All"
10. [ ] **Verify:** Full list visible

**Pass Criteria:** Filters work correctly, reset works

### Sort Test
1. [ ] Select "Date (Newest First)"
2. [ ] **Verify:** Most recent expense at top
3. [ ] **Verify:** Dates descend as you scroll
4. [ ] Select "Date (Oldest First)"
5. [ ] **Verify:** Oldest expense at top
6. [ ] **Verify:** Dates ascend as you scroll
7. [ ] Select "Amount (Highest First)"
8. [ ] **Verify:** Largest amount at top
9. [ ] Select "Amount (Lowest First)"
10. [ ] **Verify:** Smallest amount at top

**Pass Criteria:** All sort options work predictably

### Combined Filter + Sort Test
1. [ ] Select "Unpaid" filter
2. [ ] Select "Amount (Highest First)" sort
3. [ ] **Verify:** Only unpaid expenses shown
4. [ ] **Verify:** Sorted by amount descending
5. [ ] Click Reset
6. [ ] **Verify:** Both filter and sort reset

**Pass Criteria:** Filter + sort combinations work

---

## Test 6: Mobile Responsiveness

**Goal:** All screens work well on mobile devices

### Test Devices (use Chrome DevTools Device Mode)
- [ ] iPhone SE (320px width)
- [ ] iPhone 12 (390px width)
- [ ] iPad (768px width)
- [ ] Desktop (1024px+ width)

### Dashboard Mobile Test
1. [ ] Open Dashboard on mobile size (320px)
2. [ ] **Verify:** Layout stacks vertically (no horizontal scroll)
3. [ ] **Verify:** Top cards stack
4. [ ] **Verify:** Debt breakdown section readable
5. [ ] **Verify:** Person rows fit screen width
6. [ ] **Verify:** "View Full Breakdown" button accessible
7. [ ] **Verify:** Typography scales down appropriately
8. [ ] **Verify:** Touch targets feel easy to tap (minimum 44x44px)

**Pass Criteria:** Dashboard usable on small screens

### Person Debt Breakdown Mobile Test
1. [ ] Navigate to `/debts/:userId` on mobile
2. [ ] **Verify:** Header fits screen (no overflow)
3. [ ] **Verify:** Net balance card readable
4. [ ] **Verify:** "What to Pay Now" panel accessible
5. [ ] **Verify:** Expense list scrolls smoothly
6. [ ] **Verify:** Checkboxes easy to tap
7. [ ] **Verify:** "Settle" button accessible at bottom

**Pass Criteria:** Debt breakdown usable on mobile

### Expense Detail Mobile Test
1. [ ] Open expense detail on mobile
2. [ ] **Verify:** "Your Position" card fits screen
3. [ ] **Verify:** Participants table readable
4. [ ] **Verify:** "Settle" section accessible
5. [ ] **Verify:** All buttons tappable

**Pass Criteria:** Expense detail usable on mobile

---

## Test 7: Accessibility

**Goal:** WCAG AA compliance for inclusive design

### Keyboard Navigation Test
1. [ ] Go to Dashboard
2. [ ] Press Tab repeatedly
3. [ ] **Verify:** Can navigate to all interactive elements
4. [ ] **Verify:** Focus indicator is visible on each element
5. [ ] **Verify:** Can expand debt row with Enter/Space
6. [ ] **Verify:** Can click links with Enter
7. [ ] Navigate to expense detail
8. [ ] **Verify:** Can tab through participants table
9. [ ] **Verify:** Can activate "Mark as Paid" with Enter

**Pass Criteria:** All interactive elements keyboard accessible

### Color Contrast Test (use axe DevTools)
1. [ ] Install [axe DevTools Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
2. [ ] Go to Dashboard
3. [ ] Open DevTools > axe DevTools tab
4. [ ] Click "Scan All"
5. [ ] **Verify:** No critical color contrast issues
6. [ ] **Verify:** Text passes AA standard (4.5:1 for normal text)
7. [ ] **Verify:** Amounts pass AA standard (3:1 for large text)
8. [ ] Repeat for Person Debt Breakdown page
9. [ ] Repeat for Expense Detail page

**Pass Criteria:** No critical accessibility issues, contrast ratios pass

### Screen Reader Test (optional but recommended)
1. [ ] Enable VoiceOver (Mac) or NVDA (Windows)
2. [ ] Navigate through Dashboard
3. [ ] **Verify:** Debt amounts announced clearly
4. [ ] **Verify:** "Your Position" card content announced
5. [ ] **Verify:** Button purposes clear
6. [ ] **Verify:** Status badges announced

**Pass Criteria:** Screen reader experience understandable

---

## Test 8: Performance

**Goal:** Fast load times and smooth interactions

### Dashboard Performance Test
1. [ ] Open Chrome DevTools > Performance tab
2. [ ] Click Record button
3. [ ] Reload Dashboard page
4. [ ] Stop recording when page fully loaded
5. [ ] **Measure:** Total load time
6. [ ] **Target:** <1 second
7. [ ] **Verify:** No layout shifts (elements jumping)
8. [ ] **Verify:** No jank (stuttering)

**Pass Criteria:** Dashboard loads quickly and smoothly

### Person Debt Breakdown Performance Test
1. [ ] Ensure test account has 50+ expenses with person
2. [ ] Start recording in Performance tab
3. [ ] Navigate to `/debts/:userId`
4. [ ] Stop recording when page loaded
5. [ ] **Measure:** Load time
6. [ ] **Target:** <500ms
7. [ ] **Verify:** List renders smoothly
8. [ ] **Verify:** Scrolling is smooth (60fps)

**Pass Criteria:** Fast loading even with many expenses

### Filter Performance Test
1. [ ] Go to Dashboard activity list
2. [ ] Open Performance tab
3. [ ] Start recording
4. [ ] Click "Paid" filter
5. [ ] Stop recording immediately
6. [ ] **Measure:** Filter application time
7. [ ] **Target:** <100ms
8. [ ] **Verify:** No noticeable lag

**Pass Criteria:** Filters apply instantly

### Expand/Collapse Performance Test
1. [ ] On Dashboard debt breakdown
2. [ ] Click to expand person row
3. [ ] **Verify:** Animation smooth (no jank)
4. [ ] **Verify:** Expansion feels fast (<300ms)
5. [ ] Click to collapse
6. [ ] **Verify:** Collapse animation smooth

**Pass Criteria:** Animations are smooth and performant

---

## Test 9: Cross-Browser Compatibility

**Goal:** Consistent experience across browsers

### Chrome Test
- [ ] All features work in Chrome (latest)
- [ ] Typography renders correctly
- [ ] Colors match design
- [ ] Animations smooth
- [ ] No console errors

### Firefox Test
- [ ] All features work in Firefox (latest)
- [ ] Typography renders correctly
- [ ] Colors match Chrome
- [ ] Animations smooth
- [ ] No console errors

### Safari Test (Mac)
- [ ] All features work in Safari (latest)
- [ ] Typography renders correctly
- [ ] Colors match Chrome
- [ ] Animations smooth
- [ ] No console errors

### Mobile Safari Test (iOS)
- [ ] All features work on iPhone
- [ ] Touch interactions responsive
- [ ] Typography readable on small screen
- [ ] No horizontal scrolling
- [ ] Animations smooth

### Chrome Mobile Test (Android - if available)
- [ ] All features work on Android
- [ ] Touch interactions responsive
- [ ] Typography readable
- [ ] Smooth scrolling

**Pass Criteria:** Consistent experience across all browsers

---

## Test 10: Regression Testing

**Goal:** Existing functionality still works

### Critical Existing Features
- [ ] Can create new expense
- [ ] Can edit expense
- [ ] Can delete expense
- [ ] Can record payment
- [ ] Can add friend
- [ ] Can create group
- [ ] Can add group members
- [ ] Can edit profile
- [ ] Can logout and login
- [ ] Notifications appear

**Pass Criteria:** No existing functionality broken

---

## Final Validation

### Acceptance Criteria Checklist
Based on original Lucy feedback:

- [ ] ✓ User can identify who they owe in <10 seconds
- [ ] ✓ User can see which expenses contribute to debt
- [ ] ✓ Clicking debt summary goes to breakdown (NOT profile)
- [ ] ✓ In breakdown, see "my share" per expense prominently
- [ ] ✓ Filters work reliably or are disabled
- [ ] ✓ Typography readable, amounts easy to scan
- [ ] ✓ No confusing navigation surprises

### Bug Tracking
If you find any bugs during testing, document them:

**Bug Template:**
```markdown
### Bug: [Short Description]
**Severity:** Critical / High / Medium / Low
**Location:** [Screen/Component]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Observe bug]

**Expected:** [What should happen]
**Actual:** [What actually happens]
**Screenshots:** [Attach if helpful]
```

---

## Sign-off

After completing all tests:

- [ ] All critical tests passed
- [ ] Zero critical bugs found (or all critical bugs fixed)
- [ ] Performance targets met
- [ ] Accessibility standards met
- [ ] Cross-browser compatible
- [ ] Regression tests passed

**Tester Name:** ___________________
**Date:** ___________________
**Overall Status:** PASS / FAIL / PARTIAL PASS

**Ready for Production:** YES / NO / WITH FIXES

---

## Next Steps After Testing

### If PASS:
1. Create deployment plan
2. Deploy to staging environment
3. Final user acceptance testing (Lucy)
4. Deploy to production
5. Monitor analytics and error logs
6. Gather user feedback

### If FAIL:
1. Document all bugs found
2. Prioritize fixes (Critical → High → Medium → Low)
3. Fix critical and high-priority bugs
4. Retest fixed areas
5. Repeat testing cycle

---

**Testing Checklist Complete!**
Good luck with manual testing! 🎉
