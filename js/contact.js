const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const card = document.getElementById("tiltCard");
const copyStatus = document.getElementById("copyStatus");
const inquiryForm = document.getElementById("inquiryForm");
const inquiryStatus = document.getElementById("inquiryStatus");
let statusTimer = 0;

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

if (card && !prefersReducedMotion) {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    const rotateY = Math.max(-2, Math.min(2, x * 2));
    const rotateX = Math.max(-2, Math.min(2, -y * 2));

    const mx = ((event.clientX - rect.left) / rect.width) * 100;
    const my = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mx", `${mx.toFixed(1)}%`);
    card.style.setProperty("--my", `${my.toFixed(1)}%`);

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
    card.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

function flashCopyStatus(type, message) {
  if (!copyStatus) {
    return;
  }

  window.clearTimeout(statusTimer);
  copyStatus.classList.remove("is-ok", "is-bad");
  copyStatus.textContent = message;
  copyStatus.classList.add(type === "ok" ? "is-ok" : "is-bad");
  statusTimer = window.setTimeout(() => {
    copyStatus.classList.remove("is-ok", "is-bad");
  }, 1100);
}

async function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const temp = document.createElement("textarea");
  temp.value = value;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.dataset.copy;
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    try {
      await copyText(target.textContent.trim());
      flashCopyStatus("ok", `${button.textContent} completed.`);
    } catch {
      flashCopyStatus("bad", "Copy action could not be completed.");
    }
  });
});

inquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const fullName = String(inquiryForm.elements.fullName.value || "").trim();
  const email = String(inquiryForm.elements.email.value || "").trim();
  const message = String(inquiryForm.elements.message.value || "").trim();

  if (!fullName || !email || !message) {
    inquiryStatus.textContent = "All fields are required for inquiry validation.";
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    inquiryStatus.textContent = "Please provide a valid email format.";
    return;
  }

  inquiryStatus.textContent =
    "Inquiry format validated. Submit this through official school channels for processing.";
  inquiryForm.reset();
});
