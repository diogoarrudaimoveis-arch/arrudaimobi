import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text" | "card";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  if (variant === "card") {
    return <div className={cn("animate-shimmer rounded-xl border border-border bg-card overflow-hidden", className)} {...props} />;
  }
  if (variant === "circle") {
    return <div className={cn("animate-shimmer rounded-full bg-muted", className)} {...props} />;
  }
  if (variant === "text") {
    return <div className={cn("animate-shimmer h-4 bg-muted rounded", className)} {...props} />;
  }
  return <div className={cn("animate-shimmer rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };