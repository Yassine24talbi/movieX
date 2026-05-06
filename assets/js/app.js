(function () {
  const api = window.MovieEndpoints;
  const heroBackdrop = document.querySelector(".hero-backdrop");
  const heroTitle = document.getElementById("hero-title");
  const heroMeta = document.getElementById("hero-meta");
  const heroPlot = document.getElementById("hero-plot");
  const heroWatch = document.getElementById("hero-watch");
  const heroDetails = document.getElementById("hero-details");
  const heroContent = document.querySelector(".hero-content");
  const featuredTrack = document.getElementById("featured-track");
  const movieTrack = document.getElementById("movie-track");
  const seriesTrack = document.getElementById("series-track");
  const mixedTrack = document.getElementById("mixed-track");
  const searchForm = document.getElementById("nav-search");
  const searchInput = document.getElementById("home-search");
  const heroPrev = document.getElementById("hero-prev");
  const heroNext = document.getElementById("hero-next");
  const heroDots = document.getElementById("hero-dots");

  let heroItems = [];
  let heroIndex = 0;
  let heroTimer = null;

  function metaLine(title) {
    return [
      api.formatType(title.type),
      title.startYear || "N/A",
      title.rating?.aggregateRating ? `IMDb ${title.rating.aggregateRating}` : "New",
      title.genres.slice(0, 3).join(" / ")
    ].filter(Boolean).join("  |  ");
  }

  function cardTemplate(title) {
    return `
      <article class="poster-card">
        <a href="/details/?id=${api.escapeHtml(title.id)}" data-title-id="${api.escapeHtml(title.id)}">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}">
          <span class="poster-gradient"></span>
          <span class="poster-badge">${api.escapeHtml(api.formatType(title.type))}</span>
          <span class="poster-play">Play</span>
          <span class="poster-copy">
            <strong>${api.escapeHtml(title.primaryTitle)}</strong>
            <small>${api.escapeHtml(String(title.startYear || "N/A"))}</small>
          </span>
        </a>
      </article>
    `;
  }

  function wideCardTemplate(title) {
    return `
      <article class="wide-card">
        <a href="/details/?id=${api.escapeHtml(title.id)}" data-title-id="${api.escapeHtml(title.id)}">
          <img src="${api.getImageUrl(title)}" alt="${api.escapeHtml(title.primaryTitle)}">
          <div>
            <p>${api.escapeHtml(api.formatType(title.type))}</p>
            <h3>${api.escapeHtml(title.primaryTitle)}</h3>
            <span>${api.escapeHtml(metaLine(title))}</span>
          </div>
        </a>
      </article>
    `;
  }

  function setHero(index) {
    if (!heroItems.length) {
      return;
    }

    heroIndex = (index + heroItems.length) % heroItems.length;
    const title = heroItems[heroIndex];
    heroContent.classList.add("is-switching");
    heroBackdrop.classList.add("is-switching");

    window.setTimeout(() => {
      heroTitle.textContent = title.primaryTitle;
      heroMeta.textContent = metaLine(title);
      heroPlot.textContent = title.plot;
      heroBackdrop.style.backgroundImage = `url("${api.getImageUrl(title)}")`;
      heroWatch.href = api.buildWatchPageUrl(title);
      heroDetails.href = `/details/?id=${encodeURIComponent(title.id)}`;
      renderHeroDots();

      window.requestAnimationFrame(() => {
        heroContent.classList.remove("is-switching");
        heroBackdrop.classList.remove("is-switching");
      });
    }, 170);
  }

  function renderTrack(track, titles, template = cardTemplate) {
    if (!titles.length) {
      track.innerHTML = `<div class="empty-state compact-empty">No 2026 titles with posters loaded for this row.</div>`;
      return;
    }

    track.innerHTML = titles.map(template).join("");
    track.querySelectorAll(".poster-card, .wide-card").forEach((card, index) => {
      card.style.setProperty("--enter-delay", `${Math.min(index * 36, 360)}ms`);
    });
    track.querySelectorAll("[data-title-id]").forEach((link) => {
      link.addEventListener("click", () => api.saveSelectedTitle(link.dataset.titleId));
    });
    track.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.src = api.imageFallback;
      }, { once: true });
    });
  }

  function renderSkeleton(track, count = 8, isWide = false) {
    track.innerHTML = Array.from({ length: count }, () => (
      `<article class="${isWide ? "wide-card" : "poster-card"} skeleton-card" aria-hidden="true"></article>`
    )).join("");
  }

  function renderHeroDots() {
    heroDots.innerHTML = heroItems.map((_, index) => (
      `<button class="hero-dot${index === heroIndex ? " is-active" : ""}" type="button" data-hero-index="${index}" aria-label="Show featured title ${index + 1}"></button>`
    )).join("");

    heroDots.querySelectorAll("[data-hero-index]").forEach((button) => {
      button.addEventListener("click", () => {
        setHero(Number(button.dataset.heroIndex));
        resetHeroTimer();
      });
    });
  }

  function resetHeroTimer() {
    if (heroTimer) {
      window.clearInterval(heroTimer);
    }
    heroTimer = window.setInterval(() => setHero(heroIndex + 1), 6500);
  }

  function attachRailButtons() {
    document.querySelectorAll("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const track = document.getElementById(button.dataset.scrollTarget);
        const direction = Number(button.dataset.scroll || 1);
        track.scrollBy({ left: direction * Math.round(track.clientWidth * 0.85), behavior: "smooth" });
      });
    });
  }

  function attachSearch() {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `/browse/?q=${encodeURIComponent(query)}`;
      }
    });
  }

  function attachHeroControls() {
    heroPrev.addEventListener("click", () => {
      setHero(heroIndex - 1);
      resetHeroTimer();
    });
    heroNext.addEventListener("click", () => {
      setHero(heroIndex + 1);
      resetHeroTimer();
    });
  }

  async function init() {
    renderSkeleton(featuredTrack, 10);
    renderSkeleton(movieTrack, 10);
    renderSkeleton(seriesTrack, 10);
    renderSkeleton(mixedTrack, 5, true);

    const [movies, series] = await Promise.all([
      api.getRandomTitles("MOVIE", 2026, 18),
      api.getRandomTitles("TV_SERIES", 2026, 18)
    ]);
    const mixed = [...movies.slice(0, 8), ...series.slice(0, 8)].sort(() => Math.random() - 0.5);

    heroItems = mixed.slice(0, 6);
    if (heroItems.length) {
      setHero(0);
      resetHeroTimer();
    } else {
      heroTitle.textContent = "No 2026 posters loaded";
      heroMeta.textContent = "";
      heroPlot.textContent = "Try the search page while the 2026 list catches up with more poster-ready titles.";
    }

    renderTrack(featuredTrack, mixed.slice(0, 10));
    renderTrack(movieTrack, movies);
    renderTrack(seriesTrack, series);
    renderTrack(mixedTrack, mixed.slice(4), wideCardTemplate);
    attachRailButtons();
    attachSearch();
    attachHeroControls();
  }

  init();
})();
