(function () {
  const apiBaseUrl = "https://api.imdbapi.dev";
  const playerBaseUrl = "https://vaplayer.ru/embed";
  const imageFallback =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1200'%3E%3Crect width='800' height='1200' fill='%23101014'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23f4f4f5' font-family='Arial, sans-serif' font-size='42'%3ENo%20Poster%3C/text%3E%3C/svg%3E";

  const fallbackCatalog = [
    { id: "tt26315487", type: "tvSeries" },
    { id: "tt0903747", type: "tvSeries" },
    { id: "tt4574334", type: "tvSeries" },
    { id: "tt0944947", type: "tvSeries" },
    { id: "tt0816692", type: "movie" },
    { id: "tt0133093", type: "movie" },
    { id: "tt0234215", type: "movie" },
    { id: "tt0242653", type: "movie" },
    { id: "tt0468569", type: "movie" },
    { id: "tt7286456", type: "movie" },
    { id: "tt1375666", type: "movie" },
    { id: "tt2861424", type: "tvSeries" },
    { id: "tt7366338", type: "tvMiniSeries" }
  ];
  const SUGGESTION_YEAR = 2026;
  const typeMap = {
    movie: "MOVIE",
    MOVIE: "MOVIE",
    tvSeries: "TV_SERIES",
    TV_SERIES: "TV_SERIES",
    tvMiniSeries: "TV_MINI_SERIES",
    TV_MINI_SERIES: "TV_MINI_SERIES",
    tvMovie: "TV_MOVIE",
    TV_MOVIE: "TV_MOVIE"
  };

  const urls = {
    randomTitles(type = "MOVIE", startYear = SUGGESTION_YEAR, endYear = startYear) {
      const params = new URLSearchParams({
        types: getApiType(type),
        startYear: String(startYear),
        endYear: String(endYear)
      });
      return `${apiBaseUrl}/titles?${params.toString()}`;
    },
    searchTitles(query) {
      return `${apiBaseUrl}/search/titles?query=${encodeURIComponent(query)}`;
    },
    titleInfo(titleId) {
      return `${apiBaseUrl}/titles/${encodeURIComponent(titleId)}`;
    },
    titleCredits(titleId) {
      return `${apiBaseUrl}/titles/${encodeURIComponent(titleId)}/credits`;
    },
    titleSeasons(titleId) {
      return `${apiBaseUrl}/titles/${encodeURIComponent(titleId)}/seasons`;
    },
    titleEpisodes(titleId, season) {
      const params = season ? `?season=${encodeURIComponent(String(season))}` : "";
      return `${apiBaseUrl}/titles/${encodeURIComponent(titleId)}/episodes${params}`;
    },
    watchUrl(titleId, type = "movie", season, episode) {
      if (isSeries(type)) {
        return `${playerBaseUrl}/tv/${encodeURIComponent(titleId)}/${encodeURIComponent(String(season || 1))}/${encodeURIComponent(String(episode || 1))}`;
      }

      return `${playerBaseUrl}/movie/${encodeURIComponent(titleId)}`;
    }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function isSeries(type) {
    return type === "tvSeries" || type === "tvMiniSeries" || type === "TV_SERIES" || type === "TV_MINI_SERIES";
  }

  function getApiType(type) {
    return typeMap[type] || "MOVIE";
  }

  function formatType(type) {
    if (!type) {
      return "Title";
    }
    const labels = {
      MOVIE: "Movie",
      TV_SERIES: "TV Series",
      TV_MINI_SERIES: "TV Mini Series",
      TV_MOVIE: "TV Movie"
    };
    if (labels[type]) {
      return labels[type];
    }
    return type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (value) => value.toUpperCase());
  }

  function formatRuntime(runtimeSeconds) {
    if (!runtimeSeconds) {
      return "Runtime unavailable";
    }
    const totalMinutes = Math.round(runtimeSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function getImageUrl(title) {
    const url = title?.primaryImage?.url || "";
    return url && !url.includes("images.unsplash.com") ? url : imageFallback;
  }

  function hasRealImage(title) {
    const url = title?.primaryImage?.url || "";
    return Boolean(url && !url.includes("images.unsplash.com"));
  }

  function hasRealTitle(title) {
    return Boolean(String(title?.primaryTitle || title?.originalTitle || "").trim());
  }

  function isRenderableTitle(title) {
    return Boolean(title?.id && hasRealTitle(title) && hasRealImage(title));
  }

  function normalizeTitle(seed = {}, payload = seed) {
    const imageSource = hasRealImage(payload) ? payload : seed;
    return {
      id: payload?.id || seed.id,
      type: payload?.type || seed.type || "movie",
      primaryTitle: payload?.primaryTitle || payload?.originalTitle || seed.primaryTitle || "",
      originalTitle: payload?.originalTitle || payload?.primaryTitle || seed.originalTitle || "",
      primaryImage: { url: getImageUrl(imageSource) },
      startYear: payload?.startYear || seed.startYear || null,
      runtimeSeconds: payload?.runtimeSeconds || null,
      genres: payload?.genres || seed.genres || [],
      rating: payload?.rating || {},
      plot: payload?.plot || "No plot is available for this title yet.",
      directors: payload?.directors || [],
      writers: payload?.writers || [],
      stars: payload?.stars || [],
      originCountries: payload?.originCountries || [],
      spokenLanguages: payload?.spokenLanguages || []
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  }

  function unwrapTitles(payload) {
    if (Array.isArray(payload?.titles)) {
      return payload.titles;
    }
    return Array.isArray(payload) ? payload : [];
  }

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  async function getTitle(titleId, seed = {}) {
    try {
      return normalizeTitle(seed, await fetchJson(urls.titleInfo(titleId)));
    } catch (error) {
      return normalizeTitle({ ...seed, id: titleId }, null);
    }
  }

  async function hydrateTitles(seeds, limit = seeds.length) {
    const hydrated = await Promise.all(seeds.filter((seed) => seed?.id).slice(0, limit).map((seed) => getTitle(seed.id, seed)));
    return hydrated.filter(isRenderableTitle);
  }

  async function getRandomTitles(type = "MOVIE", year = SUGGESTION_YEAR, limit = 18) {
    try {
      const payload = await fetchJson(urls.randomTitles(type, SUGGESTION_YEAR, SUGGESTION_YEAR));
      const titles = shuffle(unwrapTitles(payload))
        .filter(isRenderableTitle)
        .slice(0, limit)
        .map((title) => normalizeTitle(title, title));
      if (!titles.length) {
        throw new Error("No titles returned");
      }
      return titles;
    } catch (error) {
      return [];
    }
  }

  async function searchTitles(query) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) {
      return [];
    }

    try {
      const payload = await fetchJson(urls.searchTitles(cleanQuery));
      return unwrapTitles(payload).filter(isRenderableTitle).map((title) => normalizeTitle(title, title));
    } catch (error) {
      return [];
    }
  }

  async function getTitleBundle(titleId) {
    const title = await getTitle(titleId);
    const [creditsPayload, seasonsPayload] = await Promise.all([
      fetchJson(urls.titleCredits(titleId)).catch(() => ({ credits: [] })),
      isSeries(title.type) ? fetchJson(urls.titleSeasons(titleId)).catch(() => ({ seasons: [] })) : Promise.resolve({ seasons: [] })
    ]);

    return {
      title,
      credits: Array.isArray(creditsPayload.credits) ? creditsPayload.credits : Array.isArray(creditsPayload) ? creditsPayload : [],
      seasons: Array.isArray(seasonsPayload.seasons) ? seasonsPayload.seasons : Array.isArray(seasonsPayload) ? seasonsPayload : []
    };
  }

  async function getEpisodes(titleId, season) {
    try {
      const payload = await fetchJson(urls.titleEpisodes(titleId, season));
      return Array.isArray(payload.episodes) ? payload.episodes : Array.isArray(payload) ? payload : [];
    } catch (error) {
      return [];
    }
  }

  function buildWatchPageUrl(title, season, episode) {
    const params = new URLSearchParams({ id: title.id });
    if (isSeries(title.type)) {
      params.set("season", String(season || 1));
      params.set("episode", String(episode || 1));
    }
    return `/watch/?${params.toString()}`;
  }

  function saveSelectedTitle(titleId) {
    localStorage.setItem("movies-all-night-title", titleId);
  }

  function getSelectedTitleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || localStorage.getItem("movies-all-night-title") || fallbackCatalog[0].id;
  }

  function scoreSimilar(currentTitle, candidate) {
    const currentGenres = new Set(currentTitle.genres || []);
    let score = 0;
    score += (candidate.genres || []).filter((genre) => currentGenres.has(genre)).length * 14;
    if (candidate.type === currentTitle.type) {
      score += 8;
    }
    score += Math.max(0, 8 - Math.abs((candidate.startYear || 0) - (currentTitle.startYear || 0)));
    return score;
  }

  async function getSuggestions(currentTitle, limit = 8) {
    const type = isSeries(currentTitle.type) ? "TV_SERIES" : "MOVIE";
    const titles = await getRandomTitles(type, SUGGESTION_YEAR, 16);
    return titles
      .filter((title) => title.id !== currentTitle.id)
      .map((title) => ({ title, score: scoreSimilar(currentTitle, title) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.title);
  }

  window.MovieEndpoints = {
    apiBaseUrl,
    buildWatchPageUrl,
    escapeHtml,
    fallbackCatalog,
    formatRuntime,
    formatType,
    getEpisodes,
    getImageUrl,
    getRandomTitles,
    getSelectedTitleId,
    getSuggestions,
    getTitle,
    getTitleBundle,
    hydrateTitles,
    imageFallback,
    isRenderableTitle,
    isSeries,
    normalizeTitle,
    saveSelectedTitle,
    searchTitles,
    urls
  };
})();
