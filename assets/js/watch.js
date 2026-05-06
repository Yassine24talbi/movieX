(function () {
  const api = window.MovieEndpoints;
  const header = document.getElementById("watch-header");
  const frame = document.getElementById("player-frame");
  const suggestionsRoot = document.getElementById("watch-suggestions");

  function cardTemplate(title) {
    return `
      <article class="poster-card">
        <a href="${api.buildWatchPageUrl(title)}" data-title-id="${api.escapeHtml(title.id)}">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}">
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

  async function init() {
    const titleId = api.getSelectedTitleId();
    api.saveSelectedTitle(titleId);
    const bundle = await api.getTitleBundle(titleId);
    const { title } = bundle;
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

    frame.src = api.urls.watchUrl(title.id);
    window.history.replaceState({}, "", api.buildWatchPageUrl(title));
    suggestionsRoot.innerHTML = suggestions.length
      ? suggestions.map(cardTemplate).join("")
      : `<div class="empty-state compact-empty">No 2026 poster-ready suggestions found for this title.</div>`;
    attachSuggestions();
  }

  init();
})();
