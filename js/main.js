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
  let reservedEmail = "";
  let displayTotal = 29700;
  let raf = 0;
  let proofEnabled = false;

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

  function applyBank(bank) {
    const publicDetails = Boolean(bank && bank.public && bank.confirmed);
    const tbaText = (bank && bank.message) || "Awaiting organiser bank details / payment instructions by email.";
    document.querySelectorAll("[data-bank-card]").forEach(function (card) {
      const tba = card.querySelector("[data-bank-tba]");
      const fields = card.querySelector("[data-bank-fields]");
      if (tba) {
        tba.textContent = tbaText;
        tba.classList.toggle("hidden", publicDetails);
      }
      if (fields) fields.classList.toggle("hidden", !publicDetails);
      if (!publicDetails) return;
      card.querySelectorAll("[data-bank]").forEach(function (el) {
        const key = el.getAttribute("data-bank");
        el.textContent = bank[key] || "";
      });
      card.querySelectorAll("[data-bank-row]").forEach(function (row) {
        const key = row.getAttribute("data-bank-row");
        row.classList.toggle("hidden", !bank[key]);
      });
    });
    const lead = document.getElementById("confirmLead");
    if (lead) {
      lead.textContent = publicDetails
        ? "Quote this reference on your MCB transfer. Amount due"
        : "Awaiting organiser bank details / payment instructions by email. Amount due";
    }
  }

  function showError(message) {
    const el = document.getElementById("formError");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("hidden", !message);
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    let payload = {};
    try {
      payload = await res.json();
    } catch (err) {
      payload = {};
    }
    if (!res.ok) {
      throw new Error(payload.error || "Request failed");
    }
    return payload;
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

  function showCheckout(reservation, bank) {
    currentRef = reservation.ref;
    reservedEmail = reservation.email;
    setText("confirmRef", reservation.ref);
    setText("payRef", reservation.ref);
    setText("smRef", reservation.ref);
    setText("confirmAmount", fmt(reservation.total));
    applyBank(bank);
    if (form) form.classList.add("hidden");
    const mini = document.querySelector(".summary-mini");
    if (mini) mini.classList.add("hidden");
    const confirm = document.getElementById("confirm");
    if (confirm) confirm.classList.add("is-on");
    const heading = document.getElementById("confirmHeading");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  }

  const form = document.getElementById("bookForm");
  const reserveBtn = document.getElementById("reserveBtn");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      showError("");
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        form.reportValidity();
        return;
      }
      if (reserveBtn) {
        reserveBtn.disabled = true;
        reserveBtn.textContent = "Reserving…";
      }
      fetchJson("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: String(data.get("phone") || "").trim(),
          table: String(data.get("table") || "").trim(),
          companions: String(data.get("companions") || "").trim(),
          notes: String(data.get("notes") || "").trim(),
          roomType: state.room,
          kids: state.kids,
        }),
      }).then(function (payload) {
        showCheckout(payload.reservation, payload.bank);
      }).catch(function (err) {
        showError(err.message || "Could not reserve just now.");
      }).finally(function () {
        if (reserveBtn) {
          reserveBtn.disabled = false;
          reserveBtn.textContent = "Reserve my place →";
        }
      });
    });
  }

  const paidBtn = document.getElementById("paidBtn");
  const paidStatus = document.getElementById("paidStatus");
  function setPaidStatus(message) {
    if (paidStatus) paidStatus.textContent = message || "";
  }

  if (paidBtn) {
    paidBtn.addEventListener("click", function () {
      if (!currentRef || !reservedEmail) return;
      paidBtn.disabled = true;
      setPaidStatus("Recording your payment…");
      fetchJson("/api/booking/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: currentRef, email: reservedEmail }),
      }).then(function () {
        setPaidStatus("Marked as paid — awaiting verification by the organisers.");
        paidBtn.textContent = "Awaiting verification";
      }).catch(function (err) {
        paidBtn.disabled = false;
        setPaidStatus(err.message || "Could not record payment.");
      });
    });
  }

  const proofForm = document.getElementById("proofForm");
  const proofFile = document.getElementById("proofFile");
  const proofBtn = document.getElementById("proofBtn");
  const proofLabel = proofForm ? proofForm.querySelector("label") : null;

  function setProofEnabled(enabled) {
    proofEnabled = Boolean(enabled);
    if (!proofForm) return;
    proofForm.classList.toggle("is-unavailable", !proofEnabled);
    if (proofFile) proofFile.disabled = !proofEnabled;
    if (proofBtn) proofBtn.disabled = !proofEnabled;
    if (proofLabel) {
      proofLabel.textContent = proofEnabled
        ? "Transfer proof (optional)"
        : "Transfer proof (optional — upload opens once Blob storage is configured)";
    }
  }

  setProofEnabled(false);

  if (proofForm) {
    proofForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!currentRef || !reservedEmail) return;
      if (!proofEnabled) {
        setPaidStatus("Proof upload is not configured yet. Use I've paid instead.");
        return;
      }
      if (!proofFile || !proofFile.files || !proofFile.files[0]) {
        setPaidStatus("Choose a transfer screenshot or PDF first.");
        return;
      }
      const body = new FormData();
      body.append("ref", currentRef);
      body.append("email", reservedEmail);
      body.append("proof", proofFile.files[0]);
      if (proofBtn) {
        proofBtn.disabled = true;
        proofBtn.textContent = "Uploading…";
      }
      fetchJson("/api/booking/proof", { method: "POST", body: body }).then(function (payload) {
        setPaidStatus("Proof received — awaiting verification.");
        if (paidBtn) {
          paidBtn.disabled = true;
          paidBtn.textContent = "Awaiting verification";
        }
        if (payload.reservation && payload.reservation.proofUrl) {
          setPaidStatus("Proof received — awaiting verification. Organisers have the file.");
        }
      }).catch(function (err) {
        setPaidStatus(err.message || "Could not upload proof.");
      }).finally(function () {
        if (proofBtn) {
          proofBtn.disabled = !proofEnabled;
          proofBtn.textContent = "Upload proof";
        }
      });
    });
  }

  fetchJson("/api/config").then(function (payload) {
    if (payload.bank) applyBank(payload.bank);
    setProofEnabled(Boolean(payload.proofUpload));
  }).catch(function () {
    applyBank({ public: false, confirmed: false });
    setProofEnabled(false);
  });

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
