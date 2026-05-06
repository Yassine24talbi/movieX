(function () {
  const api = window.MovieEndpoints;
  const root = document.getElementById("details-root");

  function list(items) {
    return items.filter(Boolean).map((item) => `<li>${api.escapeHtml(item)}</li>`).join("");
  }

  function people(items) {
    return list(items.map((person) => person.displayName || person.name?.displayName || person.person?.displayName));
  }

  function cardTemplate(title) {
    return `
      <article class="poster-card">
        <a href="/details/?id=${api.escapeHtml(title.id)}" data-title-id="${api.escapeHtml(title.id)}">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}">
          <span class="poster-gradient"></span>
          <span class="poster-play">Open</span>
          <span class="poster-copy">
            <strong>${api.escapeHtml(title.primaryTitle)}</strong>
            <small>${api.escapeHtml(String(title.startYear || "N/A"))}</small>
          </span>
        </a>
      </article>
    `;
  }

  function metaLine(title) {
    return [
      api.formatType(title.type),
      title.startYear || "N/A",
      api.formatRuntime(title.runtimeSeconds),
      title.rating?.aggregateRating ? `IMDb ${title.rating.aggregateRating}` : "Unrated"
    ].filter(Boolean).join("  |  ");
  }

  function attachBehavior() {
    root.querySelectorAll("[data-title-id]").forEach((link) => {
      link.addEventListener("click", () => api.saveSelectedTitle(link.dataset.titleId));
    });
    root.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.src = api.imageFallback;
      }, { once: true });
    });
  }

  async function init() {
    const titleId = api.getSelectedTitleId();
    api.saveSelectedTitle(titleId);
    const bundle = await api.getTitleBundle(titleId);
    const { title, credits, seasons } = bundle;
    const suggestions = await api.getSuggestions(title, 10);
    const directors = title.directors.length ? people(title.directors) : people(credits.slice(0, 3));
    const stars = title.stars.length ? people(title.stars) : people(credits.slice(0, 8));

    root.innerHTML = `
      <section class="detail-hero">
        <div class="detail-poster">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}">
        </div>
        <div class="detail-copy">
          <p class="eyebrow">Title details</p>
          <h1>${api.escapeHtml(title.primaryTitle)}</h1>
          <p class="hero-meta">${api.escapeHtml(metaLine(title))}</p>
          <p class="hero-plot">${api.escapeHtml(title.plot)}</p>
          <ul class="pill-list">${list(title.genres)}</ul>
          <div class="hero-actions">
            <a class="button button-primary" href="${api.buildWatchPageUrl(title)}">Play</a>
            <a class="button button-secondary" href="/browse/">Search more</a>
          </div>
        </div>
      </section>

      <section class="info-grid">
        <article class="info-panel">
          <p class="eyebrow">Cast</p>
          <h2>Stars</h2>
          <ul class="name-list">${stars || "<li>No cast loaded yet.</li>"}</ul>
        </article>
        <article class="info-panel">
          <p class="eyebrow">Crew</p>
          <h2>Directors</h2>
          <ul class="name-list">${directors || "<li>No crew loaded yet.</li>"}</ul>
        </article>
        <article class="info-panel">
          <p class="eyebrow">Info</p>
          <h2>Production</h2>
          <ul class="name-list">
            ${list(title.originCountries.map((country) => `Country: ${country.name}`))}
            ${list(title.spokenLanguages.map((language) => `Language: ${language.name}`))}
            ${api.isSeries(title.type) ? `<li>${seasons.length} season(s)</li>` : ""}
          </ul>
        </article>
      </section>

      <section class="rail-section">
        <div class="section-heading">
          <h2>Suggested next</h2>
        </div>
        <div class="poster-rail">
          ${suggestions.length ? suggestions.map(cardTemplate).join("") : `<div class="empty-state compact-empty">No 2026 poster-ready suggestions found for this title.</div>`}
        </div>
      </section>
    `;

    attachBehavior();
    root.querySelector(".detail-hero").style.setProperty("--detail-bg", `url("${api.getImageUrl(title)}")`);
  }

  init();
})();
