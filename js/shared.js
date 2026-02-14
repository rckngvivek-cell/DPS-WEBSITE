(() => {
  const pageSequence = [
    { index: 1, name: "Home", file: "index.html" },
    { index: 2, name: "About", file: "about.html" },
    { index: 3, name: "Leadership", file: "leadership.html" },
    { index: 4, name: "Academics", file: "academics.html" },
    { index: 5, name: "Gallery", file: "gallery.html" },
    { index: 6, name: "Admissions", file: "admissions.html" },
    { index: 7, name: "Contact", file: "contact.html" },
    { index: 8, name: "Declaration", file: "declaration.html" }
  ];

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    document.body.classList.add("reduced-motion");
  }

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const fromPathIndex = pageSequence.findIndex((page) => page.file === currentPath);
  const datasetIndex = Number(document.body.dataset.hallIndex || 0);
  const currentIndex = datasetIndex > 0 ? datasetIndex - 1 : Math.max(fromPathIndex, 0);
  const currentPage = pageSequence[currentIndex] || pageSequence[0];

  function setActiveNavState() {
    const nav = document.getElementById("primaryNav");
    if (!nav) {
      return;
    }

    nav.querySelectorAll("a").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      const isActive = href === currentPage.file;
      if (isActive) {
        anchor.setAttribute("aria-current", "page");
      } else {
        anchor.removeAttribute("aria-current");
      }
    });
  }

  function initHeaderCondense() {
    const header = document.querySelector(".top-nav");
    if (!header) {
      return;
    }

    // Hysteresis + cooldown prevents flicker caused by layout shift when header height animates.
    const downThreshold = 180;
    const upThreshold = 90;
    const cooldownMs = 620;
    let ticking = false;
    let condensed = header.classList.contains("is-condensed");
    let lastY = window.scrollY || document.documentElement.scrollTop || 0;
    let lastToggleAt = 0;

    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const now = performance.now();
      const dy = y - lastY;
      const scrollingDown = dy > 0.5;
      const scrollingUp = dy < -0.5;
      const cooledDown = now - lastToggleAt > cooldownMs;

      if (!condensed && scrollingDown && y > downThreshold && cooledDown) {
        condensed = true;
        header.classList.add("is-condensed");
        lastToggleAt = now;
      } else if (condensed && (scrollingUp || y < 4) && y < upThreshold && cooledDown) {
        condensed = false;
        header.classList.remove("is-condensed");
        lastToggleAt = now;
      }

      lastY = y;
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) {
          return;
        }
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  }

  function initNavIndicator() {
    const nav = document.getElementById("primaryNav");
    if (!nav) {
      return;
    }

    nav.classList.add("has-indicator");

    let active =
      nav.querySelector('[aria-current="page"]') || nav.querySelector("a.active") || nav.querySelector("a");

    const setIndicator = (anchor) => {
      if (!anchor) {
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const linkRect = anchor.getBoundingClientRect();
      if (navRect.width <= 0 || linkRect.width <= 0) {
        return;
      }

      const left = linkRect.left - navRect.left + nav.scrollLeft;
      nav.style.setProperty("--nav-indicator-left", `${Math.max(0, left).toFixed(1)}px`);
      nav.style.setProperty("--nav-indicator-width", `${Math.max(0, linkRect.width).toFixed(1)}px`);
      nav.style.setProperty("--nav-indicator-opacity", "1");
    };

    const refreshActive = () => {
      active = nav.querySelector('[aria-current="page"]') || nav.querySelector("a.active") || active;
      setIndicator(active);
    };

    nav.querySelectorAll("a").forEach((anchor) => {
      anchor.addEventListener("mouseenter", () => setIndicator(anchor));
      anchor.addEventListener("focus", () => setIndicator(anchor));
    });

    nav.addEventListener("mouseleave", refreshActive);

    const navToggle = document.getElementById("navToggle");
    if (navToggle) {
      navToggle.addEventListener("click", () => window.requestAnimationFrame(refreshActive));
    }

    window.addEventListener("resize", () => window.requestAnimationFrame(refreshActive));
    refreshActive();
  }

  function initAmbientBackdrop() {
    if (document.getElementById("sharedAmbientCanvas")) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "sharedAmbientCanvas";
    canvas.className = "shared-ambient-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let width = 0;
    let height = 0;
    let device = 1;
    let particles = [];
    let rafId = 0;

    const buildParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.6 + 0.45,
      alpha: Math.random() * 0.42 + 0.12
    });

    function resize() {
      device = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.round(width * device);
      canvas.height = Math.round(height * device);
      ctx.setTransform(device, 0, 0, device, 0, 0);

      const count = Math.max(28, Math.floor((width * height) / 19000));
      const capped = Math.min(86, count);
      particles = Array.from({ length: capped }, buildParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width * 0.52, height * 0.38, 0, width * 0.52, height * 0.38, Math.max(width, height) * 0.8);
      glow.addColorStop(0, "rgba(198, 167, 94, 0.08)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) {
          p.vx *= -1;
        }
        if (p.y < 0 || p.y > height) {
          p.vy *= -1;
        }
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 140) {
            continue;
          }

          const alpha = (1 - distance / 140) * 0.15;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(154, 227, 200, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(198, 167, 94, ${p.alpha.toFixed(3)})`;
        ctx.fill();
      });

      rafId = window.requestAnimationFrame(draw);
    }

    resize();

    if (!prefersReducedMotion) {
      draw();
    } else {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(198, 167, 94, 0.2)";
        ctx.fill();
      });
    }

    window.addEventListener("resize", resize);
    window.addEventListener(
      "beforeunload",
      () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
      },
      { once: true }
    );
  }

  function buildHud() {
    const hud = document.createElement("aside");
    hud.className = "shared-hud";
    hud.innerHTML = `
      <div class="shared-hud-head">
        <div class="shared-hud-head-main">
          <p class="shared-hud-title">DPS Campus Navigator</p>
          <p class="shared-hud-page">Page ${currentPage.index}/8 - ${currentPage.name}</p>
        </div>
        <div class="shared-hud-head-controls">
          <p class="shared-hud-shortcuts">Alt + Left / Right</p>
          <button type="button" class="shared-hud-toggle" id="sharedHudToggle" aria-controls="sharedHudBody" aria-expanded="true">Hide</button>
        </div>
      </div>
      <div class="shared-hud-body" id="sharedHudBody">
        <div class="shared-progress-track" aria-hidden="true">
          <span class="shared-progress-value" style="width:${(currentPage.index / 8) * 100}%"></span>
        </div>
        <div class="shared-hud-actions">
          <a href="${pageSequence[(currentIndex - 1 + pageSequence.length) % pageSequence.length].file}" data-transition="true">Previous</a>
          <a href="${pageSequence[(currentIndex + 1) % pageSequence.length].file}" data-transition="true">Next</a>
          <button type="button" id="sharedQuickJump">Jump</button>
        </div>
      </div>
    `;

    document.body.appendChild(hud);

    const hudToggle = hud.querySelector("#sharedHudToggle");
    const minimizedKey = "dps_hud_minimized_v1";

    const setMinimized = (minimized) => {
      hud.classList.toggle("is-minimized", minimized);
      if (hudToggle) {
        hudToggle.textContent = minimized ? "Show" : "Hide";
        hudToggle.setAttribute("aria-expanded", String(!minimized));
      }
      try {
        localStorage.setItem(minimizedKey, minimized ? "1" : "0");
      } catch {
        // no-op
      }
    };

    try {
      const stored = localStorage.getItem(minimizedKey);
      if (stored === "1") {
        setMinimized(true);
      }
    } catch {
      // no-op
    }

    if (hudToggle) {
      hudToggle.addEventListener("click", () => setMinimized(!hud.classList.contains("is-minimized")));
    }

    const jumpButton = hud.querySelector("#sharedQuickJump");
    if (jumpButton) {
      jumpButton.addEventListener("click", () => {
        const options = pageSequence.map((page) => `${page.index}. ${page.name}`).join("\n");
        const response = window.prompt(`Jump to page (1-8):\n${options}`, String(currentPage.index));
        const index = Number(response);
        if (!Number.isInteger(index) || index < 1 || index > 8) {
          return;
        }
        transitionTo(pageSequence[index - 1].file);
      });
    }
  }

  function createTransitionOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "page-transition-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
  }

  function shouldHandleLink(anchor) {
    if (!anchor) {
      return false;
    }

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return false;
    }

    if (anchor.target === "_blank") {
      return false;
    }

    try {
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin && url.pathname.endsWith(".html");
    } catch {
      return false;
    }
  }

  function transitionTo(targetHref) {
    document.body.classList.add("page-transitioning");
    window.setTimeout(() => {
      window.location.href = targetHref;
    }, 190);
  }

  function initLinkTransitions() {
    document.querySelectorAll("a[href]").forEach((anchor) => {
      if (!shouldHandleLink(anchor)) {
        return;
      }

      anchor.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        const href = anchor.getAttribute("href");
        if (!href || href === currentPath) {
          return;
        }

        event.preventDefault();
        transitionTo(href);
      });

      anchor.addEventListener("mouseenter", () => {
        try {
          const href = anchor.getAttribute("href");
          if (!href) {
            return;
          }

          fetch(href, { method: "GET", credentials: "same-origin" }).catch(() => {});
        } catch {
          // no-op
        }
      });
    });
  }

  function initKeyboardNavigation() {
    document.addEventListener("keydown", (event) => {
      if (!event.altKey) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        transitionTo(pageSequence[(currentIndex + 1) % pageSequence.length].file);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        transitionTo(pageSequence[(currentIndex - 1 + pageSequence.length) % pageSequence.length].file);
      }
    });
  }

  function initImageFallbacks() {
    const placeholderSvg = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#10211c"/><rect x="12" y="12" width="616" height="336" fill="none" stroke="#c6a75e" stroke-width="2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#d4b87a" font-size="22" font-family="Arial">Institutional Media Placeholder</text></svg>'
    );
    const placeholder = `data:image/svg+xml;charset=UTF-8,${placeholderSvg}`;

    document.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        img.classList.add("media-fallback");
        img.src = placeholder;
      });

      img.setAttribute("decoding", "async");
    });
  }

  function registerServiceWorker() {
    const supports = "serviceWorker" in navigator;
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!supports || !isSecure) {
      return;
    }

    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  function init() {
    setActiveNavState();
    initAmbientBackdrop();
    initHeaderCondense();
    initNavIndicator();
    createTransitionOverlay();
    buildHud();
    initLinkTransitions();
    initKeyboardNavigation();
    initImageFallbacks();
    registerServiceWorker();
  }

  init();
})();
