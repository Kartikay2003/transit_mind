from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import threading
import subprocess
import time
import os
import uuid
import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError
import traceback
import re

app = Flask(__name__)
CORS(app)

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, ".."))

NOTEBOOKS_DIR = PROJECT_ROOT
NOTEBOOK_ALLOWED = {"main_1.ipynb", "main_2.ipynb"}

CSV_PATH = os.path.join(PROJECT_ROOT, "mbta_delays_with_predictions.csv")

if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"CSV file not found at expected path: {CSV_PATH}")

df = pd.read_csv(CSV_PATH)

weather_codes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall",
    77: "Snow grains", 80: "Rain showers (slight)", 81: "Rain showers (moderate)",
    82: "Rain showers (violent)", 85: "Snow showers (slight)", 86: "Snow showers (heavy)",
    95: "Thunderstorm (slight or moderate)", 96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail"
}

def _extract_int(val):
    """Return the first integer found in val, or None if none / val is NaN."""
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass

    if val is None:
        return None

    s = str(val)
    m = re.search(r'(\d+)', s)
    return int(m.group(1)) if m else None

@app.route("/api/", methods=["GET"])
def home():
    return jsonify({"message": "MBTA Delay Prediction API is running. Use /api/cities to begin."})

@app.route("/api/cities", methods=["GET"])
def get_cities():
    return jsonify({"cities": ["Boston"]})

@app.route("/api/boston/trips", methods=["GET"])
def list_trips():
    trips = df[["vehicle_id", "trip_id", "stop_id", "latitude", "longitude", "total_delay_minutes"]].to_dict(orient="records")

    safe_trips = []
    for t in trips:
        orig_vid = None if pd.isna(t.get("vehicle_id")) else str(t.get("vehicle_id"))
        numeric_vid = _extract_int(orig_vid)

        safe_trips.append({
            "vehicle_id": orig_vid,                         
            "vehicle_numeric_id": numeric_vid,              
            "trip_id": str(t.get("trip_id")) if t.get("trip_id") is not None else None,
            "stop_id": str(t.get("stop_id")) if t.get("stop_id") is not None else None,
            "latitude": float(t.get("latitude")) if not pd.isna(t.get("latitude")) else None,
            "longitude": float(t.get("longitude")) if not pd.isna(t.get("longitude")) else None,
            "total_delay_minutes": float(t.get("total_delay_minutes")) if not pd.isna(t.get("total_delay_minutes")) else None
        })
    return jsonify(safe_trips)

@app.route("/api/boston/trips/details", methods=["GET"])
def trip_details():
    trip_id = request.args.get("trip_id")
    vehicle_id_param = request.args.get("vehicle_id")
    stop_id = request.args.get("stop_id")

    if trip_id:
        mask = df["trip_id"].astype(str) == str(trip_id)
    else:
        mask = pd.Series([True] * len(df), index=df.index)

    if vehicle_id_param:
        vid_str = str(vehicle_id_param)
        vid_num = _extract_int(vehicle_id_param)
        df_vid_str = df["vehicle_id"].astype(str)
        if vid_num is not None:
            vid_num_str = str(vid_num)
            mask = mask & ((df_vid_str == vid_str) | (df_vid_str == vid_num_str))
        else:
            mask = mask & (df_vid_str == vid_str)

    if stop_id:
        mask = mask & (df["stop_id"].astype(str) == str(stop_id))

    row = df[mask]

    if row.empty:
        return jsonify({"error": "No matching record found"}), 404

    row_dict = row.iloc[0].to_dict()
    clean_row = {k: (v.item() if hasattr(v, "item") else v) for k, v in row_dict.items()}

    orig_vehicle = None if pd.isna(clean_row.get("vehicle_id")) else str(clean_row.get("vehicle_id"))
    numeric_vehicle = _extract_int(orig_vehicle)

    wcode = clean_row.get("weathercode")
    try:
        wcode_int = int(wcode) if not pd.isna(wcode) else None
    except Exception:
        wcode_int = None

    response = {
        "trip_id": str(clean_row.get("trip_id")) if clean_row.get("trip_id") is not None else None,
        "vehicle_id": orig_vehicle,
        "vehicle_numeric_id": numeric_vehicle,
        "stop_id": str(clean_row.get("stop_id")) if clean_row.get("stop_id") is not None else None,
        "latitude": float(clean_row.get("latitude")) if not pd.isna(clean_row.get("latitude")) else None,
        "longitude": float(clean_row.get("longitude")) if not pd.isna(clean_row.get("longitude")) else None,
        "temperature": float(clean_row.get("temperature_C")) if clean_row.get("temperature_C") is not None and not pd.isna(clean_row.get("temperature_C")) else None,
        "humidity": int(clean_row.get("humidity_%")) if clean_row.get("humidity_%") is not None and not pd.isna(clean_row.get("humidity_%")) else None,
        "precipitation": float(clean_row.get("precipitation_mm")) if clean_row.get("precipitation_mm") is not None and not pd.isna(clean_row.get("precipitation_mm")) else None,
        "visibility": float(clean_row.get("visibility_m")) if clean_row.get("visibility_m") is not None and not pd.isna(clean_row.get("visibility_m")) else None,
        "weather_code": wcode_int,
        "weather_description": weather_codes.get(wcode_int, "Unknown") if wcode_int is not None else None,
        "total_delay_minutes": float(clean_row.get("total_delay_minutes")) if clean_row.get("total_delay_minutes") is not None and not pd.isna(clean_row.get("total_delay_minutes")) else None
    }

    return jsonify(response)

