import fs from "node:fs/promises";

const queuePath = new URL("../investment-queue.json", import.meta.url);
const pricesPath = new URL("../market-prices.json", import.meta.url);
const queue = JSON.parse(await fs.readFile(queuePath, "utf8"));
const tickers = [...new Map(queue.map((item) => [item.ticker, item])).values()];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowKst() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function isKoreanMarket(item) {
  return item.market === "KR" || /^[0-9A-Z]{6}$/.test(item.ticker);
}

function parseNaverChangePct(html) {
  const block = html.match(/<p class="no_exday">[\s\S]*?<\/p>/)?.[0];
  if (!block) throw new Error("Naver change block missing");

  const values = [...block.matchAll(/<span class="blind">([^<]+)<\/span>/g)].map(
    (match) => match[1].replace(/,/g, "").trim(),
  );
  const pct = Number(values[1]);
  if (!Number.isFinite(pct)) throw new Error("Naver change percent missing");

  if (block.includes("no_down") || block.includes('ico minus') || block.includes(">하락<")) {
    return -Math.abs(pct);
  }
  if (block.includes("no_up") || block.includes('ico plus') || block.includes(">상승<")) {
    return Math.abs(pct);
  }
  return 0;
}

async function fetchNaver(item) {
  const response = await fetch(`https://finance.naver.com/item/main.naver?code=${item.ticker}`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!response.ok) throw new Error(`Naver ${response.status}`);
  const html = await response.text();
  return {
    changePct: parseNaverChangePct(html),
    updatedAt: nowKst(),
    source: "Naver Finance",
  };
}

async function fetchYahoo(item) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      item.ticker,
    )}?range=1d&interval=1d`,
    {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    },
  );
  if (!response.ok) throw new Error(`Yahoo ${response.status}`);

  const data = await response.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  const previousClose = Number(meta?.chartPreviousClose);
  if (!Number.isFinite(price) || !Number.isFinite(previousClose) || previousClose === 0) {
    throw new Error("Yahoo price fields missing");
  }

  return {
    changePct: ((price - previousClose) / previousClose) * 100,
    updatedAt: nowKst(),
    source: "Yahoo Finance",
  };
}

const items = {};
const errors = [];

for (const item of tickers) {
  try {
    items[item.ticker] = isKoreanMarket(item) ? await fetchNaver(item) : await fetchYahoo(item);
    console.log(`${item.ticker} ${items[item.ticker].changePct.toFixed(2)}%`);
  } catch (error) {
    errors.push({ ticker: item.ticker, name: item.name, message: error.message });
    console.warn(`${item.ticker} skipped: ${error.message}`);
  }
  await sleep(180);
}

const output = {
  updatedAt: nowKst(),
  source: "manual",
  items,
  errors,
};

await fs.writeFile(pricesPath, `${JSON.stringify(output, null, 2)}\n`);

if (errors.length) {
  console.warn(`Completed with ${errors.length} skipped tickers.`);
} else {
  console.log("Completed without skipped tickers.");
}
