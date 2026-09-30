import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn, clamp } from "@/lib/utils";

/**
 * Direction-agnostic progress bar: the indicator is width-based and lives at the
 * inline-start of a flex row, so it fills left→right in LTR and right→left in RTL
 * automatically.
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative flex h-2.5 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full rounded-full bg-primary transition-all duration-500 ease-out", indicatorClassName)}
      style={{ width: `${clamp(value ?? 0)}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
