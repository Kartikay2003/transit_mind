# Transit_Mind
Predicts and visualizes real-time MBTA transit delays using a full-stack application built with React, Flask, and LightGBM.
The system integrates weather, route, and alert data to estimate realistic delay times and displays them interactively on a live map dashboard.

Features
Machine Learning Model
- Predicts residual delays (difference from normal route-hour delay).
- Trained using LightGBM regression for high performance on tabular data.
- Combines rule-based and optional traffic-based adjustments.

End-to-End Data Pipeline
- Reads historical MBTA data, weather, and alert archives.
- Performs feature engineering, preprocessing, and model training.
- Outputs CSV with predicted delay minutes for each trip or stop.

Full-Stack Web App
- Frontend (React + Vite) for a fast, responsive UI.
- Map visualization using Leaflet for real-time route delays.
- Backend (Flask) serving predictions via REST API.
- Notebook automation using nbclient for retraining or analysis.

Interactive Features
- Select cities and explore route delay predictions on the map.
- View trip-level delay details and history.
- Trigger notebook re-runs directly from the web interface.

Tech Stack
- Frontend: React, Vite, TailwindCSS, Leaflet, Framer Motion, Axios
- Backend: Flask, Flask-CORS, pandas, numpy, nbclient, nbformat
- ML Model: LightGBM (residual regression) + RandomForest fallback
- Data: Historical MBTA trips, weather data, alerts archive, optional TomTom traffic API

Machine Learning Overview
- Target: Residual delay = actual_delay - route_hour_mean
- Features include time, route, weather, alerts, and past delays.
- LightGBM is chosen for its speed and strong performance on structured data.
- Model outputs residual delay → blended with rules (e.g., peak hour, weather) → clipped → combined with baseline delay for final prediction.

Outputs:
- ml_raw_residual_prediction
- rule_adjustment
- calculated_delay_minutes
- total_delay_minutes
