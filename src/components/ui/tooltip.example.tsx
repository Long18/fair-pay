/**
 * Enhanced Tooltip Component Examples
 * 
 * This file demonstrates the usage of the enhanced tooltip component
 * with desktop hover (300ms delay) and mobile tap behavior (5s auto-dismiss).
 */

import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { Button } from './button';
import { InfoIcon } from 'lucide-react';

export function TooltipExamples() {
  return (
    <div className="space-y-8 p-8">
      <h2 className="text-2xl font-bold">Enhanced Tooltip Examples</h2>

      {/* Basic Tooltip */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Basic Tooltip</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me (Desktop) / Tap me (Mobile)</Button>
          </TooltipTrigger>
          <TooltipContent>
            This is a helpful tooltip message
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Tooltip with Different Positions */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Positioning</h3>
        <div className="flex gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Top</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Tooltip on top
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Right</Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Tooltip on right
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Bottom</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Tooltip on bottom
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Left</Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Tooltip on left
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tooltip with Custom Max Width */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Custom Max Width</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Long Content</Button>
          </TooltipTrigger>
          <TooltipContent maxWidth="300px">
            This is a longer tooltip message that demonstrates the custom max width feature.
            The text will wrap nicely within the specified width constraint.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Tooltip with Icon Trigger */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Icon with Tooltip</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
              aria-label="More information"
            >
              <InfoIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent aria-label="Help information">
            Click for more details about this feature
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Instant Tooltip (No Delay) */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Instant Tooltip (No Delay)</h3>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button variant="outline">Instant</Button>
          </TooltipTrigger>
          <TooltipContent>
            Shows immediately with no delay
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Behavior Notes */}
      <div className="mt-8 rounded-lg border p-4 bg-muted/50">
        <h3 className="text-lg font-semibold mb-2">Behavior Notes</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li><strong>Desktop:</strong> Tooltips show on hover with 300ms delay</li>
          <li><strong>Mobile:</strong> Tooltips show on tap and auto-dismiss after 5 seconds</li>
          <li><strong>Mobile:</strong> Tap outside to dismiss immediately</li>
          <li><strong>Viewport:</strong> Tooltips automatically adjust position to stay visible</li>
          <li><strong>Accessibility:</strong> Full keyboard navigation and screen reader support</li>
        </ul>
      </div>
    </div>
  );
}
