import React from "react";
import { motion } from "framer-motion";
import {
  WiRain, WiDaySunny, WiCloudy, WiSnow, WiFog, WiThunderstorm
} from "react-icons/wi";
import { FaTint, FaEye, FaClock } from "react-icons/fa";

/* Weather icon selector */
const weatherCodeIcon = (code) => {
  if ([61, 63, 65, 80, 81, 82].includes(code)) return <WiRain className="text-3xl text-[#f5a623]" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <WiSnow className="text-3xl text-blue-300" />;
  if ([95, 96, 99].includes(code)) return <WiThunderstorm className="text-3xl text-yellow-400" />;
  if ([45, 48].includes(code)) return <WiFog className="text-3xl text-slate-400" />;
  if ([2, 3].includes(code)) return <WiCloudy className="text-3xl text-slate-300" />;
  return <WiDaySunny className="text-3xl text-yellow-300" />;
};

/* Generic row formatter */
const DetailRow = ({ icon, label, value, valueClass = "" }) => (
  <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    <span className={`${valueClass} font-medium`}>{value}</span>
  </div>
);

export default function TripDetails({ row, setSelectedTripRow }) {
  if (!row) return null;
  const delayPositive = row.total_delay_minutes > 0;
  const delayClass = delayPositive
    ? "text-red-300 font-semibold"
    : "text-emerald-300 font-semibold";

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 10, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-5"
    >
      {/* Summary Card */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-white">{row.trip_id}</div>
            <div className="text-xs text-slate-400 mt-1">
              Vehicle {row.vehicle_id} • Stop {row.stop_id}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Total Delay</div>
            <div className={delayClass}>{row.total_delay_minutes?.toFixed(1)} min</div>
          </div>
        </div>
      </div>

      {/* Weather + Metrics */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {weatherCodeIcon(row.weather_code)}
            <span className="text-slate-100 text-sm font-medium">
              {row.temperature?.toFixed(1)} °C
            </span>
          </div>
          <span className="text-sm text-slate-400">Humidity {row.humidity}%</span>
        </div>

        <DetailRow icon={<FaTint />} label="Precipitation" value={`${row.precipitation} mm`} />
        <DetailRow icon={<FaEye />} label="Visibility" value={`${row.visibility} m`} />
        <DetailRow icon={<FaClock />} label="Recorded" value={row.recorded_at || "—"} />

        <button
          onClick={() => setSelectedTripRow(null)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-400/40 text-red-400 font-semibold bg-transparent hover:bg-red-500/10 transition"
        >
          Clear Selection
        </button>
      </div>
    </motion.div>
  );
}
