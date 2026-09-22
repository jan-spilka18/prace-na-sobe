import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-card border border-hairline bg-surface px-4 py-3 text-[17px] text-ink " +
  "placeholder:text-ink-400 focus:border-turquoise focus:outline-none " +
  "focus:ring-2 focus:ring-turquoise-200";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block px-1 text-[13px] font-semibold text-ink-600">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="block px-1 text-[13px] text-ink-500">{hint}</span>
      )}
      {error && (
        <span className="block px-1 text-[13px] text-danger">{error}</span>
      )}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function TextArea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea {...props} className={cn(CONTROL, "min-h-24 resize-y", className)} />
  );
}

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return <select {...props} className={cn(CONTROL, "appearance-none", className)} />;
}

/** Přepínač ve stylu iOS. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise-600",
        checked ? "bg-turquoise" : "bg-hairline",
        disabled && "opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm",
          "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-card bg-danger/10 px-4 py-3 text-[15px] text-danger"
    >
      {children}
    </p>
  );
}
