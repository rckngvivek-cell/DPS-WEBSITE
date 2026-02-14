(() => {
  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  const searchFilter = document.getElementById("searchFilter");
  const sortFilter = document.getElementById("sortFilter");
  const resetFilters = document.getElementById("resetFilters");
  const visibleCount = document.getElementById("visibleCount");

  const galleryWall = document.getElementById("galleryWall");

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxMeta = document.getElementById("lightboxMeta");
  const closeLightbox = document.getElementById("closeLightbox");
  const prevItem = document.getElementById("prevItem");
  const nextItem = document.getElementById("nextItem");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    document.body.classList.add("reduced-motion");
  }

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      primaryNav.classList.toggle("open", !expanded);
    });
  }

  const state = {
    allItems: [],
    filteredItems: [],
    lightboxIndex: -1
  };

  function toSortableDate(item) {
    if (!item || !item.date || item.date === "unknown") {
      return "0000-00-00";
    }
    return item.date;
  }

  function buildSearchHaystack(item) {
    return `${item.date || ""} ${item.source || ""} ${item.category || ""} ${item.quality || ""} ${item.orientation || ""}`
      .toLowerCase()
      .trim();
  }

  function applyFilters() {
    const query = String(searchFilter?.value || "").trim().toLowerCase();
    const sort = String(sortFilter?.value || "newest");

    let result = state.allItems;

    if (query.length > 0) {
      result = result.filter((item) => buildSearchHaystack(item).includes(query));
    } else {
      result = [...result];
    }

    if (sort === "newest") {
      result.sort((a, b) => toSortableDate(b).localeCompare(toSortableDate(a)));
    } else if (sort === "oldest") {
      result.sort((a, b) => toSortableDate(a).localeCompare(toSortableDate(b)));
    } else if (sort === "random") {
      result.sort(() => Math.random() - 0.5);
    }

    state.filteredItems = result;
    renderGallery();
  }

  function addTileDepthEffect(tile) {
    if (prefersReducedMotion) {
      return;
    }

    let rafId = 0;

    tile.addEventListener("pointermove", (event) => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        const rect = tile.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        const rotateY = Math.max(-7.5, Math.min(7.5, nx * 7.5));
        const rotateX = Math.max(-7.5, Math.min(7.5, -ny * 7.5));
        tile.style.setProperty("--tile-rx", `${rotateX.toFixed(2)}deg`);
        tile.style.setProperty("--tile-ry", `${rotateY.toFixed(2)}deg`);
        tile.style.setProperty("--tile-z", "24px");

        const mx = ((event.clientX - rect.left) / rect.width) * 100;
        const my = ((event.clientY - rect.top) / rect.height) * 100;
        tile.style.setProperty("--tile-mx", `${mx.toFixed(1)}%`);
        tile.style.setProperty("--tile-my", `${my.toFixed(1)}%`);
      });
    });

    tile.addEventListener("pointerleave", () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      tile.style.setProperty("--tile-rx", "0deg");
      tile.style.setProperty("--tile-ry", "0deg");
      tile.style.setProperty("--tile-z", "0px");
      tile.style.setProperty("--tile-mx", "50%");
      tile.style.setProperty("--tile-my", "50%");
    });
  }

  function createTile(item, index) {
    const tile = document.createElement("figure");
    tile.className = "tile";
    tile.tabIndex = 0;
    tile.dataset.index = String(index);

    const image = document.createElement("img");
    image.src = item.src;
    image.alt = `DPS campus photo ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";

    const meta = document.createElement("div");
    meta.className = "tile-meta-badge";
    const dateText = item.date && item.date !== "unknown" ? item.date : "Date unknown";
    const categoryText = item.category ? String(item.category).toUpperCase() : "CAMPUS";
    meta.textContent = `${dateText} • ${categoryText}`;

    tile.appendChild(image);
    tile.appendChild(meta);

    const open = () => openLightbox(index);
    tile.addEventListener("click", open);
    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    addTileDepthEffect(tile);
    return tile;
  }

  const tileObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    },
    { threshold: 0.1 }
  );

  function renderGallery() {
    if (!galleryWall || !visibleCount) {
      return;
    }

    galleryWall.innerHTML = "";

    if (state.filteredItems.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No images match the current search.";
      galleryWall.appendChild(empty);
      visibleCount.textContent = "Visible items: 0";
      return;
    }

    state.filteredItems.forEach((item, index) => {
      const tile = createTile(item, index);
      galleryWall.appendChild(tile);
      tileObserver.observe(tile);
    });

    visibleCount.textContent = `Visible items: ${state.filteredItems.length}`;
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxImage || !lightboxCaption || !lightboxMeta) {
      return;
    }

    if (state.filteredItems.length === 0) {
      return;
    }

    state.lightboxIndex = (index + state.filteredItems.length) % state.filteredItems.length;
    const item = state.filteredItems[state.lightboxIndex];

    lightboxImage.src = item.src;
    lightboxImage.alt = `DPS campus photo ${state.lightboxIndex + 1}`;
    lightboxCaption.textContent = `Photo ${state.lightboxIndex + 1}`;
    lightboxMeta.textContent = `${item.date || "Unknown date"} • ${item.category || "campus"} • ${item.width || "?"}x${item.height || "?"}`;

    lightbox.showModal();
  }

  function moveLightbox(delta) {
    if (!lightbox?.open) {
      return;
    }
    openLightbox(state.lightboxIndex + delta);
  }

  if (closeLightbox) {
    closeLightbox.addEventListener("click", () => lightbox?.close());
  }
  if (prevItem) {
    prevItem.addEventListener("click", () => moveLightbox(-1));
  }
  if (nextItem) {
    nextItem.addEventListener("click", () => moveLightbox(1));
  }

  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      const rect = lightbox.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        lightbox.close();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!lightbox?.open) {
      return;
    }
    if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      moveLightbox(1);
    } else if (event.key === "Escape") {
      lightbox.close();
    }
  });

  function bindControlEvents() {
    sortFilter?.addEventListener("change", applyFilters);
    searchFilter?.addEventListener("input", applyFilters);

    resetFilters?.addEventListener("click", () => {
      if (searchFilter) {
        searchFilter.value = "";
      }
      if (sortFilter) {
        sortFilter.value = "newest";
      }
      applyFilters();
    });
  }

  async function loadManifest() {
    const response = await fetch("assets/gallery/gallery_manifest.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Failed to load gallery manifest.");
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid gallery manifest format.");
    }
    return data;
  }

  (async () => {
    try {
      const items = await loadManifest();
      state.allItems = items;
      bindControlEvents();
      applyFilters();
    } catch (error) {
      if (galleryWall) {
        galleryWall.innerHTML = '<div class="empty-state">Gallery manifest could not be loaded.</div>';
      }
      if (visibleCount) {
        visibleCount.textContent = "Visible items: 0";
      }
      console.error(error);
    }
  })();
})();
