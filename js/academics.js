const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const buttons = Array.from(document.querySelectorAll(".dept-btn"));
const panels = Array.from(document.querySelectorAll(".dept-panel"));
const facultySearch = document.getElementById("facultySearch");
const facultyCount = document.getElementById("facultyCount");
const exportPanel = document.getElementById("exportPanel");
const cards = Array.from(document.querySelectorAll(".teacher-card"));

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

function getActivePanel() {
  return panels.find((panel) => panel.classList.contains("active"));
}

function updateVisibleCount() {
  const panel = getActivePanel();
  if (!panel || !facultyCount) {
    return;
  }

  const visibleCards = panel.querySelectorAll(".teacher-card:not(.hide-by-search)").length;
  facultyCount.textContent = `Visible faculty cards: ${visibleCards}`;
}

function applySearchFilter() {
  const query = String(facultySearch?.value || "").toLowerCase().trim();
  const panel = getActivePanel();
  if (!panel) {
    return;
  }

  panel.querySelectorAll(".teacher-card").forEach((card) => {
    const text = card.textContent.toLowerCase();
    const match = query.length === 0 || text.includes(query);
    card.classList.toggle("hide-by-search", !match);
  });

  updateVisibleCount();
}

function showDepartment(id, { focus } = { focus: true }) {
  buttons.forEach((button) => {
    const isActive = button.dataset.department === id;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === id);
  });

  applySearchFilter();

  const activePanel = panels.find((panel) => panel.id === id);
  if (activePanel && focus && window.innerWidth <= 920) {
    activePanel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }
}

buttons.forEach((button, index) => {
  button.addEventListener("click", () => {
    showDepartment(button.dataset.department);
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const next = (index + 1) % buttons.length;
      buttons[next].focus();
      showDepartment(buttons[next].dataset.department, { focus: false });
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = (index - 1 + buttons.length) % buttons.length;
      buttons[prev].focus();
      showDepartment(buttons[prev].dataset.department, { focus: false });
    }
  });
});

if (facultySearch) {
  facultySearch.addEventListener("input", applySearchFilter);
}

if (exportPanel) {
  exportPanel.addEventListener("click", () => {
    const panel = getActivePanel();
    if (!panel) {
      return;
    }

    const title = panel.dataset.title || panel.id;
    const entries = Array.from(panel.querySelectorAll(".teacher-card:not(.hide-by-search)"))
      .map((card) => card.textContent.replace(/\s+/g, " ").trim())
      .join("\n\n");

    const payload = `Department: ${title}\n\n${entries || "No visible faculty cards."}`;
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-faculty.txt`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function initCardReveals() {
  if (cards.length === 0) {
    return;
  }

  if (prefersReducedMotion) {
    cards.forEach((card) => {
      card.style.opacity = "1";
    });
    return;
  }

  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(10px) rotateX(0deg) rotateY(0deg)";
    card.style.transition = `opacity 700ms ease ${index * 45}ms, transform 700ms ease ${index * 45}ms, box-shadow 260ms ease`;
  });

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0) rotateX(0deg) rotateY(0deg)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  cards.forEach((card) => revealObserver.observe(card));
}

if (!prefersReducedMotion) {
  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (card.classList.contains("hide-by-search")) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      const rotateY = Math.max(-2.2, Math.min(2.2, x * 2.2));
      const rotateX = Math.max(-2.2, Math.min(2.2, -y * 2.2));

      const mx = ((event.clientX - rect.left) / rect.width) * 100;
      const my = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${mx.toFixed(1)}%`);
      card.style.setProperty("--my", `${my.toFixed(1)}%`);

      card.style.transform = `translateY(-4px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
      card.style.transform = "translateY(0) rotateX(0deg) rotateY(0deg)";
    });
  });
}

initCardReveals();
updateVisibleCount();

