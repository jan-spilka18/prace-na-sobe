/**
 * Zkratka nad zápisem dolů ke zpětné vazbě. V náhledu v adminu je to jen
 * obrázek tlačítka — Honza by jinak odskočil na vlastní stránce.
 */
export function FeedbackJump({ preview = false }: { preview?: boolean }) {
  const className =
    "inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-night px-4 text-[14px] font-semibold text-white transition-opacity active:opacity-70";
  const content = (
    <>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
      Co si odnášíš? Napiš Honzovi
    </>
  );

  return preview ? (
    <span className={className}>{content}</span>
  ) : (
    <a href="#zpetna-vazba" className={className}>
      {content}
    </a>
  );
}
