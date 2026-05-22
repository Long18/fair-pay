import { render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function expectNoConsoleErrors(renderUi: () => void) {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  renderUi();

  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
}

describe("UI primitive stability", () => {
  it("composes Button asChild inside Radix asChild triggers without extra children", () => {
    expectNoConsoleErrors(() => {
      render(
        <MemoryRouter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button asChild variant="ghost">
                <Link to="/admin">Admin</Link>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Open</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("renders controlled and uncontrolled overlay primitives without state loops", () => {
    expectNoConsoleErrors(() => {
      render(
        <>
          <Dialog open>
            <DialogContent>
              <DialogTitle>Controlled dialog</DialogTitle>
              <DialogDescription>Dialog body</DialogDescription>
            </DialogContent>
          </Dialog>
          <Dialog defaultOpen>
            <DialogContent>
              <DialogTitle>Uncontrolled dialog</DialogTitle>
              <DialogDescription>Dialog body</DialogDescription>
            </DialogContent>
          </Dialog>
          <Sheet open>
            <SheetContent>
              <SheetTitle>Controlled sheet</SheetTitle>
              <SheetDescription>Sheet body</SheetDescription>
            </SheetContent>
          </Sheet>
          <Sheet defaultOpen>
            <SheetContent>
              <SheetTitle>Uncontrolled sheet</SheetTitle>
              <SheetDescription>Sheet body</SheetDescription>
            </SheetContent>
          </Sheet>
          <Drawer open>
            <DrawerContent>
              <DrawerTitle>Controlled drawer</DrawerTitle>
              <DrawerDescription>Drawer body</DrawerDescription>
            </DrawerContent>
          </Drawer>
          <Popover open>
            <PopoverTrigger>Open popover</PopoverTrigger>
            <PopoverContent>Popover body</PopoverContent>
          </Popover>
        </>
      );
    });

    expect(screen.getByText("Controlled dialog")).toBeInTheDocument();
    expect(screen.getByText("Uncontrolled sheet")).toBeInTheDocument();
    expect(screen.getByText("Controlled drawer")).toBeInTheDocument();
    expect(screen.getByText("Popover body")).toBeInTheDocument();
  });

  it("renders navigation primitives without animation state mirrors", () => {
    expectNoConsoleErrors(() => {
      render(
        <>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Overview content</TabsContent>
            <TabsContent value="details">Details content</TabsContent>
          </Tabs>
          <Accordion type="single" defaultValue="metrics">
            <AccordionItem value="metrics">
              <AccordionTrigger>Metrics</AccordionTrigger>
              <AccordionContent>Metrics content</AccordionContent>
            </AccordionItem>
          </Accordion>
          <Tooltip open>
            <TooltipTrigger asChild>
              <button type="button">Hover target</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip body</TooltipContent>
          </Tooltip>
        </>
      );
    });

    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByText("Metrics content")).toBeInTheDocument();
    expect(screen.getAllByText("Tooltip body").length).toBeGreaterThan(0);
  });
});
