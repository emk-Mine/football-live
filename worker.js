
const API = "https://matchora.to/api/v1";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/live") {
      return fetchFootball(`${API}/live`);
    }

    if (url.pathname === "/api/schedule") {
      const date = url.searchParams.get("date");

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json(
          { error: "A valid date is required." },
          { status: 400 }
        );
      }

      return fetchFootball(
        `${API}/schedule?date=${date}&watchable=1`
      );
    }

    return env.ASSETS.fetch(request);
  }
};

async function fetchFootball(apiUrl) {
  try {
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return Response.json(
        { error: `Match provider returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    const events = Array.isArray(data)
      ? data
      : Array.isArray(data.events)
        ? data.events
        : Array.isArray(data.body)
          ? data.body
          : [];

    const football = events.filter(match => {
      const sport = String(match.sport || "").toLowerCase();
      return sport === "football" || sport === "soccer";
    });

    return Response.json(
      { events: football },
      {
        headers: {
          "Cache-Control": "public, max-age=15"
        }
      }
    );
  } catch {
    return Response.json(
      { error: "Unable to load matches. Please try again." },
      { status: 502 }
    );
  }
}
