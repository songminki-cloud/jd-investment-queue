const categories = [
  {
    key: "신규매수",
    countId: "summary-new-count",
    topId: "summary-new-top",
    hint: "새 편입 검토 후보",
  },
  {
    key: "추가매수",
    countId: "summary-add-count",
    topId: "summary-add-top",
    hint: "기존 관심/보유 축 확대",
  },
  {
    key: "관망",
    countId: "summary-watch-count",
    topId: "summary-watch-top",
    hint: "가격, 실적, 수급 확인 전",
  },
  {
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

function renderSummary(groups, items) {
  document.querySelector("#itemCount").textContent = `${items.length}개`;

  categories.forEach((category) => {
    const rows = groups[category.key];
    const top = rows.find((item) => Number.isFinite(item.priority));
    document.querySelector(`#${category.countId}`).textContent = `${rows.length}개`;
    document.querySelector(`#${category.topId}`).textContent = top
      ? `1순위: ${top.name} (${top.ticker})`
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
      const name = document.createElement("strong");
      name.textContent = item.name;
      li.append(
        name,
        document.createElement("br"),
        `${item.category} · ${item.lastUpdated}`,
        document.createElement("br"),
        item.changeReason,
      );
      return li;
    }),
  );
}

function createCard(item) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".stock-card");
  card.querySelector("h3").textContent = item.name;
  card.querySelector(".ticker").textContent = item.ticker;

  const status = card.querySelector(".status-pill");
  status.textContent = item.status;
  status.classList.add(statusClass[item.status] || "status-paused");

  card.querySelector(".market-chip").textContent = item.market;
  card.querySelector(".priority-chip").textContent = Number.isFinite(item.priority)
    ? `우선순위 ${item.priority}`
    : "우선순위 없음";
  card.querySelector(".holding-chip").textContent = item.holdingStatus;
  card.querySelector('[data-field="thesis"]').textContent = item.thesis;
  card.querySelector('[data-field="nextAction"]').textContent = item.nextAction;
  card.querySelector('[data-field="risk"]').textContent = item.risk;
  card.querySelector('[data-field="lastUpdated"]').textContent =
    `마지막 변경일: ${item.lastUpdated}`;
  card.querySelector('[data-field="changeReason"]').textContent =
    `변경 사유: ${item.changeReason}`;

  return node;
}

function renderBoard(groups) {
  const columns = categories.map((category) => {
    const node = columnTemplate.content.cloneNode(true);
    const column = node.querySelector(".queue-column");
    const items = groups[category.key];

    column.querySelector("h2").textContent = category.key;
    column.querySelector(".column-header p").textContent = category.hint;
    column.querySelector(".column-count").textContent = `${items.length}`;

    const cardList = column.querySelector(".card-list");
    cardList.replaceChildren(...items.map(createCard));
    return node;
  });

  board.replaceChildren(...columns);
}

async function init() {
  try {
    const response = await fetch("investment-queue.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`JSON 로딩 실패: ${response.status}`);

    const items = await response.json();
    const groups = groupByCategory(items);
    renderSummary(groups, items);
    renderBoard(groups);
  } catch (error) {
    board.innerHTML = `<p class="error">${error.message}<br>로컬 서버로 실행했는지 확인하세요.</p>`;
  }
}

init();
