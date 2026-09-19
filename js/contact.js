(function () {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const submitBtn = document.getElementById("contactBtn");
  const errorEl = document.getElementById("contactError");
  const confirmEl = document.getElementById("contactConfirm");

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.classList.toggle("hidden", !message);
  }

  function showConfirm() {
    form.classList.add("hidden");
    if (confirmEl) confirmEl.classList.add("is-on");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    showError("");
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.reportValidity();
      return;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, message: message }),
    }).then(function (res) {
      return res.json().then(function (payload) {
        return { ok: res.ok, payload: payload };
      }).catch(function () {
        return { ok: res.ok, payload: {} };
      });
    }).then(function (result) {
      if (!result.ok) {
        throw new Error(result.payload.error || "Could not send just now.");
      }
      showConfirm();
    }).catch(function (err) {
      showError(err.message || "Could not send just now. Please try again shortly.");
    }).finally(function () {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send message →";
      }
    });
  });
})();
