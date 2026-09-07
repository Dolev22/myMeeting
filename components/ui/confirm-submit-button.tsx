"use client";

import { cn } from "@/lib/cn";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700",
        className
      )}
      onClick={(event) => {
        if (window.confirm(confirmMessage)) {
          event.currentTarget.form?.requestSubmit();
        }
      }}
    >
      {children}
    </button>
  );
}
