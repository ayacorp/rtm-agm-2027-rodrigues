(function () {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const countdown = document.querySelector("[data-countdown]");
  const form = document.querySelector("[data-interest-form]");
  const status = document.querySelector("[data-form-status]");
  const year = document.querySelector("[data-year]");

  const EVENT_START = Date.UTC(2027, 4, 13, 6, 0, 0);

  function setHeaderState() {
    if (!header) return;
    header.classList.toggle("is-solid", window.scrollY > 24);
  }

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  function setCountdown() {
    if (!countdown) return;
    const now = Date.now();
    const diff = EVENT_START - now;
    if (diff <= 0) {
      countdown.textContent = "The AGM window is open — 13–16 May 2027.";
      return;
    }
    const days = Math.floor(diff / 86400000);
    countdown.textContent = days === 1
      ? "1 day until 13 May 2027"
      : days.toLocaleString("en-GB") + " days until 13 May 2027";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });
  }

  if (form && status) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();

      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.hidden = false;
        status.classList.add("is-error");
        status.textContent = "Please add your name and a valid email so organisers can reach you when booking opens.";
        return;
      }

      status.hidden = false;
      status.classList.remove("is-error");
      status.textContent = "Interest noted on this device. Official booking is not open yet — no payment has been taken, and no confirmation email can be sent until Round Table Mauritius publishes the booking channel.";
      form.reset();
    });
  }

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  setHeaderState();
  setCountdown();
  window.addEventListener("scroll", setHeaderState, { passive: true });
})();
