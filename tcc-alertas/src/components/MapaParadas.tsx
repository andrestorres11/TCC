'use client';

import dynamic from 'next/dynamic';
import type { PinParada } from './MapaParadasInner';

// Carga diferida sin SSR: Leaflet necesita el DOM del navegador.
const MapaParadasInner = dynamic(() => import('./MapaParadasInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-tcc-border/40 text-sm text-tcc-muted">
      Cargando mapa…
    </div>
  ),
});

export function MapaParadas({ stops }: { stops: PinParada[] }) {
  return <MapaParadasInner stops={stops} />;
}
