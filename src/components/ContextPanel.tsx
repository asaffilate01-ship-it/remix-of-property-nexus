import { type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  widthClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Reusable contextual side-panel for record detail views.
 * Use on list pages so users can inspect/edit a row without losing context.
 */
export function ContextPanel({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  widthClassName = "w-full sm:max-w-xl",
  footer,
  children,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={`${widthClassName} flex flex-col p-0 gap-0`}>
        <SheetHeader className="px-6 py-4 border-b border-border/60 bg-card/60 backdrop-blur-md shrink-0">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-border/60 bg-card/60 backdrop-blur-md px-6 py-3 shrink-0">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
