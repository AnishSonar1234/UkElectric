# WindSight Analytics — Demonstration Video Script

**Target Video Length:** 9 minutes 30 seconds (Maximum 10 minutes)  
**Format:** Unlisted YouTube Video  
**Audience:** Utility Energy Procurement Heads, Power Traders, and Technical Reviewers  
**Platform Status:** Fully functional MVP powered by real Elexon BMRS data

---

## Video Outline & Timing Breakdown

| Segment | Target Duration | Timestamp | Presenter Focus |
|---|---|---|---|
| **Part 1: Customer Presentation** | 4 min 30 sec | `00:00 - 04:30` | Business problem, day-ahead auction rules, KPIs, and operational value |
| **Part 2: Technical Review** | 4 min 30 sec | `04:30 - 09:00` | Pipeline architecture, vintage selection algorithm, tests, and Docker |
| **Conclusion & Summary** | 30 sec | `09:00 - 09:30` | Summary, deployment readiness, and limitations |

---

## Part 1: Customer Presentation (Target: 4m 30s | 00:00 - 04:30)

### 00:00 - 01:00 — Introduction & The Day-Ahead Wind Forecasting Problem
* **Screen Action:** Open browser to `http://localhost:5173/`. Display the clean dark-mode Overview dashboard of WindSight Analytics with the pulsing "Elexon BMRS Live" status indicator.
* **Narration:**
  > "Welcome to this demonstration of **WindSight Analytics**, a decision-support platform designed specifically for the day-ahead electricity procurement team at a UK energy utility.
  >
  > Every day before the wholesale power exchanges close, our trading desk must purchase electricity to match anticipated consumer demand. With wind supplying an increasingly large share of the British grid, wind forecast uncertainty represents our largest balance-sheet risk. Overforecasting leads to purchasing surplus power at high day-ahead prices and dumping it at distressed imbalance prices; underforecasting leaves us short, exposing us to volatile system buy prices.
  >
  > Today, we demonstrate how WindSight Analytics gives our procurement team complete transparency into national wind forecasts, enforces deterministic auction gate closures, and quantifies forecast accuracy using official outturn data from Elexon."

### 01:00 - 02:00 — Day-Ahead Gate Closure & The Latest Eligible Forecast
* **Screen Action:** Highlight the Filter Bar showing Decision Date `2026-01-15 (D-1)`, Delivery Date `2026-01-16 (D)`, and Decision Cutoff `11:00:00 UTC`. Hover over the cutoff explanation.
* **Narration:**
  > "In the UK power market, our primary day-ahead wholesale procurement occurs on the EPEX SPOT and Nord Pool auctions, where order books close strictly at **11:00 UTC** on day D-1.
  >
  > Notice here in the filter bar: we have selected a decision date of **January 15, 2026**, for delivery on **January 16**. The decision cutoff is set to **11:00:00 UTC**.
  >
  > Multiple forecast vintages are published throughout the day. A major risk in naive analytics is 'look-ahead bias'—evaluating day-ahead decisions using forecasts issued later in the afternoon or evening that our traders did not possess at 11:00 AM. WindSight Analytics deterministically eliminates all post-cutoff forecasts, ensuring we evaluate only the latest forecast vintage that was actually available when our traders committed capital."

### 02:00 - 03:00 — Forecast vs. Actual Analysis & Real Data Insight
* **Screen Action:** Scroll to the Executive Brief banner and the comparative chart showing the Electric Cyan forecast curve vs. the Renewable Emerald actual generation curve.
* **Narration:**
  > "Let's inspect the real data for January 16, 2026. The Executive Brief banner immediately synthesizes our daily position:
  >
  > Across the 24 evaluated delivery periods, national wind generation was **overforecasted by an average of 393.5 MW**, with a Mean Absolute Error of **897.33 MW** and an RMSE of **1,124.31 MW**.
  >
  > Looking at the dual chart, we observe high forecast fidelity during the early morning hours—for instance, at 00:00 UTC, the forecast was 7,472 MW against an actual outturn of 7,477 MW, an error of just -5 MW. However, as evening peak approached around 21:00 UTC, the forecast projected 8,428 MW while actual generation fell to 5,881 MW, creating an overforecast error of **+2,547 MW**. This real-world insight highlights the exact hours where our desk would have needed to procure balancing reserves."

### 03:00 - 03:50 — Inspecting Forecast Vintages & Audit Trail
* **Screen Action:** Scroll down to the Delivery Periods Summary table and click the **'Inspect Vintages'** button on the 00:00 delivery period. The Vintage Inspection Modal opens.
* **Narration:**
  > "Transparency is critical for risk management. When our desk questions why a particular number was used, we can click 'Inspect Vintages' on any period.
  >
  > Here in the modal, we see all vintages published by Elexon for this delivery hour: runs from January 14, early morning January 15 at 02:30, 04:30, 07:30, and 09:30 UTC. The algorithm verified that the 09:30 UTC run was the latest published prior to the 11:00 UTC cutoff and flagged it as 'Selected'. Any vintages published in the afternoon—such as 12:25 or 15:30 UTC—are clearly labeled as 'Excluded (Post-Cutoff)'. This provides an immutable audit trail."

