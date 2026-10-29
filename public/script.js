
const grid = document.querySelector("#matchGrid");
const count = document.querySelector("#resultCount");
const empty = document.querySelector("#emptyState");
const loadMore = document.querySelector("#loadMore");
const playerSection = document.querySelector("#playerSection");
const player = document.querySelector("#matchPlayer");

let view = "live";
let selectedLeague = "";
let allMatches = [];
let page = 1;
const pageSize = 12;

function localDate() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function text(value, fallback = "") {
  return String(value ?? fallback);
}

function getStatus(match) {
  if (match.finished || match.status === "FINISHED") return "Full time";
  if (match.minute != null) return `${match.minute}'`;
  return text(match.status, match.live ? "Live" : "Scheduled");
}

function scoreText(match) {
  if (match.score != null) return text(match.score);

  const home = match.home_score ?? match.goals?.home;
  const away = match.away_score ?? match.goals?.away;

  if (home != null && away != null) return `${home} - ${away}`;
  return "VS";
}

function safeEmbedUrl(match) {
  const value = match.embed_url;

  if (typeof value !== "string") return "";

  try {
    const url = new URL(value, "https://matchora.to");

    if (
      url.protocol === "https:" &&
      url.hostname === "matchora.to" &&
      url.pathname.startsWith("/embed/")
    ) {
      return url.href;
    }
  } catch {}

  return "";
}

function card(match) {
  const article = document.createElement("article");
  article.className = "match-card";

  const league = document.createElement("div");
  league.className = "match-league";
  league.textContent = text(match.league, "Football");

  const teams = document.createElement("div");
  teams.className = "teams";

  const home = document.createElement("div");
  home.className = "team";
  home.textContent = text(match.home, "Home");

  const score = document.createElement("div");
  score.className = "score";
  score.textContent = scoreText(match);

  const away = document.createElement("div");
  away.className = "team";
  away.textContent = text(match.away, "Away");

  teams.append(home, score, away);

  const status = document.createElement("div");
  status.className = "match-status";
  status.textContent = getStatus(match);

  const button = document.createElement("button");
  button.className = "watch-button";

  const embedUrl = safeEmbedUrl(match);

  button.textContent = embedUrl ? "▶ Watch match" : "Stream unavailable";
  button.disabled = !embedUrl;

  button.addEventListener("click", () => {
    player.src = embedUrl;
    document.querySelector("#playerTitle").textContent =
      `${text(match.home)} vs ${text(match.away)}`;
    playerSection.hidden = false;
    playerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  article.append(league, teams, status, button);
  return article;
}

async function loadMatches() {
  count.textContent = "Loading matches...";
  grid.replaceChildren();
  empty.hidden = true;
  loadMore.hidden = true;

  const endpoint = view === "live"
    ? "/api/live"
    : `/api/schedule?date=${localDate()}`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("Match API unavailable");

    const data = await response.json();
    allMatches = Array.isArray(data.events) ? data.events : [];

    renderMatches();
  } catch {
    count.textContent = "Unable to load matches.";
    empty.textContent =
      "Please try again shortly. The football data provider may be unavailable.";
    empty.hidden = false;
  }
}

function renderMatches() {
  const filtered = allMatches.filter(match => {
    if (!selectedLeague) return true;
    return text(match.league).toLowerCase()
      .includes(selectedLeague.toLowerCase());
  });

  const visible = filtered.slice(0, page * pageSize);

  grid.replaceChildren(...visible.map(card));
  count.textContent = `${filtered.length} football match${filtered.length === 1 ? "" : "es"}`;
  empty.hidden = filtered.length > 0;
  loadMore.hidden = visible.length >= filtered.length;

  document.querySelector("#pageTitle").textContent =
    view === "live" ? "Live football" : "Upcoming football";

  document.querySelector("#sectionTitle").textContent =
    selectedLeague || (view === "live" ? "Live now" : "Upcoming matches");
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    view = button.dataset.view;
    selectedLeague = "";
    page = 1;
    document.querySelectorAll(".nav").forEach(nav =>
      nav.classList.toggle("active", nav === button)
    );
    loadMatches();
    document.querySelector(".sidebar").classList.remove("open");
  });
});

document.querySelectorAll("[data-league]").forEach(button => {
  button.addEventListener("click", () => {
    selectedLeague = button.dataset.league;
    page = 1;
    document.querySelectorAll(".nav").forEach(nav =>
      nav.classList.toggle("active", nav === button)
    );
    renderMatches();
    document.querySelector(".sidebar").classList.remove("open");
  });
});

document.querySelector("#refresh").addEventListener("click", loadMatches);
loadMore.addEventListener("click", () => {
  page++;
  renderMatches();
});

document.querySelector("#menuToggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

document.querySelector("#closePlayer").addEventListener("click", () => {
  player.src = "about:blank";
  playerSection.hidden = true;
});

loadMatches();
setInterval(loadMatches, 30000);
