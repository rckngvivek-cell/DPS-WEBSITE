const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const progressFill = document.getElementById("progressFill");
const foundationMesh = document.getElementById("foundationMesh");
const corridorShell = document.querySelector(".corridor-shell");
const revealItems = Array.from(document.querySelectorAll(".reveal-item"));

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

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.24 }
);

revealItems.forEach((item) => observer.observe(item));

function updateProgressRail() {
  if (!progressFill || revealItems.length === 0) {
    return;
  }

  const visible = revealItems.filter((item) => item.classList.contains("is-visible")).length;
  const ratio = Math.min(visible / revealItems.length, 1);

  if (window.innerWidth <= 740) {
    progressFill.style.width = `${Math.round(ratio * 100)}%`;
    progressFill.style.height = "100%";
  } else {
    progressFill.style.height = `${Math.round(ratio * 100)}%`;
    progressFill.style.width = "100%";
  }
}

const progressObserver = new MutationObserver(updateProgressRail);
revealItems.forEach((item) => {
  progressObserver.observe(item, { attributes: true, attributeFilter: ["class"] });
});

window.addEventListener("resize", updateProgressRail);
updateProgressRail();

function initFoundationMesh() {
  if (!foundationMesh || !corridorShell || prefersReducedMotion) {
    return;
  }

  const ctx = foundationMesh.getContext("2d");
  if (!ctx) {
    return;
  }

  let width = 0;
  let height = 0;
  let device = 1;
  let particles = [];

  const buildParticle = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    r: Math.random() * 1.6 + 0.5,
    a: Math.random() * 0.28 + 0.08
  });

  function resize() {
    const rect = corridorShell.getBoundingClientRect();
    device = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    foundationMesh.width = Math.round(width * device);
    foundationMesh.height = Math.round(height * device);
    foundationMesh.style.width = `${width}px`;
    foundationMesh.style.height = `${height}px`;
    ctx.setTransform(device, 0, 0, device, 0, 0);

    const count = Math.max(18, Math.floor((width * height) / 42000));
    particles = Array.from({ length: count }, buildParticle);
  }

  function computeNodes() {
    const shellRect = corridorShell.getBoundingClientRect();
    return revealItems.map((item) => {
      const rect = item.getBoundingClientRect();
      return {
        x: rect.left - shellRect.left + rect.width * 0.5,
        y: rect.top - shellRect.top + rect.height * 0.5,
        hot: item.classList.contains("is-visible")
      };
    });
  }

  function draw(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, width, height);

    const nodes = computeNodes();

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) {
        p.vx *= -1;
      }
      if (p.y < 0 || p.y > height) {
        p.vy *= -1;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 184, 122, ${p.a})`;
      ctx.fill();
    });

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];

      if (i < nodes.length - 1) {
        const next = nodes[i + 1];
        const live = node.hot || next.hot;
        const alpha = live ? 0.56 : 0.18;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(154, 227, 200, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = node.hot ? "rgba(212, 184, 122, 0.95)" : "rgba(212, 184, 122, 0.42)";
      ctx.fill();
    }

    if (nodes.length > 1) {
      const idx = Math.floor(t * 0.55) % (nodes.length - 1);
      const a = nodes[idx];
      const b = nodes[idx + 1];
      const localT = (t * 0.55) % 1;
      const x = a.x + (b.x - a.x) * localT;
      const y = a.y + (b.y - a.y) * localT;
      ctx.beginPath();
      ctx.arc(x, y, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(212, 184, 122, 0.95)";
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  requestAnimationFrame(draw);
  window.addEventListener("resize", resize);
}

initFoundationMesh();

