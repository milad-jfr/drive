import fs from "fs/promises";

const REQUEST_FILE = "bridge/request.json";
const RESULT_FILE = "bridge/result.json";

function lowerCaseKeys(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v;
  return out;
}

function decodeRequestBody(body, encoding) {
  if (!body) return undefined;
  if (encoding === "base64") return Buffer.from(body, "base64");
  return Buffer.from(body, "utf8");
}

function sanitizeRequestHeaders(headers = {}, targetUrl) {
  const h = lowerCaseKeys(headers);

  const blocked = new Set([
    "content-length",
    "transfer-encoding",
    "connection"
  ]);

  const out = {};
  for (const [k, v] of Object.entries(h)) {
    if (blocked.has(k)) continue;
    out[k] = v;
  }

  try {
    const u = new URL(targetUrl);
    out.host = u.host;
    if (out.origin) out.origin = u.origin;
  } catch {}

  return out;
}

function headersToObject(headers) {
  const out = {};

  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (out[k] === undefined) {
      out[k] = value;
    } else if (Array.isArray(out[k])) {
      out[k].push(value);
    } else {
      out[k] = [out[k], value];
    }
  });

  return out;
}

function shouldReturnText(contentType = "") {
  const ct = contentType.toLowerCase();

  return (
    ct.includes("text/") ||
    ct.includes("json") ||
    ct.includes("javascript") ||
    ct.includes("xml") ||
    ct.includes("svg") ||
    ct.includes("x-www-form-urlencoded")
  );
}

async function main() {
  let request;

  try {
    const raw = await fs.readFile(REQUEST_FILE, "utf8");
    request = JSON.parse(raw);

    const method = (request.method || "GET").toUpperCase();
    const targetUrl = request.url;

    const headers = sanitizeRequestHeaders(request.headers || {}, targetUrl);
    const bodyBuffer = decodeRequestBody(request.body, request.bodyEncoding);

    const fetchOptions = {
      method,
      headers,
      redirect: "follow"
    };

    if (!["GET", "HEAD"].includes(method) && bodyBuffer !== undefined) {
      fetchOptions.body = bodyBuffer;
    }

    const resp = await fetch(targetUrl, fetchOptions);

    const responseHeaders = headersToObject(resp.headers);
    const contentType = String(responseHeaders["content-type"] || "");

    let body;
    let bodyEncoding = "utf8";

    if (method === "HEAD") {
      body = "";
    } else if (shouldReturnText(contentType)) {
      body = await resp.text();
      bodyEncoding = "utf8";
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      body = buf.toString("base64");
      bodyEncoding = "base64";
      responseHeaders["x-body-encoding"] = "base64";
    }

    const result = {
      id: request.id,
      status: resp.status,
      statusText: resp.statusText,
      headers: responseHeaders,
      body,
      bodyEncoding,
      finalUrl: resp.url
    };

    await fs.writeFile(
      RESULT_FILE,
      JSON.stringify(result, null, 2),
      "utf8"
    );
  } catch (err) {
    const errorResult = {
      id: request?.id || null,
      error: err.message || String(err)
    };

    try {
      await fs.writeFile(
        RESULT_FILE,
        JSON.stringify(errorResult, null, 2),
        "utf8"
      );
    } catch {}
  }
}

main();
