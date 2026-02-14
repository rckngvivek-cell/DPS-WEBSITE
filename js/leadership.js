const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const podiums = Array.from(document.querySelectorAll(".podium"));
const focusPanel = document.getElementById("focusPanel");
const focusOrb = document.getElementById("focusOrb");
const prevMessage = document.getElementById("prevMessage");
const nextMessage = document.getElementById("nextMessage");
const councilRadar = document.getElementById("councilRadar");
const councilShell = document.getElementById("councilShell");

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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const escaped = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return escaped[char] || char;
  });
}

function buildWordSpans(message) {
  const words = String(message)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words
    .map((word, index) => `<span class="word" style="transition-delay:${index * 34}ms">${escapeHtml(word)}</span>`)
    .join(" ");
}

let activeIndex = 0;
let cycleTimer = null;

function positionOrb(target) {
  if (!focusOrb || !councilShell || !target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const shellRect = councilShell.getBoundingClientRect();
  focusOrb.style.left = `${rect.left - shellRect.left + rect.width / 2}px`;
  focusOrb.style.top = `${rect.top - shellRect.top + rect.height / 2}px`;
}

function renderFocus(index) {
  if (podiums.length === 0 || !focusPanel) {
    return;
  }

  const safeIndex = (index + podiums.length) % podiums.length;
  const activePodium = podiums[safeIndex];
  activeIndex = safeIndex;

  podiums.forEach((podium, idx) => {
    const isActive = idx === safeIndex;
    podium.classList.toggle("active", isActive);
    podium.setAttribute("aria-selected", String(isActive));
    podium.tabIndex = isActive ? 0 : -1;
  });

  const role =
    activePodium.dataset.role ||
    activePodium.querySelector(".podium-role")?.textContent ||
    "Leadership";
  const title = activePodium.querySelector("h2")?.textContent || `${role} Message`;
  const message = activePodium.querySelector(".podium-message")?.textContent || "";
  const imgSrc =
    activePodium.querySelector(".podium-photo")?.getAttribute("src") || "assets/brand/logo-mark.png";
  const points = String(activePodium.dataset.points || "")
    .split("|")
    .map((point) => point.trim())
    .filter(Boolean)
    .slice(0, 4);

  const pointsHtml = points.length
    ? `<ul class="focus-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`
    : "";

  const messageHtml = prefersReducedMotion
    ? `<p class="focus-message">${escapeHtml(message)}</p>`
    : `<p class="focus-message">${buildWordSpans(message)}</p>`;

  focusPanel.innerHTML = `
    <div class="focus-panel-rail">
      <p class="focus-kicker">Leadership Broadcast</p>
      <p class="focus-signal">Signal ${safeIndex + 1} / ${podiums.length}</p>
    </div>
    <div class="focus-main">
      <div class="focus-photo" aria-hidden="true">
        <img src="${escapeHtml(imgSrc)}" alt="" loading="lazy">
      </div>
      <div class="focus-copy">
        <div class="focus-badges">
          <span class="focus-role-badge">${escapeHtml(role)}</span>
          <span class="focus-status">Status: Active</span>
        </div>
        <h2>${escapeHtml(title)}</h2>
        ${messageHtml}
        ${pointsHtml}
      </div>
    </div>
  `;

  focusPanel.classList.remove("is-switching");
  void focusPanel.offsetWidth;
  focusPanel.classList.add("is-switching");

  if (!prefersReducedMotion) {
    window.requestAnimationFrame(() => {
      focusPanel.querySelectorAll(".word").forEach((span) => span.classList.add("visible"));
    });
  }

  positionOrb(activePodium);
}

function startCycle() {
  if (prefersReducedMotion || podiums.length < 2) {
    return;
  }

  stopCycle();
  cycleTimer = window.setInterval(() => {
    renderFocus(activeIndex + 1);
  }, 7800);
}

function stopCycle() {
  if (!cycleTimer) {
    return;
  }

  window.clearInterval(cycleTimer);
  cycleTimer = null;
}

function initPodiumInteractions() {
  podiums.forEach((podium, index) => {
    podium.addEventListener("click", () => {
      stopCycle();
      renderFocus(index);
      startCycle();
    });

    podium.addEventListener("focus", () => {
      stopCycle();
      renderFocus(index);
    });

    if (!prefersReducedMotion) {
      podium.addEventListener("pointermove", (event) => {
        const rect = podium.getBoundingClientRect();
        const mx = ((event.clientX - rect.left) / rect.width) * 100;
        const my = ((event.clientY - rect.top) / rect.height) * 100;
        podium.style.setProperty("--podium-mx", `${mx.toFixed(1)}%`);
        podium.style.setProperty("--podium-my", `${my.toFixed(1)}%`);
      });

      podium.addEventListener("pointerleave", () => {
        podium.style.setProperty("--podium-mx", "50%");
        podium.style.setProperty("--podium-my", "50%");
      });
    }

    podium.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        stopCycle();
        renderFocus(activeIndex + 1);
        podiums[activeIndex].focus();
        startCycle();
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        stopCycle();
        renderFocus(activeIndex - 1);
        podiums[activeIndex].focus();
        startCycle();
      }
    });
  });
}

