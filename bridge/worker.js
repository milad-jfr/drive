import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run(job) {
  const { id, url } = job;

  try {
    const res = await fetch(url);

    const status = res.status;
    const headers = Object.fromEntries(res.headers.entries());
    const body = await res.text();

    const outPath = path.join("bridge/results", `${id}.json`);
    fs.writeFileSync(
      outPath,
      JSON.stringify({ status, headers, body }, null, 2)
    );

    console.log("DONE:", id);
  } catch (err) {
    console.error("ERROR:", id, err);
  }
}

// ورودی JSON را از آرگومان می‌گیرد
const raw = fs.readFileSync(process.argv[2], "utf8");
run(JSON.parse(raw));
