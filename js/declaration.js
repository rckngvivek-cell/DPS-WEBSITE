const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const declaration = document.getElementById("declarationText");
const sealZone = document.getElementById("sealZone");
const printDeclaration = document.getElementById("printDeclaration");
const ambientCanvas = document.getElementById("ambientCanvas");

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

function revealDeclarationText() {
  const fullText = declaration.dataset.text || "";
  const words = fullText.split(" ");
  declaration.innerHTML = "";

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    declaration.appendChild(span);

    const delay = prefersReducedMotion ? 0 : index * 110;
    window.setTimeout(() => {
      span.classList.add("visible");
    }, delay);
  });

  const sealDelay = prefersReducedMotion ? 0 : words.length * 110 + 250;
  window.setTimeout(() => {
    sealZone.classList.add("show");
    sealZone.classList.add("stamp");
  }, sealDelay);
}

function initAmbientCanvas() {
  if (!ambientCanvas || prefersReducedMotion) {
    return;
  }

  const ctx = ambientCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const particles = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let rafId = 0;

  function resize() {
    const device = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(1, ambientCanvas.clientWidth);
    canvasHeight = Math.max(1, ambientCanvas.clientHeight);
    ambientCanvas.width = Math.round(canvasWidth * device);
    ambientCanvas.height = Math.round(canvasHeight * device);
    ctx.setTransform(device, 0, 0, device, 0, 0);
  }

  function createParticles() {
    particles.length = 0;
    const count = Math.max(28, Math.floor((canvasWidth * canvasHeight) / 17000));

    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        r: Math.random() * 1.6 + 0.45,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        alpha: Math.random() * 0.45 + 0.14
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > canvasWidth) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > canvasHeight) {
        particle.vy *= -1;
      }
    });

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > 130) {
          continue;
        }

        const alpha = (1 - distance / 130) * 0.16;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(154, 227, 200, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    particles.forEach((particle) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(198, 167, 94, ${particle.alpha})`;
      ctx.fill();
    });

    rafId = requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();
  window.addEventListener("resize", () => {
    resize();
    createParticles();
  });

  window.addEventListener("beforeunload", () => window.cancelAnimationFrame(rafId), { once: true });
}

printDeclaration.addEventListener("click", () => {
  window.print();
});

revealDeclarationText();
initAmbientCanvas();
