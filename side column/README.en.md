# dsh-usage-column · Usage Column

([简体中文](README.md) | English)

A DSH plugin that pins a **usage side column** to the DSH Web UI (right side by default, one click to switch to the left), showing live:

- **Account balance**: available / granted / topped-up (granted green, topped-up blue), from the official public endpoint `GET https://api.deepseek.com/user/balance`; a merged balance bar (granted + topped-up = usable, used in gray, 0% segments as thin lines) shows rough proportions without clutter
- **Session usage**: input (cache miss / cache hit), output (and reasoning tokens), accumulated from the durable session log plus a live listener — history survives gateway restarts
- **Two totals**: the session card shows **Project total** (whole-session accumulated cost) and **Since reset** (cost since the baseline was last reset); the hit/miss/output breakdown and its ratio bar are computed against the project total
- **Runtime metrics**: LLM time, tool time, output rate (token/s), cache hit rate
- **Cost breakdown**: hit cost (green) / miss cost (orange) / output cost (blue) with a three-segment relative bar
- **Context window bar**: "xx% used" then "xxK context left"; the used amount is the measured input of the last conversation-level request (DeepSeek billing `prompt_tokens`; auxiliary requests such as title generation are filtered out), and the window comes from official model metadata (1M default, overridable in settings)
- **Layout**: right = unified split view (the main UI yields its width to the panel); left = covers the built-in sidebar

> Note: the reference commands in this project assume the default `web` profile; adjust if you use another profile.

## Features

- Panel docks to the right edge by default; header buttons switch left/right, refresh, and close; the entry button sits at the bottom of the left sidebar (beside Settings) and shows icon + label when expanded, icon only when collapsed (rail mode)
- Master switch at **Settings → General → "Usage side column"** (styled like the rest of the General page); when off, both the panel and the entry are hidden
- Opens with the current session: input (cache miss / cache hit), output, reasoning tokens, model-step count, and the two totals
- Baseline (balance at start + cost at baseline) recorded on first open; one-click baseline reset
- Balance data cached for 60 s; the panel auto-refreshes every 30 s
- Bilingual zh/en (follows the DSH UI language)
- Ships with the `dsh-usage` CLI to check the balance from the terminal (no gateway needed)

## Data sources

| Data | Source |
| --- | --- |
| Balance (available / granted / topped-up) | Official public endpoint `GET https://api.deepseek.com/user/balance`; the API key is resolved per call from the DSH credential store (`DEEPSEEK_API_KEY`) and never persisted by this plugin |
| Session tokens | Durable session log folded via `sessionQuery.readSession` plus a live `session/event` listener (dual channel; history intact after restarts) |
| Cost | `miss input × miss price + hit input × hit price + output × output price` (CNY per 1M tokens); V4 models priced per model with off-peak/peak tiers; overridable in settings |

Default price table (from the [official pricing page](https://api-docs.deepseek.com/quick_start/pricing/), unit: CNY per 1M tokens; V4 series billed by model and time tier since the 2026-08 adjustment):

| Model | Tier | Input · cache hit | Input · cache miss | Output |
| --- | --- | --- | --- | --- |
| deepseek-v4-flash | Off-peak | 0.05 | 1.5 | 4.5 |
| deepseek-v4-flash | Peak | 0.10 | 3.0 | 9.0 |
| deepseek-v4-pro | Off-peak | 0.15 | 4.5 | 13.5 |
| deepseek-v4-pro | Peak | 0.30 | 9.0 | 27.0 |
| deepseek-chat / reasoner (fallback) | single | 0.2 / 0.5 | 2 / 4 | 3 / 16 |

- **Time tiers** (Beijing time): peak = 9:00–12:00 and 14:00–18:00; off-peak otherwise; peak price = off-peak × 2.
- **Auto tier**: defaults to `auto`, selected by the current Beijing time; can be fixed to off-peak/peak in settings.
- Cost is an estimate (historical tokens are re-priced at the current table); the official bill prevails.

## Installation

1. Install the package (the bundle layer auto-mounts it, no config editing)

   ```bash
   git clone https://github.com/FishScP/DeepSeek-Harness-Plugins.git
   dsh plugin --profile web add "<path\to\DeepSeek-Harness-Plugins\side column>"
   ```

   Local paths work too:

   ```bash
   dsh plugin --profile web add "<path\to\side column>"
   ```

2. Restart the gateway

   ```bash
   dsh-restart
   ```

   Refresh the page afterwards: a bar-chart button appears at the bottom of the left sidebar (beside Settings); click it to open the panel.

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

Edit the `usage-column` settings namespace (`pricingOverrides`, keyed by exact model name; an override applies to both tiers):

```yaml
usage-column:
  pricingOverrides:
    deepseek-chat:
      hit: 0.2
      miss: 2
      output: 3
```

The time tier is controlled by `pricingTier` (`auto` | `offpeak` | `peak`, default `auto`).

## Uninstall

```bash
dsh plugin --profile web remove dsh-usage-column
```

## Known limitations

- Balance depends on the official public endpoint; on failure the panel shows `--` placeholders and retries automatically
- Session stats come from the durable log plus a live listener; auxiliary model requests (e.g. title generation) are excluded from the context-window figure
- The `dsh-usage` CLI currently reports balance only (session logs are zstd-compressed; CLI decompression is planned)

## Disclaimer

Community project, not affiliated with DeepSeek. Cost figures are estimates from public pricing; the official bill prevails.

## License

MIT

> If the installation fails following the tutorial, please clone the repository locally and install it with DSH.
