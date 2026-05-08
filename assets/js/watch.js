(function () {
  const api = window.MovieEndpoints;
  const header = document.getElementById("watch-header");
  const frame = document.getElementById("player-frame");
  const controller = document.getElementById("series-controller");
  const seasonSelect = document.getElementById("season-select");
  const episodeSelect = document.getElementById("episode-select");
  const episodePrev = document.getElementById("episode-prev");
  const episodeNext = document.getElementById("episode-next");
  const suggestionsRoot = document.getElementById("watch-suggestions");

  function cardTemplate(title) {
    return `
      <article class="poster-card">
        <a href="${api.buildWatchPageUrl(title)}" data-title-id="${api.escapeHtml(title.id)}">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}" loading="lazy" decoding="async">
          <span class="poster-gradient"></span>
          <span class="poster-play">Play</span>
          <span class="poster-copy">
            <strong>${api.escapeHtml(title.primaryTitle)}</strong>
            <small>${api.escapeHtml(String(title.startYear || "N/A"))}</small>
          </span>
        </a>
      </article>
    `;
  }

  function setMeta(selector, attribute, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute(attribute, value);
    }
  }

  function setWatchSeo(title) {
    const year = title.startYear || "N/A";
    const pageTitle = `${title.primaryTitle} (${year}) - Watch Online | MovieX`;
    const description = `${title.primaryTitle} (${year}) streaming, cast, rating, trailer and details on MovieX.`;
    const canonicalUrl = `https://moviex.buzz/watch/?id=${encodeURIComponent(title.id)}`;

    document.title = pageTitle;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:description"]', "content", "Watch movies and series online");
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);
  }

  function attachSuggestions() {
    suggestionsRoot.querySelectorAll("[data-title-id]").forEach((link) => {
      link.addEventListener("click", () => api.saveSelectedTitle(link.dataset.titleId));
    });
    suggestionsRoot.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.src = api.imageFallback;
      }, { once: true });
    });
  }

  function getSelection() {
    const params = new URLSearchParams(window.location.search);
    return {
      season: params.get("season") || "1",
      episode: params.get("episode") || "1"
    };
  }

  function getSeasonNumber(season, index) {
    return season.seasonNumber || season.number || season.season || index + 1;
  }

  function getEpisodeNumber(episode, index) {
    return episode.episodeNumber || episode.number || episode.episode || index + 1;
  }

  function updatePlayer(title, season, episode) {
    frame.src = api.urls.watchUrl(title.id, title.type, season, episode);
    window.history.replaceState({}, "", api.buildWatchPageUrl(title, season, episode));
  }

  function updateEpisodeButtons() {
    const currentIndex = episodeSelect.selectedIndex;
    const lastIndex = episodeSelect.options.length - 1;
    episodePrev.disabled = currentIndex <= 0;
    episodeNext.disabled = currentIndex < 0 || currentIndex >= lastIndex;
  }

  function goToEpisode(offset, title) {
    const nextIndex = episodeSelect.selectedIndex + offset;
    if (nextIndex < 0 || nextIndex >= episodeSelect.options.length) {
      return;
    }

    episodeSelect.selectedIndex = nextIndex;
    updatePlayer(title, seasonSelect.value, episodeSelect.value);
    updateEpisodeButtons();
  }

  function renderEpisodes(episodes) {
    episodeSelect.innerHTML = episodes.map((episode, index) => {
      const number = getEpisodeNumber(episode, index);
      const label = episode.primaryTitle || episode.title || `Episode ${number}`;
      return `<option value="${api.escapeHtml(String(number))}">${api.escapeHtml(`E${number} - ${label}`)}</option>`;
    }).join("");
  }

  async function setupSeriesController(title, seasons) {
    if (!api.isSeries(title.type)) {
      controller.hidden = true;
      frame.src = api.urls.watchUrl(title.id, title.type);
      window.history.replaceState({}, "", api.buildWatchPageUrl(title));
      return;
    }

    const selection = getSelection();
    const resolvedSeasons = seasons.length ? seasons : [{ seasonNumber: 1 }];
    controller.hidden = false;
    seasonSelect.innerHTML = resolvedSeasons.map((season, index) => {
      const number = getSeasonNumber(season, index);
      return `<option value="${api.escapeHtml(String(number))}">${api.escapeHtml(`Season ${number}`)}</option>`;
    }).join("");

    async function loadSeason(seasonNumber, preferredEpisode = "1") {
      const episodes = await api.getEpisodes(title.id, seasonNumber);
      const resolvedEpisodes = episodes.length ? episodes : [{ episodeNumber: 1, primaryTitle: "Episode 1" }];
      renderEpisodes(resolvedEpisodes);
      const availableEpisodes = Array.from(episodeSelect.options).map((option) => option.value);
      const episodeNumber = availableEpisodes.includes(String(preferredEpisode))
        ? String(preferredEpisode)
        : episodeSelect.value || "1";
      episodeSelect.value = episodeNumber;
      updatePlayer(title, seasonNumber, episodeNumber);
      updateEpisodeButtons();
    }

    seasonSelect.addEventListener("change", () => {
      loadSeason(seasonSelect.value, "1");
    });

    episodeSelect.addEventListener("change", () => {
      updatePlayer(title, seasonSelect.value, episodeSelect.value);
      updateEpisodeButtons();
    });

    episodePrev.addEventListener("click", () => {
      goToEpisode(-1, title);
    });

    episodeNext.addEventListener("click", () => {
      goToEpisode(1, title);
    });

    seasonSelect.value = Array.from(seasonSelect.options).some((option) => option.value === selection.season)
      ? selection.season
      : seasonSelect.value || "1";
    await loadSeason(seasonSelect.value, selection.episode);
  }

  async function init() {
    const titleId = api.getSelectedTitleId();
    api.saveSelectedTitle(titleId);
    const bundle = await api.getTitleBundle(titleId);
    const { title, seasons } = bundle;
    const suggestions = await api.getSuggestions(title, 10);
    setWatchSeo(title);

    header.innerHTML = `
      <div>
        <p class="eyebrow">Now playing</p>
        <h1>${api.escapeHtml(title.primaryTitle)}</h1>
        <p>${api.escapeHtml([api.formatType(title.type), title.startYear || "N/A", api.formatRuntime(title.runtimeSeconds)].join("  |  "))}</p>
      </div>
      <a class="button button-secondary" href="/details/?id=${api.escapeHtml(title.id)}">Details</a>
    `;

    await setupSeriesController(title, seasons);
    suggestionsRoot.innerHTML = suggestions.length
      ? suggestions.map(cardTemplate).join("")
      : `<div class="empty-state compact-empty">No 2026 poster-ready suggestions found for this title.</div>`;
    attachSuggestions();
  }

  init();
})();
