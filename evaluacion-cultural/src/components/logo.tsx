export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="5" fill="#0a3b80" />
      <circle cx="22" cy="10" r="4.5" fill="#0957c3" />
      <circle cx="10" cy="20" r="4.5" fill="#e31013" />
      <circle cx="21" cy="21" r="6" fill="#0c2f64" />
      <circle cx="15.5" cy="15" r="3.2" fill="#1d6ad1" />
    </svg>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-tight text-ink-900">Cultura</span>
        <span className="block text-[11px] text-ink-500">Gestión de Personas</span>
      </span>
    </span>
  );
}
