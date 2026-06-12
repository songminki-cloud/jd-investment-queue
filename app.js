const categories = [
  {
    code: "A",
    key: "신규매수",
    countId: "summary-new-count",
    topId: "summary-new-top",
    hint: "새 편입 검토 후보",
  },
  {
    code: "B",
    key: "추가매수",
    countId: "summary-add-count",
    topId: "summary-add-top",
    hint: "기존 관심/보유 축 확대",
  },
  {
    code: "C",
    key: "관망",
    countId: "summary-watch-count",
    topId: "summary-watch-top",
    hint: "가격, 실적, 수급 확인 전",
  },
  {
    code: "D",
    key: "보유관리",
    countId: "summary-hold-count",
    topId: "summary-hold-top",
    hint: "리스크와 비중 점검 대상",
  },
];

const statusClass = {
  확정: "status-confirmed",
  제안: "status-suggested",
  보류: "status-paused",
};

const board = document.querySelector("#board");
const columnTemplate = document.querySelector("#columnTemplate");
const cardTemplate = document.querySelector("#cardTemplate");
const refreshButton = document.querySelector("#refreshButton");
const refreshStatus = document.querySelector("#refreshStatus");
let queueTabsInitialized = false;

function priorityRank(item) {
  return Number.isFinite(item.priority) ? item.priority : Number.POSITIVE_INFINITY;
}

function sortByPriority(items) {
  return [...items].sort((a, b) => {
    const priorityDiff = priorityRank(a) - priorityRank(b);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name, "ko");
  });
}

function groupByCategory(items) {
  return categories.reduce((groups, category) => {
    groups[category.key] = sortByPriority(
      items.filter((item) => item.category === category.key),
    );
    return groups;
  }, {});
}

function renderSummary(groups, items, prices) {
  document.querySelector("#itemCount").textContent = `${items.length}개`;

  categories.forEach((category) => {
    const rows = groups[category.key];
    const top = rows.find((item) => Number.isFinite(item.priority));
    document.querySelector(`#${category.countId}`).textContent = `${rows.length}개`;
    document.querySelector(`#${category.topId}`).textContent = top
      ? `${category.code}-1: ${top.name} (${top.ticker})`
      : "1순위 없음";
  });

  const recent = [...items]
    .sort((a, b) => {
      const dateDiff = new Date(b.lastUpdated) - new Date(a.lastUpdated);
      if (dateDiff !== 0) return dateDiff;
      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, 5);

  const recentList = document.querySelector("#recentList");
  recentList.replaceChildren(
    ...recent.map((item) => {
      const li = document.createElement("li");
      const titleRow = document.createElement("span");
      titleRow.className = "recent-title-row";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const changeChip = createChangeChip(item, prices);
      titleRow.append(name);
      if (changeChip) titleRow.append(changeChip);
      li.append(
        titleRow,
        document.createElement("br"),
        `${item.category} · ${item.lastUpdated}`,
        document.createElement("br"),
        item.changeReason,
      );
      return li;
    }),
  );
}

function formatChangePct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function priceForItem(item, prices) {
  const items = prices?.items || {};
  return items[item.ticker] || items[item.ticker?.toUpperCase()] || items[item.id] || null;
}

function applyChangeChipState(changeChip, price) {
  const formatted = formatChangePct(price?.changePct);

  if (!formatted) return false;

  const changePct = Number(price.changePct);
  changeChip.hidden = false;
  changeChip.textContent = formatted;
  changeChip.classList.toggle("change-positive", changePct > 0);
  changeChip.classList.toggle("change-negative", changePct < 0);
  changeChip.classList.toggle("change-flat", changePct === 0);
  changeChip.title = [price.source, price.updatedAt].filter(Boolean).join(" · ");
  return true;
}

function createChangeChip(item, prices) {
  const price = priceForItem(item, prices);
  const changeChip = document.createElement("span");
  changeChip.className = "change-chip";
  changeChip.hidden = true;

  return applyChangeChipState(changeChip, price) ? changeChip : null;
}

function isKoreanTicker(item) {
  const market = String(item.market || "").toUpperCase();
  const ticker = String(item.ticker || "").trim().toUpperCase();
  return market === "KR" || market === "ETF" || (market !== "US" && /^\d{6}$/.test(ticker));
}

function tossUrlForItem(item) {
  const ticker = String(item.ticker || "").trim().toUpperCase();
  if (!ticker) return "https://www.tossinvest.com/";

  if (isKoreanTicker(item) || item.market === "ETF") {
    return `https://www.tossinvest.com/stocks/A${encodeURIComponent(ticker)}`;
  }

  return `https://www.tossinvest.com/stocks/${encodeURIComponent(ticker)}`;
}

function openPrimarySecurityLink(card) {
  const url = card.dataset.primaryUrl;
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function bindCardLink(card) {
  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    openPrimarySecurityLink(card);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("a, button")) return;

    event.preventDefault();
    openPrimarySecurityLink(card);
  });
}

