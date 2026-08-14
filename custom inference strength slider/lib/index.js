// Host half of the liang-intensity-calibrator client plugin.
// Only job: serve the two evolution videos with byte-range support.
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VIDEO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "video");
const ALLOWED = new Map([
  ["liang-evolution.webm", "video/webm"],
  ["liang-evolution.mp4", "video/mp4"],
]);

export const inject = ["webServer"];

function parseRange(header, size) {
  if (typeof header !== "string") return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  let start;
  let end;
  if (match[1] === "" && match[2] === "") return null;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    if (!Number.isFinite(start) || start >= size || end < start) return null;
  }
  return { start, end };
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/liang-video",
    handler: async (req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        res.end();
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      const name = pathname.split("/").filter(Boolean).pop() ?? "";
      const contentType = ALLOWED.get(name);
      if (contentType === undefined) {
        res.writeHead(404);
        res.end();
        return;
      }
      let body;
      try {
        body = await readFile(join(VIDEO_ROOT, name));
      } catch {
        res.writeHead(404);
        res.end();
        return;
      }
      const size = body.length;
      const range = parseRange(req.headers.range, size);
      const headers = {
        "content-type": contentType,
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=86400",
      };
      if (range !== null) {
        headers["content-range"] = `bytes ${range.start}-${range.end}/${size}`;
        headers["content-length"] = String(range.end - range.start + 1);
        res.writeHead(206, headers);
        res.end(body.subarray(range.start, range.end + 1));
      } else {
        headers["content-length"] = String(size);
        res.writeHead(200, headers);
        res.end(req.method === "HEAD" ? undefined : body);
      }
    },
  }), "dsh-client-liang: video route");
}
