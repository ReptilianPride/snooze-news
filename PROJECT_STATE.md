# Sector Pulse — Project State

## Project Intent

Build an AI-driven market news system that uses abnormal sector ETF
movements to determine which parts of the market deserve attention,
then autonomously investigates relevant news and presents evidence-backed
likely drivers.

The project is primarily intended to demonstrate AI engineering:
agentic workflows, tool use, external information retrieval, evidence
validation, structured outputs, and production deployment.

## Core User Flow

1. User opens Sector Pulse.
2. System analyses the 11 US GICS sector ETFs.
3. System detects abnormal price movements.
4. Abnormal sectors are passed to the investigation agent.
5. Agent investigates the relevant market context.
6. Agent searches for relevant news.
7. Agent filters and validates retrieved evidence.
8. Agent produces likely drivers with supporting headlines.
9. UI presents the results clearly.

## Core Technology

- Next.js
- TypeScript
- Tailwind CSS
- OpenCode for development
- Sector ETF market data
- PostgreSQL if persistence becomes necessary
- AI model with web-search/tool capabilities
- Vercel for frontend deployment

## Sector Universe

- XLK — Technology
- XLF — Financials
- XLE — Energy
- XLV — Health Care
- XLY — Consumer Discretionary
- XLP — Consumer Staples
- XLI — Industrials
- XLB — Materials
- XLRE — Real Estate
- XLC — Communication Services
- XLU — Utilities

## Architecture

Next.js
  ├── Market Data Layer
  ├── Anomaly Detection Engine
  ├── Agent Tools
  ├── Investigation Agent
  └── News Intelligence UI

## Development Phases

### Phase 1 — Foundation
- [x] Create Next.js application
- [ ] Create project state
- [ ] Establish project structure
- [ ] Create basic dashboard

### Phase 2 — Market Data
- [ ] Retrieve sector ETF data
- [ ] Normalise market data
- [ ] Calculate returns
- [ ] Calculate rolling volatility
- [ ] Display sector performance

### Phase 3 — Anomaly Detection
- [ ] Establish 30-day baseline
- [ ] Calculate z-scores
- [ ] Define anomaly threshold
- [ ] Rank abnormal sectors

### Phase 4 — Agent Tools
- [ ] Price context tool
- [ ] News search tool
- [ ] Evidence validation
- [ ] News ranking

### Phase 5 — Investigation Agent
- [ ] Define agent instructions
- [ ] Define tool-calling workflow
- [ ] Structured investigation output
- [ ] Confidence/evidence assessment
- [ ] Failure handling

### Phase 6 — Intelligence UI
- [ ] Market overview
- [ ] Anomaly cards
- [ ] Investigation results
- [ ] Supporting headlines
- [ ] Evidence/source display

### Phase 7 — Productionisation
- [ ] Logging
- [ ] Caching
- [ ] Error handling
- [ ] Performance improvements
- [ ] Vercel deployment
- [ ] README
- [ ] Architecture diagram
- [ ] Portfolio documentation

## Important Design Rules

- Deterministic calculations stay in normal code.
- The LLM does not calculate financial statistics.
- The agent investigates rather than simply generating a response.
- News claims must be supported by retrieved sources.
- Do not claim that news caused a price movement without sufficient evidence.
- Prefer "likely driver" or "relevant development".
- Avoid unnecessary multi-agent complexity.
- Build the simplest working version before adding sophistication.

## Current Status

Phase: 1 — Foundation

Current task:
Create the Next.js application and establish the project structure.

Next task:
Implement the first market-data layer for the 11 sector ETFs.