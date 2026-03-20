# Skales Architecture Analysis & Integration Plan

> Analysis of [skalesapp/skales](https://github.com/skalesapp/skales) v7.1.0 for potential integration into TroyAgent/OpenClaw.

## 1. Overview

**Skales** is a local-first AI Desktop Agent built as an Electron app with a Next.js 14 frontend. It provides a native desktop experience (Windows, macOS, Linux) with features like multi-provider LLM chat, browser automation, calendar integration, email, voice, and a proactive desktop buddy.

| Property | Value |
|---|---|
| Version | 7.1.0 ("The Local AI Update") |
| License | BSL-1.1 (free personal/educational, commercial requires license) |
| Architecture | Electron + Next.js 14 (App Router, standalone) |
| Language | TypeScript |
| Storage | `~/.skales-data` (SQLite + JSON files) |
| Build | electron-builder (NSIS / DMG / AppImage / deb) |

### Repository Structure

```
skales/
├── apps/web/                    # Next.js 14 frontend
│   ├── src/
│   │   ├── actions/             # Server actions (36 files)
│   │   ├── app/                 # Pages & API routes
│   │   │   ├── api/             # ~60 API endpoints
│   │   │   ├── calendar/        # Calendar UI
│   │   │   ├── planner/         # Day planner UI
│   │   │   ├── buddy/           # Desktop buddy UI
│   │   │   ├── chat/            # Main chat interface
│   │   │   ├── code/            # Lio AI code builder
│   │   │   ├── memory/          # Memory management
│   │   │   ├── network/         # Network scanner
│   │   │   ├── settings/        # Settings pages
│   │   │   └── ...
│   │   ├── components/          # React components
│   │   ├── lib/                 # Core libraries (27 files)
│   │   ├── skills/              # Built-in skills
│   │   └── types/               # TypeScript types
│   └── package.json
├── electron/                    # Electron main process
│   ├── main.js                  # Main entry point
│   ├── preload.js               # Preload script
│   ├── tray.js                  # System tray
│   └── updater.js               # Auto-updater
├── scripts/                     # Build scripts
└── package.json
```

## 2. Feature Catalog

### Skales Features (with code locations)

| Feature | Code Location | Description |
|---|---|---|
| Multi-provider LLM | `actions/orchestrator.ts`, `actions/chat.ts` | 13+ providers (OpenRouter, OpenAI, Groq, Anthropic, Google, Mistral, Together, xAI, DeepSeek, Minimax, Replicate, Ollama, OpenAI-compatible) |
| Browser Control | `actions/browser-control.ts` | Playwright-based headless Chromium |
| Telegram Bot | `actions/telegram.ts`, `api/chat/telegram/` | Full remote control via Telegram |
| WhatsApp | `actions/whatsapp.ts`, `api/whatsapp/` | WhatsApp Web.js integration |
| Discord | `actions/discord.ts` | Discord.js bot |
| Email (IMAP/SMTP) | `actions/email.ts`, `api/email/` | Multi-account with attachments, imap-simple + nodemailer |
| Calendar Integration | `lib/calendar-*.ts`, `actions/calendar.ts` | Google (OAuth), Apple (CalDAV), Outlook (MS Graph) |
| Planner AI | `actions/planner.ts`, `app/planner/` | AI-powered day scheduling with calendar sync |
| Bi-temporal Memory | `lib/memory-retrieval.ts`, `lib/memory-scanner.ts` | Auto-extract facts, keyword-weighted retrieval |
| Desktop Buddy | `lib/buddy-intelligence.ts`, `app/buddy/` | Proactive mascot with rule-based intelligence |
| DLNA Casting | `actions/casting.ts`, `api/casting/` | SSDP discovery + UPnP/DLNA media control |
| Agent-Sync | `api/agent-sync/route.ts` | Multi-agent handshake, task delegation, status |
| Network Scanner | `actions/network-scanner.ts`, `api/network-scan/` | LAN device discovery |
| Autopilot | `actions/autopilot.ts`, `lib/autonomous-runner.ts` | Multi-step autonomous execution with OODA loop |
| Code Builder (Lio AI) | `actions/code-builder.ts`, `app/code/` | Architect/Reviewer/Builder multi-AI workflow |
| Custom Skills | `lib/skill-ai.ts`, `lib/skill-dispatcher.ts` | .skill.zip hot-reload packages |
| FTP/SFTP Deploy | `lib/ftp-client.ts`, `api/ftp/` | Server profiles, incremental upload |
| Image/Video Gen | `api/replicate/` | Google Imagen, Veo, Replicate SDXL/FLUX |
| Twitter/X | `actions/twitter.ts` | OAuth 1.0a, post/read/reply |
| Voice Chat | `api/voice/` | Whisper STT + ElevenLabs/local TTS |
| Safety/Sandbox | `actions/blacklist.ts`, settings | File sandbox (3 modes), command blacklist, domain blocklist |
| Killswitch | `lib/killswitch.ts` | Emergency stop via dashboard/Telegram/auto |
| Document Gen | `actions/documents.ts` | Excel, Word, PDF from natural language |
| Google Places | `actions/places.ts` | Geocoding, directions, business details |
| Group Chat | `skills/group-chat/` | Multi-persona debate rounds |
| Export/Import | `actions/backup.ts`, `api/export-backup/` | ZIP backup of all settings |
| i18n (9 languages) | `lib/i18n.ts`, `locales/` | EN, DE, ES, FR, RU, ZH, JA, KO, PT |
| VirusTotal | `actions/virustotal.ts` | File scanning integration |

## 3. Overlap Matrix

| Feature | TroyAgent | Skales | Notes |
|---|---|---|---|
| Discord bot | `extensions/discord/` | `actions/discord.ts` | Full overlap |
| Telegram bot | `extensions/telegram/` | `actions/telegram.ts` | Full overlap |
| WhatsApp | `extensions/whatsapp/` | `actions/whatsapp.ts` | Full overlap |
| Slack | `extensions/slack/` | — | TroyAgent only |
| Browser (Playwright) | `src/browser/` (extensive) | `actions/browser-control.ts` | TroyAgent more advanced (CDP, Chrome profiles, pw-ai) |
| Memory | `src/memory/temporal-decay.ts`, `extensions/memory-*` | `lib/memory-retrieval.ts` | Different approaches (see analysis below) |
| TTS/STT | `src/tts/`, `skills/sherpa-onnx-tts/`, `skills/openai-whisper*/` | Local TTS/STT endpoints | Full overlap |
| Multi-provider LLM | `src/agents/` (13+ providers) | `actions/orchestrator.ts` | Full overlap |
| Coding agents | `skills/coding-agent/`, pi-embedded-runner | Lio AI | Different approach |
| Email | `skills/himalaya/` (CLI) | `actions/email.ts` (IMAP) | Skales richer |
| Cron/scheduling | `src/cron/` | — | TroyAgent only |
| **Calendar** | `skills/apple-reminders/` (reminders only) | `lib/calendar-*.ts` | **Skales far richer** |
| **Planner AI** | — | `actions/planner.ts` | **Skales only** |
| **Desktop Buddy** | — | `lib/buddy-intelligence.ts` | **Skales only** |
| **DLNA Casting** | — | `actions/casting.ts` | **Skales only** |
| **Agent-Sync** | `src/acp/` (Agent Communication Protocol) | `api/agent-sync/` | Different protocols |
| Sub-agents | `src/agents/subagent-*.ts` | — | TroyAgent only |
| 41 extensions | `extensions/` | — | TroyAgent far richer |
| 69 skills | `skills/` | `data/builtin-skills/` | TroyAgent far richer |
| Plugin SDK | `src/plugins/types.ts` | — | TroyAgent only |
| Twitter/X | — | `actions/twitter.ts` | Skales only |
| Network scanner | — | `actions/network-scanner.ts` | Skales only |
| FTP/SFTP deploy | — | `lib/ftp-client.ts` | Skales only |
| Google Places | — | `actions/places.ts` | Skales only |

## 4. Integration Candidates (Ranked)

### Priority 1: Calendar Integration (High Value, Medium Effort)

**Why:** TroyAgent has `skills/apple-reminders/` for Apple Reminders but no full calendar integration. Skales supports Google Calendar (OAuth), Apple Calendar (CalDAV/iCloud), and Outlook (Microsoft Graph API) through a unified `CalendarProvider` interface.

**Skales Pattern:**
```typescript
// Unified interface across all providers
interface CalendarProvider {
    getEvents(date: string): Promise<CalendarEvent[]>;
    getEventsRange(start: string, end: string): Promise<CalendarEvent[]>;
    createEvent(event: Omit<CalendarEvent, 'id' | 'provider'>): Promise<CalendarEvent>;
    updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
    deleteEvent(id: string): Promise<boolean>;
}
```

**Integration Plan:**
- Create `skills/calendar-planner/SKILL.md` following the skill convention
- Implement as agent tools using `OpenClawPluginToolFactory` pattern
- Tools: `calendar_list_events`, `calendar_create_event`, `calendar_find_free_time`, `calendar_update_event`, `calendar_delete_event`
- Wire into `src/cron/service.ts` for scheduled reminders
- Reference: `skills/apple-reminders/SKILL.md` for pattern

### Priority 2: DLNA Media Casting (Medium Value, Low Effort)

**Why:** Unique capability with practical value. Skales implements full SSDP discovery + UPnP/DLNA control using `node-ssdp`.

**Skales Pattern:**
- SSDP multicast discovery with unicast fallback
- Device description XML parsing for friendlyName and AVTransport controlUrl
- Full transport control: cast, pause, stop, seek, volume

**Integration Plan:**
- Create `skills/dlna-cast/SKILL.md`
- Wrap SSDP/UPnP operations using `node-ssdp` npm package
- Tools: `dlna_discover_devices`, `dlna_cast_media`, `dlna_control_playback`

### Priority 3: Enhanced Memory System (Medium Value, Medium Effort)

**Why:** Both systems have distinct strengths worth combining.

**TroyAgent approach** (`src/memory/temporal-decay.ts`):
- Half-life-based temporal decay scoring
- LanceDB vector storage (`extensions/memory-lancedb/`)
- Semantic search via embeddings

**Skales approach** (`lib/memory-retrieval.ts`):
- Keyword overlap (Dice coefficient) × 0.70 + recency × 0.20 + category boost × 0.10
- Category-based boosting (action_item, preference, location, fact, contact, url)
- Memory extraction via LLM with structured categories
- Synchronous retrieval (< 100ms target) with 30s in-memory cache

**Integration Plan:**
- Add category metadata to TroyAgent's memory types (`src/memory/types.ts`)
- Implement category-boost retrieval as an alternative scoring mode alongside vector search
- Keep TroyAgent's LanceDB vector search as primary; add Skales-style keyword scoring as a fast fallback when embedding model unavailable

### Priority 4: Agent-Sync Protocol Study (Low Value, Research Only)

**Why:** TroyAgent already has ACP (`src/acp/`). Worth comparing patterns.

**Skales pattern:** Simple REST-based protocol with handshake, task delegation, status checking, and ping. Uses shared secret auth. Each agent has an identity card with capabilities manifest.

**TroyAgent's ACP** is more sophisticated with pub/sub, event streaming, and multi-transport support. The Skales agent-sync pattern is simpler but the capability manifest (listing what an agent can do) could inform ACP enhancements.

**Action:** Document findings; no code changes unless clear improvement identified.

### Priority 5: Proactive Buddy Intelligence (Low Value for Headless Agent)

**Why:** The rule-based proactive notification system is interesting but highly Electron/desktop-specific. However, the *pattern* of gathering context (tasks, calendar, email, idle time) and triggering rule-based notifications could be adapted for TroyAgent's notification channels (Telegram, Discord, Slack, etc.).

**Skales Pattern:**
1. `gatherBuddyContext()` — collects task counts, next meeting, unread emails, idle time
2. `decideBuddyAction()` — 7 rule-based checks with priority and cooldown
3. `tickBuddyIntelligence()` — heartbeat runner

**Possible Adaptation:** Create a proactive notification extension that uses `src/cron/service.ts` to periodically gather context and push notifications through configured channels.

## 5. License Compliance Notes

Skales uses **BSL-1.1** (Business Source License 1.1):

- **Free for personal and educational use**
- **Commercial use requires a license** from the author
- Code cannot be directly copied for commercial purposes
- All integrations must be **clean-room reimplementations** inspired by the patterns observed
- The analysis document should reference design patterns without including source code verbatim
- Any new code written for TroyAgent must be original work following TroyAgent's existing architecture

## 6. Architecture Differences

| Aspect | TroyAgent/OpenClaw | Skales |
|---|---|---|
| Runtime | Headless Node.js gateway | Electron desktop app |
| Frontend | Optional web dashboard | Next.js 14 (embedded) |
| Extension model | Plugin SDK (`OpenClawPluginApi`) with 41 extensions | Server actions + API routes |
| Skill model | SKILL.md convention (69 skills) | .skill.zip hot-reload packages |
| Communication | Multi-channel gateway (Discord, Telegram, Slack, WhatsApp, etc.) | Electron IPC + Next.js API |
| Memory | LanceDB vectors + temporal decay | JSON files + keyword scoring |
| Agent protocol | ACP (Agent Communication Protocol) | REST-based agent-sync |
| Scheduling | Full cron service | No built-in cron (uses Electron timers) |
| Deployment | Docker, bare metal, systemd | Desktop installer (EXE/DMG/AppImage) |

**Key Integration Constraint:** All Skales features rely on Electron IPC for system-level operations (screenshots, window management, tray). When reimplementing for TroyAgent, these must be replaced with headless equivalents (HTTP APIs, CLI tools, WebSocket events).

## 7. Recommended Next Steps

1. **Immediate:** Create `skills/calendar-planner/` with Google Calendar integration (highest value)
2. **Short-term:** Create `skills/dlna-cast/` for media casting capability
3. **Medium-term:** Enhance memory system with category-based boosting
4. **Research:** Study agent-sync patterns for potential ACP improvements
5. **Optional:** Adapt buddy intelligence as a cron-driven proactive notification system
