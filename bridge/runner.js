const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const outfile = process.argv[3];

  if (!url || !outfile) {
    console.error("Missing arguments: url outfile");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const html = await page.content();
  fs.writeFileSync(outfile, html);

  await browser.close();
})();
