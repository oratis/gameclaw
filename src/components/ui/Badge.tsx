import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "default";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-emerald-500/10 text-emerald-400": variant === "success",
          "bg-yellow-500/10 text-yellow-400": variant === "warning",
          "bg-red-500/10 text-red-400": variant === "error",
          "bg-blue-500/10 text-blue-400": variant === "info",
          "bg-white/10 text-gray-300": variant === "default",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
