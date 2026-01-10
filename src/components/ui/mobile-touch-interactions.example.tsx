/**
 * Mobile Touch Interactions - Usage Examples
 * 
 * This file demonstrates how to use the mobile touch interaction components
 * and hooks in the FairPay application.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  SwipeableDialog, 
  SwipeableDialogContent, 
  SwipeableDialogHeader,
  SwipeableDialogTitle,
  SwipeableDialogDescription,
  SwipeableDialogFooter,
} from '@/components/ui/swipeable-dialog';
import {
  SwipeableSheet,
  SwipeableSheetContent,
  SwipeableSheetHeader,
  SwipeableSheetTitle,
  SwipeableSheetDescription,
} from '@/components/ui/swipeable-sheet';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { TouchTarget } from '@/components/ui/touch-target';
import { useSwipeGesture, useHasTouch } from '@/hooks/use-touch-interactions';

/**
 * Example 1: Swipeable Dialog
 * Users can swipe down to dismiss the dialog on mobile
 */
export function SwipeableDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open Swipeable Dialog
      </Button>

      <SwipeableDialog open={open} onOpenChange={setOpen}>
        <SwipeableDialogContent 
          enableSwipeToDismiss={true}
          onOpenChange={setOpen}
        >
          <SwipeableDialogHeader>
            <SwipeableDialogTitle>Swipe to Dismiss</SwipeableDialogTitle>
            <SwipeableDialogDescription>
              On mobile, you can swipe down to dismiss this dialog.
            </SwipeableDialogDescription>
          </SwipeableDialogHeader>

          <div className="py-4">
            <p>Dialog content goes here...</p>
          </div>

          <SwipeableDialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </SwipeableDialogFooter>
        </SwipeableDialogContent>
      </SwipeableDialog>
    </>
  );
}

/**
 * Example 2: Swipeable Sheet (Bottom Sheet)
 * Common pattern for mobile action sheets
 */
export function SwipeableSheetExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open Bottom Sheet
      </Button>

      <SwipeableSheet open={open} onOpenChange={setOpen}>
        <SwipeableSheetContent 
          side="bottom"
          enableSwipeToDismiss={true}
          onOpenChange={setOpen}
        >
          <SwipeableSheetHeader>
            <SwipeableSheetTitle>Actions</SwipeableSheetTitle>
            <SwipeableSheetDescription>
              Choose an action below
            </SwipeableSheetDescription>
          </SwipeableSheetHeader>

          <div className="px-6 pb-6 space-y-2">
            <Button className="w-full" variant="outline">
              Action 1
            </Button>
            <Button className="w-full" variant="outline">
              Action 2
            </Button>
            <Button className="w-full" variant="destructive">
              Delete
            </Button>
          </div>
        </SwipeableSheetContent>
      </SwipeableSheet>
    </>
  );
}

/**
 * Example 3: Pull-to-Refresh
 * Refresh data by pulling down on mobile
 */
export function PullToRefreshExample() {
  const [data, setData] = useState(['Item 1', 'Item 2', 'Item 3']);

  const handleRefresh = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setData([...data, `Item ${data.length + 1}`]);
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      className="h-[400px] border rounded-lg"
    >
      <div className="p-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="p-4 bg-muted rounded-lg">
            {item}
          </div>
        ))}
      </div>
    </PullToRefresh>
  );
}

/**
 * Example 4: Custom Swipe Gestures
 * Detect swipe directions for custom interactions
 */
export function CustomSwipeExample() {
  const [lastSwipe, setLastSwipe] = useState<string>('');

  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => setLastSwipe('Left'),
    onSwipeRight: () => setLastSwipe('Right'),
    onSwipeUp: () => setLastSwipe('Up'),
    onSwipeDown: () => setLastSwipe('Down'),
  });

  return (
    <div
      ref={swipeRef as React.RefObject<HTMLDivElement>}
      className="h-[300px] border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30"
    >
      <div className="text-center">
        <p className="text-lg font-semibold mb-2">Swipe in any direction</p>
        {lastSwipe && (
          <p className="text-muted-foreground">
            Last swipe: <span className="font-bold">{lastSwipe}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Example 5: Touch Target Wrapper
 * Ensures buttons meet minimum touch target size
 */
export function TouchTargetExample() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Without TouchTarget (may be too small on mobile):
        </p>
        <button className="px-2 py-1 bg-primary text-primary-foreground rounded">
          Small Button
        </button>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">
          With TouchTarget (44x44px minimum):
        </p>
        <TouchTarget>
          <button className="px-2 py-1 bg-primary text-primary-foreground rounded">
            Touch-Friendly Button
          </button>
        </TouchTarget>
      </div>
    </div>
  );
}

/**
 * Example 6: Conditional Touch Features
 * Only enable touch features on touch-capable devices
 */
export function ConditionalTouchExample() {
  const hasTouch = useHasTouch();

  return (
    <div className="p-4 border rounded-lg">
      <p className="font-semibold mb-2">Device Capabilities:</p>
      <p className="text-muted-foreground">
        Touch support: {hasTouch ? '✅ Yes' : '❌ No'}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {hasTouch 
          ? 'Touch interactions are enabled for this device'
          : 'Using mouse/keyboard interactions'}
      </p>
    </div>
  );
}

/**
 * Complete Example: Activity List with Pull-to-Refresh
 * Demonstrates real-world usage in the FairPay app
 */
export function ActivityListWithRefreshExample() {
  const [activities, setActivities] = useState([
    { id: 1, title: 'Lunch with friends', amount: 50000 },
    { id: 2, title: 'Coffee', amount: 25000 },
    { id: 3, title: 'Groceries', amount: 150000 },
  ]);

  const handleRefresh = async () => {
    // Simulate fetching new data
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newActivity = {
      id: activities.length + 1,
      title: `New Activity ${activities.length + 1}`,
      amount: Math.floor(Math.random() * 100000),
    };
    setActivities([newActivity, ...activities]);
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      className="h-[500px] border rounded-lg"
    >
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {activities.map((activity) => (
          <div 
            key={activity.id}
            className="p-4 bg-card border rounded-lg flex justify-between items-center"
          >
            <span className="font-medium">{activity.title}</span>
            <span className="text-muted-foreground">
              ₫{activity.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </PullToRefresh>
  );
}
