import { cn } from "@/lib/cn";

const colorClasses = {
  zinc: "bg-zinc-100 text-zinc-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  teal: "bg-teal-100 text-teal-800",
} as const;

export function Badge({
  color = "zinc",
  children,
}: {
  color?: keyof typeof colorClasses;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClasses[color]
      )}
    >
      {children}
    </span>
  );
}
