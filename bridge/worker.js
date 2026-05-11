// bridge/worker.js
import fs from "fs";
import fetch from "node-fetch";

async function main() {
  const [, , requestFile, resultFile] = process.argv;

  if (!requestFile || !resultFile) {
    console.error("Usage: node bridge/worker.js <request.json> <result.json>");
    process.exit(1);
  }

  try {
    if (!fs.existsSync(requestFile)) {
      console.error(`Request file not found: ${requestFile}`);
      process.exit(0);
    }

    const raw = fs.readFileSync(requestFile, "utf8");
    const req = JSON.parse(raw);

    const url = req.url;
    if (!url) {
      fs.writeFileSync(
        resultFile,
        JSON.stringify(
          {
            id: req.id || null,
            error: "Missing 'url' in request.json"
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`🌐 Fetching: ${url}`);

    const response = await fetch(url);

    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const body = await response.text();

    const result = {
      id: req.id || null,
      url,
      status: response.status,
      statusText: response.statusText,
      headers,
      body
    };

    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
    console.log(`✅ Result written to ${resultFile}`);
  } catch (err) {
    const errorResult = {
      error: err?.message || String(err)
    };

    try {
      fs.writeFileSync(resultFile, JSON.stringify(errorResult, null, 2));
    } catch (_) {
      // ignore
    }

    console.error("❌ Worker error:", err);
  }
}

main();
