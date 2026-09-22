import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-turquoise text-white active:bg-turquoise-600",
  secondary: "bg-turquoise-100 text-turquoise-700 active:bg-turquoise-200",
  quiet: "bg-surface text-ink border border-hairline active:bg-canvas",
  danger: "bg-danger/10 text-danger active:bg-danger/20",
};

type Props = React.ComponentProps<"button"> & {
  variant?: Variant;
  full?: boolean;
};

export function Button({
  variant = "primary",
  full = false,
  className,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={cn(
        // 44px je minimální doporučený cíl dotyku na iOS.
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-card px-5",
        "text-[17px] font-semibold transition-colors duration-150",
        "disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise-600",
        VARIANTS[variant],
        full && "w-full",
        className,
      )}
    />
  );
}
