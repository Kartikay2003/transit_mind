import React, { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export default function CitySelector({ cities, selectedCity, onSelectCity }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredCities = cities.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative w-full text-sm">
      <label className="text-slate-200 font-semibold block mb-2">
        Select City
      </label>

      {/* Selector button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2 flex items-center justify-between rounded-lg 
          bg-white/10 hover:bg-white/15 transition-all 
          text-slate-100 border border-white/10 focus:outline-none 
          focus:ring-2 focus:ring-[#f5a623]/40"
      >
        <span>{selectedCity || "Choose a City"}</span>
        <ChevronDown
          className={`w-4 h-4 ml-1 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-40 mt-2 w-full rounded-lg border border-white/10 
            bg-[#0b132b]/95 backdrop-opacity-90 shadow-lg overflow-hidden"
        >
          {/* Search bar */}
          <div className="flex items-center px-2 py-2 border-b border-white/10">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 
                focus:outline-none text-sm"
            />
          </div>

          {/* City list */}
          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {filteredCities.length === 0 ? (
              <div className="px-4 py-3 text-slate-500 text-center text-xs">
                No results
              </div>
            ) : (
              filteredCities.map((city) => (
                <div
                  key={city}
                  onClick={() => {
                    onSelectCity(city);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`px-4 py-2 cursor-pointer text-slate-100 hover:bg-[#f5a623]/20 
                    transition ${
                      city === selectedCity
                        ? "bg-[#f5a623]/30 text-[#f5a623] font-medium"
                        : ""
                    }`}
                >
                  {city}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
