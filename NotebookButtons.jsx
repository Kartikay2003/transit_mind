import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaCheckCircle } from "react-icons/fa";

/**
 * NotebookButtons: visually upgraded, same endpoints:
 * POST /api/run_notebook  { name: "main_1.ipynb" } -> { job_id }
 * GET  /api/notebook_status?job_id=<id> -> { status }
 */

export default function NotebookButtons({ selectedCity }) {
  const NOTEBOOKS = [
    { key: "main_1.ipynb", label: "Schedule & Delay" },
    { key: "main_2.ipynb", label: "Total Delay" },
  ];

  const [jobs, setJobs] = useState(() =>
    NOTEBOOKS.reduce((acc, n) => {
      acc[n.key] = { status: "idle", job_id: null, message: null };
      return acc;
    }, {})
  );

  const polls = useRef({});

  useEffect(() => {
    return () => {
      Object.values(polls.current).forEach((id) => id && clearInterval(id));
    };
  }, []);

  const startPolling = (name, job_id) => {
    if (polls.current[name]) {
      clearInterval(polls.current[name]);
      polls.current[name] = null;
    }

    polls.current[name] = setInterval(async () => {
      try {
        const resp = await axios.get("/api/notebook_status", { params: { job_id } });
        const data = resp.data;
        const st = data.status || data.state || "error";
        setJobs((prev) => ({ ...prev, [name]: { ...prev[name], status: st, message: data.message || null } }));

        if (st === "done" || st === "error") {
          clearInterval(polls.current[name]);
          polls.current[name] = null;
        }
      } catch (err) {
        console.error("poll error", err);
        const em = err?.response?.data || err?.message || "poll failed";
        setJobs((prev) => ({ ...prev, [name]: { ...prev[name], status: "error", message: em } }));
        if (polls.current[name]) {
          clearInterval(polls.current[name]);
          polls.current[name] = null;
        }
      }
    }, 2000);
  };

  const runNotebook = async (name) => {
    const cur = jobs[name];
    if (cur.status === "running" || cur.status === "pending") return;

    setJobs((prev) => ({ ...prev, [name]: { ...prev[name], status: "pending", message: "Queued" } }));

    try {
      const resp = await axios.post("/api/run_notebook", { name });
      const job_id = resp.data?.job_id;
      if (!job_id) {
        const em = resp.data || "no job_id returned";
        setJobs((prev) => ({ ...prev, [name]: { ...prev[name], status: "error", message: em } }));
        return;
      }
      setJobs((prev) => ({ ...prev, [name]: { ...prev[name], job_id, status: "running", message: "Started" } }));
      startPolling(name, job_id);
    } catch (err) {
      console.error("runNotebook error", err);
      const em = err?.response?.data?.error || err?.response?.data || err?.message || "request failed";
      setJobs((prev) => ({ ...prev, [name]: { ...prev[name], status: "error", message: em } }));
    }
  };

  // Only show for Boston (same behavior as before)
  if (selectedCity !== "Boston") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      {NOTEBOOKS.map(({ key, label }) => {
        const j = jobs[key];
        const isActive = j.status === "running" || j.status === "pending";

        const base = "w-56 px-4 py-2 rounded-xl shadow-lg flex items-center justify-between transition-transform transform";
        const stateClass =
          j.status === "idle" ? "bg-[#f5a623]/10 text-[#f5a623]" :
          j.status === "pending" || j.status === "running" ? "bg-[#f5a623] text-white" :
          j.status === "done" ? "bg-emerald-500 text-white" :
          j.status === "error" ? "bg-red-500 text-white" :
          "bg-[#f5a623]/10 text-[#f5a623]";

        return (
          <div key={key} className="flex flex-col items-end">
            <button
              onClick={() => runNotebook(key)}
              disabled={isActive}
              className={`${base} ${stateClass} ${isActive ? "scale-100" : "hover:-translate-y-0.5"}`}
              title={j.message || label}
            >
              <div className="flex flex-col text-left">
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs opacity-80">
                  {j.status === "idle" && "Run notebook"}
                  {(j.status === "pending" || j.status === "running") && "Running..."}
                  {j.status === "done" && "Completed"}
                  {j.status === "error" && "Error"}
                </span>
              </div>

              <div className="ml-3 flex items-center">
                {(j.status === "pending" || j.status === "running") && (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                {j.status === "done" && <FaCheckCircle className="h-5 w-5 text-white" />}
                {j.status === "idle" && (
                  <svg className="h-5 w-5 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>

            {j.status === "error" && (
              <div className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                {typeof j.message === "string" ? j.message : JSON.stringify(j.message)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
