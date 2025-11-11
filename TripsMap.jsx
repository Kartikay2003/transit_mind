import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* Utility: Generate a clean, minimal SVG bus marker dynamically */
const createBusMarker = (color = "#f5a623") => {
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='36' height='36'>
      <rect x='3' y='5' width='18' height='11' rx='2' ry='2' fill='${color}' stroke='#0b132b' stroke-width='1.3'/>
      <circle cx='7.5' cy='17.5' r='1.4' fill='white'/>
      <circle cx='16.5' cy='17.5' r='1.4' fill='white'/>
    </svg>
  `);
  return new L.Icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -30],
    className: "drop-shadow-lg",
  });
};

/* Smooth recenter animation for selected trip */
function Recenter({ lat, lng }) {
  const map = useMap();
  if (lat && lng) map.setView([lat, lng], 13, { animate: true });
  return null;
}

export default function TripsMap({ trips, selectedTripRow }) {
  // Determine where the map should focus
  const center = useMemo(() => {
    if (selectedTripRow)
      return [selectedTripRow.latitude, selectedTripRow.longitude];
    if (trips.length === 0) return [42.3601, -71.0589]; // fallback to Boston
    const avgLat =
      trips.reduce((s, t) => s + (t.latitude || 0), 0) / trips.length;
    const avgLng =
      trips.reduce((s, t) => s + (t.longitude || 0), 0) / trips.length;
    return [avgLat, avgLng];
  }, [trips, selectedTripRow]);

  const tripsToShow = selectedTripRow ? [selectedTripRow] : trips;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/5">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="rounded-2xl"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {selectedTripRow && (
          <Recenter
            lat={selectedTripRow.latitude}
            lng={selectedTripRow.longitude}
          />
        )}

        {tripsToShow.map((t) => {
          const color =
            t.total_delay_minutes > 0
              ? "#ef4444"
              : t.total_delay_minutes === 0
              ? "#f5a623"
              : "#10b981";
          const busIcon = createBusMarker(color);

          return (
            <Marker
              key={`${t.trip_id}-${t.stop_id}`}
              position={[t.latitude, t.longitude]}
              icon={busIcon}
            >
              <Popup autoClose={false} closeOnClick={false} closeButton={true}>
                <div className="text-sm text-slate-800 font-medium">
                  <div className="font-semibold text-[#0b132b]">
                    Trip: {t.trip_id}
                  </div>
                  <div className="text-xs mt-1 text-slate-600">
                    Vehicle {t.vehicle_id} • Stop {t.stop_id}
                  </div>
                  <div className="text-xs mt-1">
                    Status:{" "}
                    <span
                      className={`${
                        t.total_delay_minutes > 0
                          ? "text-red-600"
                          : t.total_delay_minutes === 0
                          ? "text-amber-500"
                          : "text-emerald-600"
                      } font-semibold`}
                    >
                      {t.total_delay_minutes < 0
                        ? "On-time"
                        : t.total_delay_minutes > 0
                        ? "Delayed"
                        : "No delay data"}
                    </span>
                  </div>
                  <div className="text-xs mt-1">
                    Delay: {t.total_delay_minutes?.toFixed(1)} min
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Optional subtle overlay border for consistency */}
      <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
    </div>
  );
}
