import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Seskupený seznam ve stylu iOS Nastavení: bílá karta, řádky oddělené
 * vlasovou linkou, která nezačíná úplně u okraje.
 */
export function ListGroup({
  title,
  footer,
  className,
  children,
}: {
  title?: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-group bg-surface">
        <div className="divide-y divide-hairline">{children}</div>
      </div>
      {footer && (
        <p className="px-4 text-[13px] leading-snug text-ink-500">{footer}</p>
      )}
    </section>
  );
}

type RowProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  href,
  onClick,
  className,
}: RowProps) {
  const body = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] text-ink">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-[14px] leading-snug text-ink-600">
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <div className="shrink-0 text-ink-500">{trailing}</div>}
      {(href || onClick) && <Chevron />}
    </>
  );

  const shared = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left min-h-[48px]",
    (href || onClick) && "active:bg-canvas transition-colors",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shared}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shared}>
        {body}
      </button>
    );
  }

  return <div className={shared}>{body}</div>;
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 8 14"
      aria-hidden
      className="h-3.5 w-2 shrink-0 text-ink-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 1l6 6-6 6" />
    </svg>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-group bg-surface p-4", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-group bg-surface px-6 py-12 text-center">
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-600">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
