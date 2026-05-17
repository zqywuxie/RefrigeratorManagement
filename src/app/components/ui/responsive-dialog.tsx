"use client";

import * as React from "react";
import { useIsMobile } from "./use-mobile";
import { cn } from "./utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";

type ResponsiveDialogProps = React.ComponentProps<typeof Dialog> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Drawer {...props}>{children}</Drawer>;
  }
  return <Dialog {...props}>{children}</Dialog>;
}

type ResponsiveDialogContentProps = React.ComponentProps<typeof DialogContent> & {
  children: React.ReactNode;
};

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: ResponsiveDialogContentProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerContent
        className={cn("max-h-[88dvh] min-h-0 overflow-hidden flex flex-col", className)}
        {...(props as any)}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DrawerContent>
    );
  }
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const Component = isMobile ? DrawerHeader : DialogHeader;
  return <Component className={className} {...props} />;
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const Component = isMobile ? DrawerFooter : DialogFooter;
  return <Component className={className} {...props} />;
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();
  const Component = isMobile
    ? (DrawerTitle as any)
    : DialogTitle;
  return <Component className={className} {...props} />;
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile();
  const Component = isMobile
    ? (DrawerDescription as any)
    : DialogDescription;
  return <Component className={className} {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
