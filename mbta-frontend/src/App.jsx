import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import CitySelector from "./components/CitySelector";
import TripsMap from "./components/TripsMap";
import TripDetails from "./components/TripDetails";
import NotebookButtons from "./components/NotebookButtons";

axios.defaults.baseURL = "http://127.0.0.1:5000";

export default function App() {
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [trips, setTrips] = useState([]);
  const [selectedTripRow, setSelectedTripRow] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const fetchCities = async () => {
    try {
      const res = await axios.get("/api/cities");
      setCities(res.data?.cities || []);
    } catch (err) {
      console.error("fetchCities error:", err);
      setCities([]);
    }
  };

  const fetchTripDetails = async (trip_id, vehicle_id, stop_id) => {
    try {
      const res = await axios.get(`/api/${selectedCity.toLowerCase()}/trips/details`, {
        params: { trip_id, vehicle_id, stop_id },
      });
      setSelectedTripRow(res?.data);
    } catch (err) {
      console.error("fetchTripDetails error:", err);
    }
  };

  const fetchTrips = async () => {
    if (!selectedCity) return;
    try {
      const res = await axios.get(`/api/${selectedCity.toLowerCase()}/trips`);
      setTrips(res?.data || []);
      setSelectedTripRow(null);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error("fetchTrips error:", err);
      setTrips([]);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [selectedCity]);

  // Derived stats (frontend-only)
  const summary = useMemo(() => {
    if (!trips.length) return { avgDelay: 0, total: 0, onTime: 0 };
    const total = trips.length;
    const delays = trips.map((t) => t.total_delay_minutes || 0);
    const avgDelay = delays.reduce((a, b) => a + b, 0) / total;
    const onTime = trips.filter((t) => t.total_delay_minutes <= 0).length;
    return { avgDelay, total, onTime };
  }, [trips]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b132b] text-slate-100 font-inter relative overflow-hidden">
      {/* HEADER */}
      <motion.header
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full fixed top-0 z-40"
      >
        <div className="mx-auto max-w-[1600px] px-4">
          <div
            className="h-16 rounded-b-2xl shadow-md flex items-center px-5 justify-between"
            style={{ background: "linear-gradient(90deg,#0f62fe,#6b21a8)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="11" rx="2" fill="white" opacity="0.9" />
                  <circle cx="7.5" cy="18.5" r="1.5" fill="white" opacity="0.95" />
                  <circle cx="16.5" cy="18.5" r="1.5" fill="white" opacity="0.95" />
                </svg>
              </div>
              <h1 className="text-white text-lg font-semibold tracking-wide">
                MBTA Delay Map
              </h1>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/80">
              <span className="hidden md:block">Data · Real-time · Logistics</span>
              <button
                className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/15 transition"
                onClick={() => document.documentElement.classList.toggle("light-mode")}
              >
                Theme
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* STATUS BAR */}
      <div className="pt-16">
        <div className="w-full bg-[#111b3c]/60 text-slate-300 text-xs py-1.5 border-b border-white/10">
          <div className="mx-auto max-w-[1600px] px-4 flex items-center justify-between">
            <span>
              Last updated:{" "}
              {new Date(lastUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-emerald-400">Connected</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="flex-1 w-full mx-auto max-w-[1600px] px-4 py-6">
        <div className="grid grid-cols-12 gap-4 min-h-[72vh]">
          {/* LEFT PANEL */}
          <motion.aside
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="col-span-12 lg:col-span-3"
          >
            <div className="h-full rounded-2xl p-4 bg-white/10 border border-white/10 shadow-lg max-h-[72vh] overflow-hidden flex flex-col">
              <CitySelector
                cities={cities}
                selectedCity={selectedCity}
                onSelectCity={setSelectedCity}
              />

              <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-2">
                {trips.length === 0 ? (
                  <div className="text-sm text-slate-300 italic">No trips loaded</div>
                ) : (
                  trips.map((t, i) => {
                    const isSelected =
                      selectedTripRow &&
                      selectedTripRow.trip_id === t.trip_id &&
                      selectedTripRow.vehicle_id === t.vehicle_id &&
                      selectedTripRow.stop_id === t.stop_id;
                    const isDelayPositive = t.total_delay_minutes > 0;
                    const bg =
                      isDelayPositive ? "bg-red-500/10" : "bg-emerald-500/10";
                    const border = isSelected
                      ? "ring-2 ring-[#f5a623]/60"
                      : "border border-white/10";
                    return (
                      <button
                        key={`${t.trip_id}-${i}`}
                        onClick={() =>
                          fetchTripDetails(t.trip_id, t.vehicle_id, t.stop_id)
                        }
                        className={`w-full text-left p-3 rounded-xl ${bg} ${border} hover:-translate-y-0.5 transform transition`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm text-white truncate">
                            {t.trip_id}
                          </div>
                          <div
                            className={`text-xs font-medium ${
                              isDelayPositive ? "text-red-300" : "text-emerald-300"
                            }`}
                          >
                            {t.total_delay_minutes?.toFixed(1)} min
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 flex gap-3 mt-1">
                          <span>Vehicle: {t.vehicle_id}</span>
                          <span>Stop: {t.stop_id}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.aside>

          {/* MAP CENTER */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="col-span-12 lg:col-span-6 relative"
          >
            <div className="h-[72vh] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-white/5">
              <TripsMap trips={trips} selectedTripRow={selectedTripRow} />
            </div>

            {/* SUMMARY OVERLAY */}
            {trips.length > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0b132b]/80 border border-white/10 text-sm rounded-xl px-5 py-2 shadow-lg flex items-center gap-6">
                <div>Trips: <span className="text-white font-semibold">{summary.total}</span></div>
                <div>Avg Delay: <span className="text-[#f5a623] font-semibold">{summary.avgDelay.toFixed(1)}m</span></div>
                <div>On-time: <span className="text-emerald-400 font-semibold">{((summary.onTime / summary.total) * 100).toFixed(0)}%</span></div>
              </div>
            )}

            {/* LEGEND */}
            <div className="absolute bottom-4 left-4 bg-[#0b132b]/80 text-xs text-slate-300 rounded-lg px-3 py-2 border border-white/10 shadow">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-400 rounded-full"></span> On-Time</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Delayed</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#f5a623] rounded-full"></span> Selected</div>
            </div>
          </motion.section>

          {/* RIGHT PANEL */}
          <motion.aside
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="col-span-12 lg:col-span-3"
          >
            <div className="h-full rounded-2xl p-4 bg-white/10 border border-white/10 shadow-lg max-h-[72vh] overflow-y-auto">
              {selectedTripRow ? (
                <TripDetails
                  row={selectedTripRow}
                  setSelectedTripRow={setSelectedTripRow}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                  Select a trip to view details
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      </main>

      {/* FLOATING BUTTONS */}
      <NotebookButtons selectedCity={selectedCity} />
    </div>
  );
}