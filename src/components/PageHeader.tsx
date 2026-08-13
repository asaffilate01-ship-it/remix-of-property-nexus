import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, tabs, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground max-w-prose">{description}</p>
          )}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="mt-4 -mx-1 overflow-x-auto no-scrollbar">{tabs}</div>}
    </header>
  );
}

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={cn("flex items-center justify-center px-6 py-16 sm:py-24", className)}>
      <div className="max-w-md w-full text-center">
        {icon && (
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-secondary text-foreground/40 ring-1 ring-border/60">
            {icon}
          </div>
        )}
        <h3 className="font-display text-xl font-bold text-foreground mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>
        )}
        {actions && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">{actions}</div>
        )}
      </div>
    </div>
  );
}
