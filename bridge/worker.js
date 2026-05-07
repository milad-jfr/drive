const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const id = job.id;
  const url = job.url;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  const html = await page.content();

  fs.writeFileSync(`bridge/results/${id}.html`, html);

  await browser.close();

  console.log("done:", id);
})();
