(function () {
  const api = window.MovieEndpoints;
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const grid = document.getElementById("catalog-grid");
  const label = document.getElementById("results-label");
  const reset = document.getElementById("reset-search");

  function cardTemplate(title) {
    return `
      <article class="poster-card">
        <a href="details.html?id=${api.escapeHtml(title.id)}" data-title-id="${api.escapeHtml(title.id)}">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}">
          <span class="poster-gradient"></span>
          <span class="poster-badge">${api.escapeHtml(api.formatType(title.type))}</span>
          <span class="poster-play">Open</span>
          <span class="poster-copy">
            <strong>${api.escapeHtml(title.primaryTitle)}</strong>
            <small>${api.escapeHtml([title.startYear || "N/A", title.genres.slice(0, 2).join(" / ")].filter(Boolean).join(" | "))}</small>
          </span>
        </a>
      </article>
    `;
  }

  function attachBehavior() {
    grid.querySelectorAll("[data-title-id]").forEach((link) => {
      link.addEventListener("click", () => api.saveSelectedTitle(link.dataset.titleId));
    });
    grid.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.src = api.imageFallback;
      }, { once: true });
    });
  }

  async function render(query) {
    label.textContent = query ? `Searching "${query}"...` : "Featured titles";
    const titles = query
      ? await api.searchTitles(query)
      : await api.getRandomTitles(new URLSearchParams(window.location.search).get("type") || "MOVIE", 2026, 20);

    label.textContent = query ? `Results for "${query}"` : "Featured titles";
    grid.innerHTML = titles.length
      ? titles.map(cardTemplate).join("")
      : `<div class="empty-state">No titles found. Try another search.</div>`;
    attachBehavior();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    window.history.replaceState({}, "", query ? `browse.html?q=${encodeURIComponent(query)}` : "browse.html");
    render(query);
  });

  reset.addEventListener("click", () => {
    input.value = "";
    window.history.replaceState({}, "", "browse.html");
    render("");
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
  input.value = initialQuery;
  render(initialQuery);
})();
