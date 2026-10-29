
const grid = document.querySelector("#matchGrid");
const count = document.querySelector("#resultCount");
const empty = document.querySelector("#emptyState");
const loadMore = document.querySelector("#loadMore");
const playerSection = document.querySelector("#playerSection");
const player = document.querySelector("#matchPlayer");

let view = "live";
let selectedSport = "";
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


function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getSport(match) {
  return firstText(match.sport, match.category, match.sport_name, "Other");
}

function getCompetition(match) {
  return firstText(
    match.league,
    match.competition,
    match.tournament,
    match.league_name,
    "Competition not specified"
  );
}

function getParticipant(match, side) {
  const isHome = side === "home";
  const direct = isHome
    ? [match.home, match.home_team, match.homeTeam, match.player1]
    : [match.away, match.away_team, match.awayTeam, match.player2];

  const name = firstText(...direct);

  if (name) return name;

  const participants = Array.isArray(match.participants)
    ? match.participants
    : [];

  const participant = participants[isHome ? 0 : 1];

  if (typeof participant === "string") return participant;
  if (participant && typeof participant === "object") {
    return firstText(participant.name, participant.title, participant.team);
  }

  return "";
}

function card(match) {
  const article = document.createElement("article");
  article.className = "match-card";

  const sport = document.createElement("div");
  sport.className = "match-league";
  sport.textContent = getSport(match);

  const competition = document.createElement("div");
  competition.className = "match-status";
  competition.textContent = getCompetition(match);

  const homeName = getParticipant(match, "home");
  const awayName = getParticipant(match, "away");
  const eventTitle = firstText(match.title, match.name, match.event_name);

  const teams = document.createElement("div");
  teams.className = "teams";

  if (homeName && awayName) {
    const home = document.createElement("div");
    home.className = "team";
    home.textContent = homeName;

    const score = document.createElement("div");
    score.className = "score";
    score.textContent = scoreText(match);

    const away = document.createElement("div");
    away.className = "team";
    away.textContent = awayName;

    teams.append(home, score, away);
  } else {
    const title = document.createElement("div");
    title.className = "team";
    title.textContent = eventTitle || homeName || awayName || "Event";
    teams.append(title);
  }

  const status = document.createElement("div");
  status.className = "match-status";
  status.textContent = getStatus(match);

  const button = document.createElement("button");
  button.className = "watch-button";

  const embedUrl = safeEmbedUrl(match);

  button.textContent = embedUrl ? "▶ Watch event" : "Stream unavailable";
  button.disabled = !embedUrl;

  button.addEventListener("click", () => {
    player.src = embedUrl;
    document.querySelector("#playerTitle").textContent =
      homeName && awayName
        ? `${homeName} vs ${awayName}`
        : eventTitle || homeName || awayName || "Watch event";

    playerSection.hidden = false;
    playerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  article.append(sport, competition, teams, status, button);
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

updateSportsNav();
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
    if (!selectedSport) return true;

    return getSport(match).toLowerCase() === selectedSport.toLowerCase();
  });

  const visible = filtered.slice(0, page * pageSize);

  grid.replaceChildren(...visible.map(card));
  count.textContent =
    `${filtered.length} event${filtered.length === 1 ? "" : "s"}`;

  empty.hidden = filtered.length > 0;
  empty.textContent = "No events are available in this section right now.";
  loadMore.hidden = visible.length >= filtered.length;

  document.querySelector("#pageTitle").textContent =
    view === "live" ? "Live sports" : "Upcoming sports";

  document.querySelector("#sectionTitle").textContent =
    selectedSport || (view === "live" ? "Live now" : "Upcoming events");
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    view = button.dataset.view;
    selectedSport = "";
    page = 1;
    document.querySelectorAll(".nav").forEach(nav =>
      nav.classList.toggle("active", nav === button)
    );
    loadMatches();
    document.querySelector(".sidebar").classList.remove("open");
  });
});

function updateSportsNav() {
  const sportsNav = document.querySelector("#sportsNav");
  const sports = [...new Set(allMatches.map(getSport))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  sportsNav.replaceChildren();

  for (const sportName of sports) {
    const button = document.createElement("button");
    button.className = "nav league";
    button.textContent = sportName;

    button.addEventListener("click", () => {
      selectedSport = sportName;
      page = 1;

      document.querySelectorAll(".nav").forEach(nav =>
        nav.classList.toggle("active", nav === button)
      );

      renderMatches();
      document.querySelector(".sidebar").classList.remove("open");
    });

    sportsNav.append(button);
  }
} forEach(button => {
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
