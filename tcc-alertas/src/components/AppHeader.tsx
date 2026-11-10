import Link from 'next/link';
import type { ReactNode } from 'react';
import { TccMark } from './TccMark';

export function AppHeader({
  eyebrow,
  title,
  backHref,
  right,
}: {
  eyebrow: string;
  title: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="border-b-4 border-tcc-yellow bg-tcc-ink text-white">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Volver"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-tcc-ink-soft"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
          ) : (
            <TccMark />
          )}
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
              {eyebrow}
            </div>
            <h1 className="mt-0.5 text-[17px] font-bold leading-tight">{title}</h1>
          </div>
        </div>
        {right}
      </div>
    </header>
  );
}