jobs = {}
jobs_lock = threading.Lock()

def run_notebook_thread(notebook_name, job_id):
    """
    Execute notebook using nbclient (Python) with client.execute() to avoid kernel client assertion.
    Notebook lives in NOTEBOOKS_DIR.
    """
    full_path = os.path.join(NOTEBOOKS_DIR, notebook_name)

    with jobs_lock:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 1
        jobs[job_id]["started_at"] = time.time()
        jobs[job_id]["message"] = "Started"

    try:
        nb = nbformat.read(full_path, as_version=4)

        client = NotebookClient(nb, timeout=600, kernel_name="python3", allow_errors=True)

        with jobs_lock:
            jobs[job_id]["message"] = "Executing notebook"

        client.execute(cwd=PROJECT_ROOT)

        try:
            nbformat.write(nb, full_path)
        except Exception:
            pass

        with jobs_lock:
            jobs[job_id]["status"] = "done"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["finished_at"] = time.time()
            jobs[job_id]["message"] = "Completed successfully"

    except Exception as e:
        try:
            if "nb" in locals():
                nbformat.write(nb, full_path)
        except Exception:
            pass

        import traceback as _traceback
        tb = _traceback.format_exc()
        with jobs_lock:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["finished_at"] = time.time()
            jobs[job_id]["message"] = f"Exception: {tb[:2000]}"

@app.route("/api/run_notebook", methods=["POST"])
def run_notebook():
    """
    Start running a notebook in background.
    POST JSON body: { "name": "main_1.ipynb" }
    Returns: { "job_id": "<id>" }
    """
    data = request.get_json(force=True)
    name = data.get("name")
    if not name:
        return jsonify({"error": "Missing notebook name"}), 400

    if name not in NOTEBOOK_ALLOWED:
        return jsonify({"error": "Notebook not allowed"}), 403

    full_path = os.path.join(NOTEBOOKS_DIR, name)
    if not os.path.exists(full_path):
        return jsonify({"error": "Notebook file not found on server", "path": full_path}), 404

    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {
            "name": name,
            "status": "pending",
            "progress": 0,
            "started_at": None,
            "finished_at": None,
            "message": "Queued"
        }

    t = threading.Thread(target=run_notebook_thread, args=(name, job_id), daemon=True)
    t.start()

    return jsonify({"job_id": job_id})

@app.route("/api/notebook_status", methods=["GET"])
def notebook_status():
    """
    Query status of a job.
    Query param: job_id or name
    """
    job_id = request.args.get("job_id")
    name = request.args.get("name")

    with jobs_lock:
        if job_id:
            job = jobs.get(job_id)
            if not job:
                return jsonify({"error": "Job not found"}), 404
            return jsonify(job)

        if name:
            matches = [(jid, j) for jid, j in jobs.items() if j.get("name") == name]
            if not matches:
                return jsonify({"error": "No jobs for that notebook"}), 404
            matches.sort(key=lambda x: x[1].get("started_at") or 0, reverse=True)
            jid, job = matches[0]
            return jsonify({"job_id": jid, **job})

    return jsonify({"error": "Provide job_id or name param"}), 400

if __name__ == "__main__":
    app.run(debug=True, threaded=True)