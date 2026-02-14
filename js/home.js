const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const hero = document.getElementById("hero");
const heroContent = document.getElementById("heroContent");
const heroImage = hero ? hero.querySelector(".hero-image") : null;
const heroRotationLabel = document.getElementById("heroRotationLabel");
const heroFutureLine = document.getElementById("heroFutureLine");
const heroSignalCanvas = document.getElementById("heroSignalCanvas");
const counters = Array.from(document.querySelectorAll("[data-counter]"));
const revealCards = Array.from(
  document.querySelectorAll(".command-card, #pillarBoard article, .journey-grid article, .status-strip article")
);
const commandCards = Array.from(document.querySelectorAll(".command-card"));

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

window.addEventListener("load", () => {
  document.body.classList.add("is-ready");
});

if (hero && heroContent && !prefersReducedMotion) {
  hero.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    const rotateY = Math.max(-4, Math.min(4, x * 5));
    const rotateX = Math.max(-4, Math.min(4, -y * 5));

    heroContent.style.transform = `translateY(0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  hero.addEventListener("pointerleave", () => {
    heroContent.style.transform = "translateY(0) rotateX(0deg) rotateY(0deg)";
  });
}

function rotateHeroImages() {
  if (!hero || !heroImage) {
    return;
  }

  const imageList = String(hero.dataset.heroImages || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (imageList.length <= 1) {
    return;
  }

  let activeIndex = Math.max(0, imageList.indexOf(heroImage.getAttribute("src") || ""));
  if (activeIndex >= imageList.length) {
    activeIndex = 0;
  }

  imageList.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  const updateLabel = () => {
    if (!heroRotationLabel) {
      return;
    }

    heroRotationLabel.textContent = `Campus View ${activeIndex + 1} of ${imageList.length}`;
  };

  updateLabel();

  window.setInterval(() => {
    activeIndex = (activeIndex + 1) % imageList.length;
    heroImage.classList.add("is-swapping");
    window.setTimeout(() => {
      heroImage.setAttribute("src", imageList[activeIndex]);
      updateLabel();
      heroImage.classList.remove("is-swapping");
    }, 220);
  }, 4200);
}

function initFutureSignals() {
  if (!heroFutureLine) {
    return;
  }

  const lines = [
    "Official Portal: Online",
    "Admissions Assistant: Ready",
    "Academics Overview: Available",
    "Photo Gallery: Updated",
    "Contact Desk: Reach Us"
  ];

  let index = 0;
  heroFutureLine.textContent = lines[index];

  if (prefersReducedMotion) {
    return;
  }

  const swapTo = (nextLine) => {
    heroFutureLine.classList.add("is-changing");
    window.setTimeout(() => {
      heroFutureLine.textContent = nextLine;
      heroFutureLine.classList.remove("is-changing");
    }, 210);
  };

  window.setInterval(() => {
    index = (index + 1) % lines.length;
    swapTo(lines[index]);
  }, 3200);
}

function initHeroSignalCanvas() {
  if (!heroSignalCanvas || prefersReducedMotion) {
    return;
  }

  const context = heroSignalCanvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let points = [];
  let rafId = 0;

  function makePoint() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.48,
      vy: (Math.random() - 0.5) * 0.48,
      r: Math.random() * 1.8 + 0.5
    };
  }

  function resize() {
    const rect = heroSignalCanvas.getBoundingClientRect();
    const device = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    heroSignalCanvas.width = Math.round(width * device);
    heroSignalCanvas.height = Math.round(height * device);
    context.setTransform(device, 0, 0, device, 0, 0);
    points = Array.from({ length: 30 }, makePoint);
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      point.x += point.vx;
      point.y += point.vy;

      if (point.x <= 0 || point.x >= width) {
        point.vx *= -1;
      }

      if (point.y <= 0 || point.y >= height) {
        point.vy *= -1;
      }

      context.beginPath();
      context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      context.fillStyle = "rgba(212, 184, 122, 0.72)";
      context.fill();

      for (let j = i + 1; j < points.length; j += 1) {
        const next = points[j];
        const dx = point.x - next.x;
        const dy = point.y - next.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 130) {
          const alpha = (1 - distance / 130) * 0.35;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(next.x, next.y);
          context.strokeStyle = `rgba(154, 227, 200, ${alpha.toFixed(3)})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }
    }

    rafId = window.requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
  window.addEventListener("beforeunload", () => window.cancelAnimationFrame(rafId), { once: true });
}

function animateCounter(element) {
  const target = Number(element.dataset.counter || 0);
  const duration = 1300;
  const start = performance.now();

  function step(timestamp) {
    const progress = Math.min((timestamp - start) / duration, 1);
    const value = Math.floor(progress * target);
    element.textContent = String(value);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = String(target);
    }
  }

  requestAnimationFrame(step);
}

function initCounters() {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.45 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

function initRevealCards() {
  revealCards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(18px)";
    card.style.transition = `opacity 700ms ease ${index * 50}ms, transform 700ms ease ${index * 50}ms`;
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.25 }
  );

  revealCards.forEach((card) => revealObserver.observe(card));
}

function initCommandCardTilt() {
  if (prefersReducedMotion) {
    return;
  }

  commandCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      card.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "rotateX(0deg) rotateY(0deg) translateY(0)";
    });
  });
}

rotateHeroImages();
initFutureSignals();
initHeroSignalCanvas();
initCounters();
initRevealCards();
initCommandCardTilt();