function setChangeChip(card, item, prices) {
  const changeChip = card.querySelector(".change-chip");
  const price = priceForItem(item, prices);

  if (!applyChangeChipState(changeChip, price)) {
    changeChip.hidden = true;
  }
}

function createCard(item, queueCode, displayIndex, prices) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".stock-card");
  const queuePosition = `${queueCode}-${displayIndex}`;
  const tossUrl = tossUrlForItem(item);

  card.dataset.primaryUrl = tossUrl;
  card.setAttribute(
    "aria-label",
    `${item.name} (${item.ticker}) 토스증권 페이지 새 탭에서 열기`,
  );
  card.querySelector(".position-badge").textContent = queuePosition;
  card.querySelector("h3").textContent = item.name;
  card.querySelector(".ticker").textContent = item.ticker;

  const status = card.querySelector(".status-pill");
  status.textContent = item.status;
  status.classList.add(statusClass[item.status] || "status-paused");

  card.querySelector(".market-chip").textContent = item.market;
  card.querySelector(".priority-chip").textContent = Number.isFinite(item.priority)
    ? `${queuePosition} · 우선순위 ${item.priority}`
    : `${queuePosition} · 우선순위 없음`;
  card.querySelector(".holding-chip").textContent = item.holdingStatus;
  card.querySelector(".source-chip").textContent = item.sourceType || "출처 미분류";
  setChangeChip(card, item, prices);
  card.querySelector('[data-field="thesis"]').textContent = item.thesis;
  card.querySelector('[data-field="nextAction"]').textContent = item.nextAction;
  card.querySelector('[data-field="risk"]').textContent = item.risk;
  card.querySelector('[data-field="lastUpdated"]').textContent =
    `마지막 변경일: ${item.lastUpdated}`;
  card.querySelector('[data-field="changeReason"]').textContent =
    `변경 사유: ${item.changeReason}`;
  const tossLink = card.querySelector(".toss-link");
  tossLink.href = tossUrl;
  tossLink.setAttribute("aria-label", `${item.name} 토스증권 열기`);
  bindCardLink(card);

  return node;
}

function renderBoard(groups, prices) {
  const columns = categories.map((category) => {
    const node = columnTemplate.content.cloneNode(true);
    const column = node.querySelector(".queue-column");
    const items = groups[category.key];

    column.id = `queue-${category.code}`;
    column.querySelector(".queue-code").textContent = category.code;
    column.querySelector(".queue-title").textContent = category.key;
    column.querySelector(".column-header p").textContent = category.hint;
    column.querySelector(".column-count").textContent = `${items.length}`;

    const cardList = column.querySelector(".card-list");
    cardList.replaceChildren(
      ...items.map((item, index) => createCard(item, category.code, index + 1, prices)),
    );
    return node;
  });

  board.replaceChildren(...columns);
}

function setupQueueTabs() {
  if (queueTabsInitialized) return;
  queueTabsInitialized = true;

  document.querySelectorAll(".queue-tabs a, .summary-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href")?.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;

      event.preventDefault();
      history.replaceState(null, "", `#${targetId}`);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (window.location.hash) {
    requestAnimationFrame(() => {
      document
        .getElementById(window.location.hash.slice(1))
        ?.scrollIntoView({ block: "start" });
    });
  }
}

function setRefreshStatus(text) {
  refreshStatus.textContent = text;
}

async function fetchJson(path, options = {}) {
  const cacheBust = Date.now();
  const response = await fetch(`${path}?v=${cacheBust}`, { cache: "no-store" });
  if (!response.ok) {
    if (options.optional) return null;
    throw new Error(`${path} 로딩 실패: ${response.status}`);
  }
  return response.json();
}

async function loadAndRender(isManualRefresh = false) {
  try {
    refreshButton.disabled = true;
    setRefreshStatus(isManualRefresh ? "업데이트 중" : "로딩 중");

    const [items, prices] = await Promise.all([
      fetchJson("investment-queue.json"),
      fetchJson("market-prices.json", { optional: true }),
    ]);
    const groups = groupByCategory(items);
    renderSummary(groups, items, prices);
    renderBoard(groups, prices);
    setupQueueTabs();
    setRefreshStatus(prices?.updatedAt ? `수동가격 ${prices.updatedAt}` : "큐 최신");
  } catch (error) {
    board.innerHTML = `<p class="error">${error.message}<br>로컬 서버로 실행했는지 확인하세요.</p>`;
    setRefreshStatus("오류");
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => loadAndRender(true));

loadAndRender();
