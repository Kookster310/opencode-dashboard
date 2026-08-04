# OpenCode Dashboard

Remote dashboard for monitoring [OpenCode](https://github.com/nicepkg/opencode) agent activity and llama.cpp inference servers.

![Dashboard GUI](./gui.png)

## Features

- **Agent Dashboard**: plan progress, tool-call metadata, token usage, background tasks, and time-series activity
- **llama.cpp Monitor**: GPU metrics, model browser, and config presets — connects to a remote server via its `/metrics` endpoint

## Quick Start

```bash
# Run the dashboard
bunx @310networks/opencode-dashboard@latest --project ./

# Connect to a remote OpenCode server (set URL + credentials in the UI)
bunx @310networks/opencode-dashboard@latest --project ./ --host 0.0.0.0
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project <path>` | Project root for plan/session lookup | CWD |
| `--host <host>` | Server bind host | `127.0.0.1` |
| `--port <port>` | Server port | `51234` |

| Env Var | Description |
|---------|-------------|
| `OMO_DASHBOARD_HOST` | Overrides `--host` |

## Connecting to a Remote OpenCode Server

The dashboard runs as a separate server and connects to a remote OpenCode instance:

1. Open the dashboard in your browser
2. In the settings panel, enter your OpenCode server URL (e.g. `http://10.0.0.5:51234`)
3. Add username/password if your OpenCode server requires auth

## llama.cpp Monitor

Configure a remote llama.cpp server URL in settings. The dashboard polls its `/metrics` endpoint for GPU and inference stats — it does not spawn or control any local processes.

## Privacy

Prompts, tool arguments, and raw outputs are never rendered. Only metadata (tool name, status, timestamps, counts) is displayed.

## Attribution

Built on top of [oh-my-opencode-dashboard](https://github.com/WilliamJudge94/oh-my-opencode-dashboard) and [llama-monitor](https://github.com/arte-fact/llama-monitor).
