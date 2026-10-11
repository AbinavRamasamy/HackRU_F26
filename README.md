# ScarletHop - Smarter Commutes Across Rutgers

**ScarletHop** is an intelligent Rutgers transit companion and embeddable widget that helps students effortlessly navigate between campuses and classes on time.  
By combining multimodal class schedule parsing, live campus bus telemetry, and AI-driven delay prediction, the system eliminates transit anxiety and eliminates the guesswork of New Brunswick bus commutes.

---

## Screen Shot Of Transit Portal & Widget

![ScarletHop Transit Portal & Route Navigation](./Patient_Portal.png)

---

## System Overview

ScarletHop consists of three main layers:

1. **Frontends**
   - **Student Web Dashboard:** Built with Next.js, React, TypeScript, and Tailwind CSS. Enables schedule upload, interactive campus route inspection, and customizable commute alerts.
   - **Floating Transit Mini-Widget:** An embeddable, draggable interactive widget that stays pinned to the screen or embedded in student portals, giving live departure countdowns and immediate bus arrival alerts.

2. **Transit & Routing Intelligence Server**
   - Powered by FastAPI, Python, and multimodal LLMs (Google Gemini).
   - Ingests class schedules directly from screenshots via vision OCR, extracts building codes, and maps them to physical Rutgers campus coordinates.
   - Calculates dynamic inter-campus travel times, walking buffers, and crowd-aware departure windows.

3. **Telemetry & Transit Data Hub**
   - Built on FastAPI with automated resilience caching.
   - Ingests live Rutgers bus telemetry (via `transitstat.us/rutgers` and TripShot feeds), backed by a deterministic mock telemetry generator for guaranteed reliability during API outages.
   - Evaluates historical traffic bottlenecks (Route 18 bridge congestion, peak class change intervals) to power proactive delay alerts.

---

## Data Flow

![Architecture Diagram](./architecture.png)

| Step | Communication | Description |
|------|----------------|-------------|
| 1 | Student Dashboard → Intelligence Server | Student uploads a screenshot of their Rutgers course schedule (WebReg / Canvas). |
| 2 | Intelligence Server → Telemetry Data Hub | Queries live GPS feeds for buses (LX, B, F, EE, H, REXB, REXL) matching next class destination. |
| 3 | Telemetry Data Hub → Intelligence Server | Returns live vehicle positions, road traffic state, or synthetic backup feeds. |
| 4 | Intelligence Server ↔ Floating Transit Widget | Delivers real-time "Leave In X Mins" notifications, alternative route suggestions, and live countdowns. |

---

## Core Features

### Student Portal & Schedule Ingestion
- **1-Click Schedule OCR:** Upload a screenshot or PDF of your Rutgers schedule; Gemini extracts all courses, days, times, and lecture hall locations.
- **Campus Route Planner:** Calculates end-to-end travel plans combining walking time to the nearest bus stop + transit ride + walking to class.
- **Traffic & Rush-Hour Heuristics:** Automatically accounts for Route 18 bridge traffic during peak class-change transitions.

### Floating Transit Widget
- **Live Commute Pill:** Compact floating badge showing countdown to optimal bus departure and line recommendation.
- **Expanded Quick View:** 1-tap view showing arrival radar, stop walking guidance, and next bus alternatives.
- **Adaptive Copilot Advice:** Plain-English transit suggestions (e.g., *"LX is packed at College Hall; walk 2 mins to Scott Hall or take the EE to George St"*).

---

## Technologies

| Category | Stack |
|-----------|--------|
| **Frontend** | React, Next.js, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI, Pydantic, Uvicorn, Python 3.11+ |
| **AI & Vision** | Google Gemini Vision (Schedule OCR & Transit Copilot) |
| **Transit & Geodata** | `transitstat.us/rutgers`, TripShot Feeds, Rutgers Campus GIS Graph, Mock Telemetry Engine |
| **Integration** | REST APIs, Server-Sent Events (SSE) / WebSockets for live countdowns |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### Setup
```bash
# Clone the repository
git clone https://github.com/AbinavRamasamy/HackRU_F26.git
cd HackRU_F26
```

---

## Mission

Navigating Rutgers' 5 campuses shouldn't feel like a guessing game. **ScarletHop** empowers students with predictive AI and real-time transit intelligence — ensuring you spend less time waiting at crowded bus stops and always make it to class on time.
