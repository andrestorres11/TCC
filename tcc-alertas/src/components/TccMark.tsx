// Sello de marca TCC (amarillo con "TCC" rojo y contorno negro), como el logo.
export function TccMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border-2 border-tcc-ink bg-tcc-yellow px-2.5 py-1 text-sm font-extrabold tracking-tight text-tcc-red shadow-[0_0_0_1.5px_#ffd100] ${className}`}
      aria-label="TCC"
    >
      TCC
    </span>
  );
}