function initChamberTilt() {
  if (!councilShell || prefersReducedMotion) {
    return;
  }

  const maxTilt = 6.5;
  let rafId = 0;
  let lastX = 0;
  let lastY = 0;

  const applyTilt = () => {
    rafId = 0;
    const rect = councilShell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const nx = (lastX - rect.left) / rect.width - 0.5;
    const ny = (lastY - rect.top) / rect.height - 0.5;
    const tiltY = Math.max(-maxTilt, Math.min(maxTilt, nx * maxTilt * 1.4));
    const tiltX = Math.max(-maxTilt, Math.min(maxTilt, -ny * maxTilt * 1.4));

    councilShell.style.setProperty("--chamber-tilt-x", `${tiltX.toFixed(2)}deg`);
    councilShell.style.setProperty("--chamber-tilt-y", `${tiltY.toFixed(2)}deg`);
  };

  councilShell.addEventListener("pointermove", (event) => {
    lastX = event.clientX;
    lastY = event.clientY;
    if (rafId) {
      return;
    }
    rafId = window.requestAnimationFrame(applyTilt);
  });

  councilShell.addEventListener("pointerleave", () => {
    councilShell.style.setProperty("--chamber-tilt-x", "0deg");
    councilShell.style.setProperty("--chamber-tilt-y", "0deg");
  });
}

if (prevMessage) {
  prevMessage.addEventListener("click", () => {
    stopCycle();
    renderFocus(activeIndex - 1);
    startCycle();
  });
}

if (nextMessage) {
  nextMessage.addEventListener("click", () => {
    stopCycle();
    renderFocus(activeIndex + 1);
    startCycle();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) {
    return;
  }

  if (event.key === "ArrowRight") {
    stopCycle();
    renderFocus(activeIndex + 1);
    startCycle();
  }

  if (event.key === "ArrowLeft") {
    stopCycle();
    renderFocus(activeIndex - 1);
    startCycle();
  }
});

function initCouncilRadar() {
  if (!councilRadar || !councilShell || prefersReducedMotion) {
    return;
  }

  const ctx = councilRadar.getContext("2d");
  if (!ctx) {
    return;
  }

  let width = 0;
  let height = 0;
  let rafId = 0;

  function resize() {
    const rect = councilShell.getBoundingClientRect();
    const device = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    councilRadar.width = Math.round(width * device);
    councilRadar.height = Math.round(height * device);
    ctx.setTransform(device, 0, 0, device, 0, 0);
  }

  function draw(time) {
    const t = time / 1000;
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.77;
    const cy = height * 0.48;
    const radius = Math.min(width, height) * 0.26;

    ctx.lineWidth = 1;
    for (let r = radius * 0.25; r <= radius; r += radius * 0.25) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(154, 227, 200, 0.12)";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.strokeStyle = "rgba(212, 184, 122, 0.12)";
    ctx.stroke();

    const sweepAngle = t * 0.85;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.strokeStyle = "rgba(154, 227, 200, 0.34)";
    ctx.stroke();
    ctx.restore();

    const count = Math.max(1, podiums.length);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const isActive = i === activeIndex;
      const pulse = isActive ? 1 + Math.sin(t * 3.2) * 0.16 : 1;

      ctx.beginPath();
      ctx.arc(px, py, (isActive ? 5.4 : 3.2) * pulse, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "rgba(212, 184, 122, 0.95)" : "rgba(212, 184, 122, 0.45)";
      ctx.fill();

      if (isActive) {
        ctx.beginPath();
        ctx.arc(px, py, 12 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(212, 184, 122, 0.18)";
        ctx.stroke();
      }
    }

    rafId = window.requestAnimationFrame(draw);
  }

  resize();
  rafId = window.requestAnimationFrame(draw);
  window.addEventListener("resize", resize);
  window.addEventListener("beforeunload", () => window.cancelAnimationFrame(rafId), { once: true });
}

if (podiums.length > 0) {
  initPodiumInteractions();
  initChamberTilt();
  renderFocus(0);
  startCycle();

  window.addEventListener("resize", () => positionOrb(podiums[activeIndex]));
}

initCouncilRadar();
