(function () {
  const config = window.APP_CONFIG;
  const sampleTitles = window.SAMPLE_TITLES;

  function normalizeTitle(title) {
    const primaryImageUrl = title?.primaryImage?.url || "";
    const sanitizedImageUrl = primaryImageUrl.includes("images.unsplash.com") ? "" : primaryImageUrl;
    return {
      ...title,
      primaryImage: sanitizedImageUrl ? { ...title.primaryImage, url: sanitizedImageUrl } : { url: config.imageFallback },
      genres: title.genres || [],
      stars: title.stars || [],
      directors: title.directors || [],
      writers: title.writers || [],
      rating: title.rating || {},
      plot: title.plot || "No plot is available for this title yet."
    };
  }

  function getImageUrl(title) {
    return title?.primaryImage?.url || config.imageFallback;
  }

  function isSeries(type) {
    return ["tvSeries", "tvMiniSeries"].includes(type);
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

  function formatType(type) {
    if (!type) {
      return "Title";
    }

    return type
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (value) => value.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeTitleName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSignificantTokens(value) {
    const stopWords = new Set(["the", "a", "an", "and", "of", "in", "on", "to"]);
    return normalizeTitleName(value)
      .split(" ")
      .filter((token) => token && !stopWords.has(token));
  }

  function getRecommendationScore(currentTitle, candidate) {
    const currentName = normalizeTitleName(currentTitle.primaryTitle || currentTitle.originalTitle);
    const candidateName = normalizeTitleName(candidate.primaryTitle || candidate.originalTitle);
    const currentTokens = getSignificantTokens(currentTitle.primaryTitle || currentTitle.originalTitle);
    const candidateTokens = new Set(getSignificantTokens(candidate.primaryTitle || candidate.originalTitle));
    const currentGenres = new Set(currentTitle.genres || []);
    const sharedGenres = (candidate.genres || []).filter((genre) => currentGenres.has(genre));
    const primaryKeyword = currentTokens[0] || "";
    const secondaryKeyword = currentTokens[1] || "";
    let score = 0;

    if (currentName && candidateName.includes(currentName)) {
      score += 120;
    }

    if (primaryKeyword && candidateTokens.has(primaryKeyword)) {
      score += 55;
    }

    if (primaryKeyword && secondaryKeyword && candidateTokens.has(primaryKeyword) && candidateTokens.has(secondaryKeyword)) {
      score += 35;
    }

    score += sharedGenres.length * 12;

    if (candidate.type === currentTitle.type) {
      score += 6;
    }

    const yearGap = Math.abs((candidate.startYear || 0) - (currentTitle.startYear || 0));
    score += Math.max(0, 8 - Math.min(yearGap, 8));

    return score;
  }

  function getRecommendedTitles(currentTitle, limit = 4) {
    return sampleTitles
      .map(normalizeTitle)
      .filter((title) => title.id !== currentTitle.id)
      .map((title) => ({
        title,
        score: getRecommendationScore(currentTitle, title)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.title);
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.json();
  }

  async function searchTitles(query) {
    const cleanQuery = decodeURIComponent((query || "").trim());
    if (!cleanQuery) {
      return sampleTitles.map(normalizeTitle);
    }

    try {
      const url = `${config.apiBaseUrl}/search/titles?query=${encodeURIComponent(cleanQuery)}`;
      const payload = await fetchJson(url);
      const titles = Array.isArray(payload.titles) ? payload.titles : [];

      if (!titles.length) {
        throw new Error("Empty search results");
      }

      return titles.map(normalizeTitle);
    } catch (error) {
      const lowered = cleanQuery.toLowerCase();
      return sampleTitles
        .filter((title) => {
          const haystack = [
            title.primaryTitle,
            title.originalTitle,
            ...(title.genres || []),
            ...(title.stars || []).map((star) => star.displayName)
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(lowered);
        })
        .map(normalizeTitle);
    }
  }

  async function getTitle(titleId) {
    const fallback = sampleTitles.find((title) => title.id === titleId) || sampleTitles[0];

    if (!titleId) {
      return normalizeTitle(fallback);
    }

    try {
      const payload = await fetchJson(`${config.apiBaseUrl}/titles/${encodeURIComponent(titleId)}`);
      return normalizeTitle(payload);
    } catch (error) {
      return normalizeTitle(fallback);
    }
  }

  async function hydrateTitles(titles) {
    return Promise.all(
      titles.map(async (title) => {
        if (!title?.id) {
          return normalizeTitle(title);
        }

        return getTitle(title.id);
      })
    );
  }

  async function getTitleCredits(titleId) {
    try {
      const payload = await fetchJson(`${config.apiBaseUrl}/titles/${encodeURIComponent(titleId)}/credits`);
      return Array.isArray(payload.credits) ? payload.credits : Array.isArray(payload) ? payload : [];
    } catch (error) {
      return [];
    }
  }

  async function getTitleImages(titleId) {
    try {
      const payload = await fetchJson(`${config.apiBaseUrl}/titles/${encodeURIComponent(titleId)}/images`);
      return Array.isArray(payload.images) ? payload.images : Array.isArray(payload) ? payload : [];
    } catch (error) {
      return [];
    }
  }

  async function getTitleSeasons(titleId) {
    try {
      const payload = await fetchJson(`${config.apiBaseUrl}/titles/${encodeURIComponent(titleId)}/seasons`);
      return Array.isArray(payload.seasons) ? payload.seasons : Array.isArray(payload) ? payload : [];
    } catch (error) {
      return [];
    }
  }

  async function getTitleEpisodes(titleId, season) {
    try {
      const url = new URL(`${config.apiBaseUrl}/titles/${encodeURIComponent(titleId)}/episodes`);
      if (season) {
        url.searchParams.set("season", season);
      }
      const payload = await fetchJson(url.toString());
      return Array.isArray(payload.episodes) ? payload.episodes : Array.isArray(payload) ? payload : [];
    } catch (error) {
      return [];
    }
  }

  async function getTitleBundle(titleId) {
    const title = await getTitle(titleId);
    const [credits, images, seasons] = await Promise.all([
      getTitleCredits(titleId),
      getTitleImages(titleId),
      isSeries(title.type) ? getTitleSeasons(titleId) : Promise.resolve([])
    ]);

    let episodes = [];
    if (isSeries(title.type) && seasons.length) {
      const firstSeason = seasons[0];
      const seasonNumber = firstSeason.seasonNumber || firstSeason.number || 1;
      episodes = await getTitleEpisodes(titleId, seasonNumber);
    }

    return {
      title,
      credits,
      images,
      seasons,
      episodes
    };
  }

  function buildPlayerUrl(titleId, seasonNumber, episodeNumber) {
    if (seasonNumber && episodeNumber) {
      return `${config.playerBaseUrl}/${encodeURIComponent(titleId)}/${seasonNumber}/${episodeNumber}`;
    }

    return `${config.playerBaseUrl}/${encodeURIComponent(titleId)}`;
  }

  function buildEpisodePlayerUrl(titleId, seasonNumber, episodeNumber) {
    return buildPlayerUrl(titleId, seasonNumber, episodeNumber);
  }

  function buildWatchPageUrl(title, seasonNumber, episodeNumber) {
    const resolvedTitle = typeof title === "string"
      ? sampleTitles.find((item) => item.id === title) || { id: title, type: "" }
      : title;
    const params = new URLSearchParams({ id: resolvedTitle.id });

    if (isSeries(resolvedTitle.type) && seasonNumber && episodeNumber) {
      params.set("season", String(seasonNumber));
      params.set("episode", String(episodeNumber));
    }

    return `watch.html?${params.toString()}`;
  }

  function saveSelectedTitle(titleId) {
    localStorage.setItem("movies-all-night-title", titleId);
  }

  function getStoredTitleId() {
    return localStorage.getItem("movies-all-night-title");
  }

  function getTitleIdFromLocation() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || getStoredTitleId() || sampleTitles[0].id;
  }

  function getEpisodeSelectionFromLocation() {
    const params = new URLSearchParams(window.location.search);
    return {
      season: params.get("season"),
      episode: params.get("episode")
    };
  }

  window.MovieNightApi = {
    buildPlayerUrl,
    buildEpisodePlayerUrl,
    buildWatchPageUrl,
    escapeHtml,
    formatRuntime,
    formatType,
    getImageUrl,
    getStoredTitleId,
    getTitle,
    getTitleBundle,
    getTitleCredits,
    getTitleEpisodes,
    getTitleImages,
    getTitleIdFromLocation,
    getEpisodeSelectionFromLocation,
    hydrateTitles,
    getRecommendedTitles,
    getTitleSeasons,
    isSeries,
    normalizeTitleName,
    saveSelectedTitle,
    searchTitles,
    sampleTitles: sampleTitles.map(normalizeTitle)
  };
})();
