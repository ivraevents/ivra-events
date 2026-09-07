import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon, e.g. for a cleaner sign-in / registration form. */
  icon?: LucideIcon;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, icon: Icon, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-foreground placeholder:text-charcoal-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500 focus-visible:border-royal-500",
          "disabled:opacity-50",
          Icon && "pl-10",
          className
        )}
        {...props}
      />
    );
    if (!Icon) return input;
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" />
        {input}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-charcoal-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500 focus-visible:border-royal-500",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-charcoal-700", className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-error-600 mt-1">{children}</p>;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-error-600">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
