'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { StopStatus } from '@/lib/types';

export interface PinParada {
  id: string;
  lat: number;
  lng: number;
  status: StopStatus;
  plate?: string;
}

const COLOR: Record<StopStatus, string> = {
  pending: '#d81e05',
  incident: '#d9480f',
  confirmed: '#15803d',
};

const ETIQUETA: Record<StopStatus, string> = {
  pending: 'Pendiente',
  incident: 'Novedad',
  confirmed: 'Entregada',
};

export default function MapaParadasInner({ stops }: { stops: PinParada[] }) {
  const center: [number, number] =
    stops.length > 0
      ? [
          stops.reduce((a, s) => a + s.lat, 0) / stops.length,
          stops.reduce((a, s) => a + s.lng, 0) / stops.length,
        ]
      : [4.65, -74.09]; // Bogotá por defecto

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stops.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: COLOR[s.status],
            fillOpacity: 1,
          }}
        >
          <Tooltip>
            {s.plate ? `${s.plate} · ` : ''}
            {ETIQUETA[s.status]}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