### 03:50 - 04:30 — Business Metrics & Operational Boundaries
* **Screen Action:** Close modal and switch to the **'Forecast Accuracy'** tab. Highlight the KPI cards (MAE, RMSE, Bias, MAPE) and the Error Distribution bar chart.
* **Narration:**
  > "In the Forecast Accuracy tab, our team tracks standard energy-trading metrics:
  > - **MAE (897 MW)** tells us our typical volume deviation in Megawatts.
  > - **RMSE (1,124 MW)** penalizes extreme swings, which dictate our spinning reserve sizing.
  > - **Forecast Bias (+393.5 MW)** indicates a systematic overforecasting tendency across this day.
  > - **MAPE (11.43%)** provides a normalized percentage metric, strictly excluding periods below 100 MW to avoid distorted percentages during low-wind regimes.
  >
  > To maintain operational safety, WindSight Analytics is strictly a decision-support system: it does not automatically execute market trades or calculate our complete net customer position."

---

## Part 2: Technical Review (Target: 4m 30s | 04:30 - 09:00)

### 04:30 - 05:30 — System Architecture & Official Elexon Pipeline
* **Screen Action:** Display the project structure in VS Code and open `backend/app/services/elexon_client.py`.
* **Narration:**
  > "Turning to the technical implementation: the application is built on a modern decoupled architecture:
  > - **Frontend:** React 19, Vite, TypeScript, and Recharts, styled with an information-dense Vanilla CSS design system tailored for energy trading.
  > - **Backend:** Python 3.12/3.13, FastAPI, Pydantic v2, and HTTPX.
  > - **Data Source:** Exclusively official Elexon Insights Solution streams:
  >   1. `FUELHH/stream` for half-hourly outturn generation, filtered by `fuelType=WIND`.
  >   2. `WINDFOR/stream` for multi-day national wind forecasts.
  >
  > In `elexon_client.py`, requests are validated, typed, and passed through a high-performance local caching layer (`cache_service.py`), eliminating redundant network latency and respecting Elexon's upstream capacity."

### 05:30 - 06:45 — Deterministic Forecast Selection Algorithm
* **Screen Action:** Open `backend/app/services/forecast_service.py` and highlight `select_latest_eligible_forecasts()`.
* **Narration:**
  > "The core business logic resides in `forecast_service.py`. Let's examine `select_latest_eligible_forecasts`:
  >
  > Given a decision date and cutoff time (e.g. `2026-01-15T11:00:00Z`), the function:
  > 1. Filters candidate WINDFOR records targeting delivery on day D (`2026-01-16`).
  > 2. Discards any vintage where `publishTime > decision_cutoff`.
  > 3. For each delivery period `startTime`, selects `max(publishTime) <= decision_cutoff`.
  >
  > Notice also how month boundaries are handled: if a decision is made on **January 31**, delivery falls on **February 1**. The service smoothly aligns the delivery window to February 1 while enforcing the January 31 cutoff, satisfying the January decision-month requirement without confusing decision dates with delivery dates."

### 06:45 - 07:30 — Timestamp Alignment & Missing Data Integrity
* **Screen Action:** Highlight the matching loop in `evaluate_forecast_accuracy()` and open `backend/app/analytics/metrics.py`.
* **Narration:**
  > "Data integrity is paramount in power systems.
  >
  > Elexon's `WINDFOR` stream publishes forecasts at hourly resolution (`:00`), whereas `FUELHH` publishes actual outturn every half-hour (`:00` and `:30`).
  >
  > In strict accordance with the prompt's data engineering rules, WindSight Analytics:
  > - Never replaces missing values with zero.
  > - Never compares unmatched records.
  > - Performs exact timestamp matching on identical `:00` timestamps (yielding 24 matched observations per day).
  > - In `metrics.py`, `calculate_mape` enforces a minimum 100 MW actual threshold, preventing division-by-zero errors when national wind drops near zero."

### 07:30 - 08:15 — Automated Test Suite & Code Quality
* **Screen Action:** Switch to terminal and run `backend/.venv/Scripts/pytest -v`. Show all 16 tests passing.
* **Narration:**
  > "Reliability is verified through an automated test suite with 100% deterministic fixtures:
  > - Multiple vintage selection and cutoff filtering.
  > - Strict boundary conditions (`11:00:00Z` eligible vs `11:00:01Z` ineligible).
  > - Month transitions (January 31 to February 1).
  > - Exact mathematical metric verification against hand-calculated datasets.
  > - MAPE zero-exclusion and empty dataset handling.
  >
  > As you see, all 16 unit and integration tests pass in less than one second."

### 08:15 - 09:00 — Docker Containerization & Deployment Readiness
* **Screen Action:** Open `docker-compose.yml`, `backend/Dockerfile`, and `frontend/nginx.conf`.
* **Narration:**
  > "For deployment, the entire platform is containerized:
  > - `backend/Dockerfile` runs FastAPI with automated health checks on port 8000.
  > - `frontend/Dockerfile` utilizes a two-stage build: building static assets with Node 22 and serving them via Nginx with an automated reverse proxy for `/api/` calls, eliminating CORS issues in production.
  > - The entire stack spins up with a single command: `docker compose up --build`.
  > - The frontend is also Vercel-ready with single-page routing configuration."

---

## Conclusion & Submission Wrap-Up (09:00 - 09:30)

### 09:00 - 09:30 — Summary & Final Thoughts
* **Screen Action:** Return to the live WindSight Analytics browser interface, clicking through the tabs to show the smooth, responsive UI.
* **Narration:**
  > "In summary, WindSight Analytics delivers a complete, production-grade MVP for the UK energy procurement desk:
  > - Real live Elexon data ingestion for January 2026.
  > - Deterministic gate-closure forecast selection.
  > - Industry-standard statistical accuracy analytics (MAE, RMSE, Bias, MAPE).
  > - Transparent vintage inspection and comprehensive methodology documentation.
  >
  > Thank you for reviewing WindSight Analytics."
