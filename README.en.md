# dsh-usage-column · Usage Column

([简体中文](README.md) | English)

A DSH plugin that pins a **usage side column** to the DSH Web UI (right side by default, one click to switch to the left), showing live:

- **Account balance**: available / granted / topped-up, from the official public endpoint `GET https://api.deepseek.com/user/balance`
- **This session's API usage**: input (cache miss / cache hit), output (and reasoning tokens), accumulated step by step from the DSH session log
- **Percentage bars**: 🟢 usable-balance percent (available ÷ historical top-up total) and 🟠 session cost share (cost ÷ (start balance + cost)), with gradient and color levels
- **Cost estimate**: session cost converted with the official price table; the rate tier follows the active model and can be overridden in settings

> Note: the reference commands in this project assume the default `web` profile; adjust if you use another profile.

## Features

- The panel is pinned to the right edge; header buttons switch left/right, refresh manually, and close; the toggle button lives at the bottom of the left sidebar (beside Settings)
- Open a session and the panel tracks it automatically: input (cache miss / cache hit), output, reasoning tokens, model-step count and cost
- The first open of a session records the "balance at start" as baseline; the session cost share is computed against it; one-click baseline reset
- Balance data is cached for 60 s; the panel auto-refreshes every 30 s
- Bilingual zh/en (follows the DSH UI language)
- Ships with the `dsh-usage` CLI to check the balance from the terminal (no gateway needed)

## Data sources

| Data | Source |
| --- | --- |
| Balance (available / granted / topped-up) | Official public endpoint `GET https://api.deepseek.com/user/balance`; the API key is resolved per call from the DSH credential store (`DEEPSEEK_API_KEY`) and never persisted by this plugin |
| Session tokens | DSH session projection: accumulates the `usage` of every `assistant/message` event in the log (`inputTokens` = cache miss, `cacheReadTokens` = cache hit, `outputTokens` = output) |
| Cost | `miss input × miss price + hit input × hit price + output × output price` (per 1M tokens); defaults below, overridable in settings |

Default price table (from the [official pricing page](https://api-docs.deepseek.com/quick_start/pricing/), unit: CNY per 1M tokens):

| Tier | Input · cache hit | Input · cache miss | Output |
| --- | --- | --- | --- |
| deepseek-chat (incl. v3.x / v4 series) | 0.2 | 2 | 3 |
| deepseek-reasoner / r1 series | 0.5 | 4 | 16 |

The cost is an estimate; the official bill prevails.

## Installation

1. Install the package (the bundle layer auto-mounts it, no config editing)

   ```bash
   dsh plugin --profile web add github:FishScP/DeepSeek-Harness-Plugins
   ```

   Local paths work too:

   ```bash
   dsh plugin --profile web add "<path\to\side column>"
   ```

2. Restart the gateway

   ```bash
   dsh-restart
   ```

   Refresh the page afterwards: a `¥` button appears at the bottom of the left sidebar (beside Settings); click it to open the panel.

3. Make sure `DEEPSEEK_API_KEY` is configured (DSH Settings → Models page, or `~/.dsh/.credentials.yaml`). Without it the panel shows local session stats only, with a hint.

## Manual mount (development)

```yaml
# append to <profile>/cordis.patch.yml
- insert:
    - id: usage-column
      name: dsh-usage-column
```

and add this package as a dependency (`file:` or npm/git) in the profile `package.json`.

## CLI

```bash
dsh-usage          # print balance, usable-percent bar and credential source
```

## Price overrides

Edit the `usage-column` settings namespace (`pricingOverrides`, keyed by exact model name):

```yaml
usage-column:
  pricingOverrides:
    deepseek-chat:
      hit: 0.2
      miss: 2
      output: 3
```

## Uninstall

```bash
dsh plugin --profile web remove dsh-usage-column
```

## Known limitations

- Balance depends on the official public endpoint; on failure the panel shows an error hint while local session stats keep working
- Session stats accumulate events visible to the gateway while the plugin is mounted; earlier finished sessions are replayed from the log
- The `dsh-usage` CLI currently reports balance only (session logs are zstd-compressed; CLI decompression is planned)

## Disclaimer

Community project, not affiliated with DeepSeek. Cost figures are estimates from public pricing; the official bill prevails.

## License

MIT
