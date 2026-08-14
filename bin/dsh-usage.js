#!/usr/bin/env node
/**
 * dsh-usage —— DeepSeek 账户余额查询命令行。
 *
 * 读取 DEEPSEEK_API_KEY（优先级：环境变量 > DSH_HOME/.credentials.yaml），
 * 调用官方公开接口 GET https://api.deepseek.com/user/balance 打印余额与可用百分比。
 *
 * 会话级用量统计（输入缓存未命中/命中、输出与费用）请在 DSH Web 界面的
 * 「用量侧栏」面板查看（需要网关在运行）。
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { balancePercent } from "../lib/math.js";

const BALANCE_URL = "https://api.deepseek.com/user/balance";
const TIMEOUT_MS = 10_000;

async function resolveApiKey() {
  if (typeof process.env.DEEPSEEK_API_KEY === "string" && process.env.DEEPSEEK_API_KEY.trim().length > 0) {
    return { key: process.env.DEEPSEEK_API_KEY.trim(), source: "env" };
  }
  const dshHome = typeof process.env.DSH_HOME === "string" && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME
    : join(homedir(), ".dsh");
  const file = join(dshHome, ".credentials.yaml");
  if (!existsSync(file)) return null;
  try {
    const doc = parseYaml(await readFile(file, "utf8"));
    const value = doc !== null && typeof doc === "object" ? doc.DEEPSEEK_API_KEY : undefined;
    if (typeof value === "string" && value.trim().length > 0) return { key: value.trim(), source: file };
  } catch {
    return null;
  }
  return null;
}

function num(value) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function money(value, currency) {
  const prefix = currency === "CNY" ? "¥" : currency + " ";
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : 2;
  return prefix + value.toFixed(digits);
}

async function main() {
  const resolved = await resolveApiKey();
  if (resolved === null) {
    console.error("未找到 DEEPSEEK_API_KEY：请设置环境变量 DEEPSEEK_API_KEY，或在 DSH 凭证文件中配置。");
    process.exitCode = 1;
    return;
  }
  let res;
  try {
    res = await fetch(BALANCE_URL, {
      headers: { authorization: "Bearer " + resolved.key },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (error) {
    console.error("余额接口请求失败：" + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
    return;
  }
  if (!res.ok) {
    console.error("余额接口返回 HTTP " + res.status);
    process.exitCode = 1;
    return;
  }
  const body = await res.json();
  const info = Array.isArray(body?.balance_infos) ? body.balance_infos[0] : undefined;
  if (body?.is_available === false) {
    console.error("该 API Key 无可用余额信息。");
    process.exitCode = 1;
    return;
  }
  const currency = typeof info?.currency === "string" && info.currency.length > 0 ? info.currency : "CNY";
  const total = num(info?.total_balance);
  const granted = num(info?.granted_balance);
  const toppedUp = num(info?.topped_up_balance);
  const pct = balancePercent(total, granted, toppedUp);

  console.log("DeepSeek 账户余额（" + currency + "）");
  console.log("  可用余额 : " + money(total, currency));
  console.log("  赠金余额 : " + money(granted, currency));
  console.log("  充值余额 : " + money(toppedUp, currency));
  if (pct !== null) {
    console.log("  可用百分比: " + pct.toFixed(1) + "%");
    const width = 20;
    const filled = Math.round(clampPct(pct) / 5);
    console.log("  [" + "#".repeat(filled) + "-".repeat(width - filled) + "]");
  }
  console.log("");
  console.log("凭证来源：" + resolved.source);
  console.log("会话级用量统计（输入缓存未命中/命中、输出与费用）请打开 DSH Web 界面的「用量侧栏」。");
}

function clampPct(value) {
  return Math.max(0, Math.min(100, value));
}

main().catch((error) => {
  console.error("dsh-usage 执行失败：" + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
