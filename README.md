# OpenCode Dashboard

Local-only, read-only dashboard for OpenCode agent activity with a built-in llama.cpp monitor.

![Dashboard GUI](./gui.png)

## Features

- **Agent Dashboard**: plan progress, background tasks, tool-call metadata, token usage, and time-series activity
- **llama.cpp Monitor**: GPU metrics, server start/stop, model browser, chat interface, and config presets

## Quick Start

```bash
# Register your project (required after OpenCode SQLite update)
bunx @310networks/opencode-dashboard@latest add --name "My Project"

# Launch the dashboard
bunx @310networks/opencode-dashboard@latest
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project <path>` | Project root for plan/session lookup | CWD |
| `--host <host>` | Server bind host | `127.0.0.1` |
| `--port <port>` | Server port | `51234` |

Environment variable: `OMO_DASHBOARD_HOST` overrides `--host`.

## Install from Source

```bash
bun install
bun run dev -- --project /path/to/your/project
```

Production: `bun run build && bun run start -- --project /path/to/your/project`

## What It Reads

- **Projects**: `.sisyphus/boulder.json` for OhMyOpenCode plan tracking (optional)
- **OpenCode SQLite**: `~/.local/share/opencode/opencode.db` (read-only, auto-detected)
- **Fallback**: Legacy file-based storage at `~/.local/share/opencode/storage/`

## Privacy

Prompts, tool arguments, and raw outputs are never rendered. Only metadata (tool name, status, timestamps, counts) is shown.

## Attribution

Built on top of [oh-my-opencode-dashboard](https://github.com/WilliamJudge94/oh-my-opencode-dashboard) and [llama-monitor](https://github.com/arte-fact/llama-monitor).
