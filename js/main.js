(function () {
  const CONFIG = {
    currency: "Rs",
    nights: 3,
    singleNight: 7000,
    doubleNight: 10200,
    childNight: 1400,
    flightAdult: 10000,
    flightChild: 6000,
    eventLevy: 3000,
    buffer: 0.05,
    email: "secretary.rtm@gmail.com",
  };

  const N = CONFIG.nights;
  const accomShare = (CONFIG.doubleNight / 2) * N;
  const accomSingle = CONFIG.singleNight * N;
  const accomChild = CONFIG.childNight * N;

  const state = { room: "share", kids: 0 };
  let currentRef = "";
  let displayTotal = 29700;
  let raf = 0;

  const $ = function (sel) {
    return document.querySelector(sel);
  };

  function fmt(n) {
    return CONFIG.currency + " " + Math.round(n).toLocaleString("en-US");
  }

  function round100(n) {
    return Math.round(n / 100) * 100;
  }

  function memberTicket(accom) {
    return round100((accom + CONFIG.flightAdult + CONFIG.eventLevy) * (1 + CONFIG.buffer));
  }

  const partnerCost = round100(accomShare + CONFIG.flightAdult);
  const childCost = round100(accomChild + CONFIG.flightChild);

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function makeRef(name) {
    const s = (name || "").trim().split(/\s+/).pop().replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase() || "AGM";
    return "RTM27-" + s + "-" + Math.floor(1000 + Math.random() * 9000);
  }

  function compute() {
    const lines = [];
    let roomsText = "";

    if (state.room === "single") {
      lines.push({
        t: "Your place · Tabler",
        s: "Single room · half board · flights · AGM",
        v: memberTicket(accomSingle),
      });
      roomsText = "One single room · sole occupancy";
    } else {
      lines.push({
        t: "Your place · Tabler",
        s: "Shared room · half board · flights · AGM",
        v: memberTicket(accomShare),
      });
      roomsText = state.room === "partner"
        ? "One double room · you and your partner"
        : "One shared room · we'll pair you with a fellow Tabler";
    }

    if (state.room === "partner") {
      lines.push({
        t: "Your partner",
        s: "Shares your room · half board · flights · no AGM",
        v: partnerCost,
      });
    }

    if (state.kids > 0) {
      lines.push({
        t: "Children × " + state.kids,
        s: "Sofa bed · half board · flight (est. Rs 6,000)",
        v: childCost * state.kids,
      });
      roomsText += " + " + state.kids + (state.kids > 1 ? " children" : " child") + " on the sofa bed";
    }

    const total = lines.reduce(function (a, l) { return a + l.v; }, 0);
    return { lines: lines, total: total, roomsText: roomsText };
  }

  function roomLabel() {
    if (state.room === "single") return "Single room";
    if (state.room === "partner") return "Double with partner";
    return "Twin-share";
  }

  function guestsLabel() {
    return "1 Tabler"
      + (state.room === "partner" ? " + partner" : "")
      + (state.kids ? " + " + state.kids + (state.kids > 1 ? " children" : " child") : "");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function render(totalOverride) {
    const r = compute();
    const wrap = document.getElementById("lines");
    if (wrap) {
      wrap.innerHTML = r.lines.map(function (l) {
        return '<div class="line"><div><div class="lt">' + l.t + '</div><div class="ls">' + l.s + "</div></div><div class=\"lv\">" + fmt(l.v) + "</div></div>";
      }).join("");
    }
    setText("roomsBadge", r.roomsText);
    setText("grandTotal", fmt(totalOverride == null ? r.total : totalOverride));
    setText("smRoom", roomLabel());
    setText("smGuests", guestsLabel());
    setText("smTotal", fmt(r.total));
    const shown = currentRef || "RTM27-····";
    setText("smRef", shown);
    setText("payRef", shown);
    const kidField = document.getElementById("kidField");
    if (kidField) kidField.classList.toggle("hidden", state.room === "share");
  }

  function tweenTo(target) {
    if (raf) cancelAnimationFrame(raf);
    if (reduceMotion()) {
      displayTotal = target;
      render(target);
      return;
    }
    const start = displayTotal;
    const t0 = performance.now();
    const step = function (now) {
      const p = Math.min(1, (now - t0) / 650);
      const e = 1 - Math.pow(1 - p, 3);
      displayTotal = Math.round(start + (target - start) * e);
      render(displayTotal);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function setRoom(room) {
    state.room = room;
    if (room === "share") state.kids = 0;
    document.querySelectorAll("[data-room]").forEach(function (btn) {
      const on = btn.getAttribute("data-room") === room;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const kidVal = document.getElementById("kidVal");
    if (kidVal) kidVal.textContent = String(state.kids);
    syncKidButtons();
    tweenTo(compute().total);
  }

  function syncKidButtons() {
    const minus = document.getElementById("kidMinus");
    const plus = document.getElementById("kidPlus");
    if (minus) minus.disabled = state.kids <= 0;
    if (plus) plus.disabled = state.kids >= 2;
  }

  function setKids(delta) {
    state.kids = Math.max(0, Math.min(2, state.kids + delta));
    const kidVal = document.getElementById("kidVal");
    if (kidVal) kidVal.textContent = String(state.kids);
    syncKidButtons();
    tweenTo(compute().total);
  }

  document.querySelectorAll("[data-room]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setRoom(btn.getAttribute("data-room"));
    });
  });

  const kidMinus = document.getElementById("kidMinus");
  const kidPlus = document.getElementById("kidPlus");
  if (kidMinus) kidMinus.addEventListener("click", function () { setKids(-1); });
  if (kidPlus) kidPlus.addEventListener("click", function () { setKids(1); });

  const nameInput = document.getElementById("fName");
  if (nameInput) {
    nameInput.addEventListener("input", function () {
      if (nameInput.value.trim().length > 1 && !currentRef) currentRef = makeRef(nameInput.value);
      const shown = currentRef || "RTM27-····";
      setText("smRef", shown);
      setText("payRef", shown);
    });
  }

  const form = document.getElementById("bookForm");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = String(new FormData(form).get("name") || "").trim();
      const email = String(new FormData(form).get("email") || "").trim();
      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        form.reportValidity();
        return;
      }
      if (!currentRef) currentRef = makeRef(name);
      setText("confirmRef", currentRef);
      setText("payRef", currentRef);
      form.classList.add("hidden");
      const mini = document.querySelector(".summary-mini");
      if (mini) mini.classList.add("hidden");
      const confirm = document.getElementById("confirm");
      if (confirm) confirm.classList.add("is-on");
    });
  }

  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-navlinks]");

  function closeNav() {
    if (!links || !toggle) return;
    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      const open = !links.classList.contains("is-open");
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  if (nav) {
    window.addEventListener("scroll", function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 42);
    }, { passive: true });
  }

  const veil = document.querySelector("[data-veil]");
  if (veil) {
    if (reduceMotion()) veil.classList.add("is-lifted");
    else window.setTimeout(function () { veil.classList.add("is-lifted"); }, 1300);
  }

  if (!reduceMotion()) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });

    window.addEventListener("scroll", function () {
      document.querySelectorAll("[data-parallax]").forEach(function (el) {
        const sp = parseFloat(el.getAttribute("data-parallax")) || 0.12;
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = "translate3d(0," + (mid * -sp).toFixed(1) + "px,0)";
      });
    }, { passive: true });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  const mail = document.getElementById("footMail");
  if (mail) {
    mail.textContent = CONFIG.email;
    mail.setAttribute("href", "mailto:" + CONFIG.email);
  }

  setRoom("share");
})();
