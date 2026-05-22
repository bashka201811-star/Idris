const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const yearEl = document.getElementById("year");

const stored = localStorage.getItem("theme");
if (stored) {
  root.setAttribute("data-theme", stored);
  toggle.textContent = stored === "light" ? "☀️" : "🌙";
}

toggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  toggle.textContent = next === "light" ? "☀️" : "🌙";
  localStorage.setItem("theme", next);
});

yearEl.textContent = new Date().getFullYear();
