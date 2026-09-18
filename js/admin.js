(function () {
  const tokenInput = document.getElementById("adminToken");
  const errorEl = document.getElementById("adminError");
  const bodyEl = document.getElementById("adminBody");
  if (!tokenInput || !errorEl || !bodyEl) return;

  const stored = sessionStorage.getItem("rtmAdminToken");
  if (stored) tokenInput.value = stored;

  function showError(msg) {
    errorEl.textContent = msg || "";
    errorEl.classList.toggle("hidden", !msg);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(n) {
    return "Rs " + Math.round(Number(n) || 0).toLocaleString("en-US");
  }

  async function load() {
    showError("");
    const token = tokenInput.value.trim();
    const res = await fetch("/api/admin/bookings", {
      headers: { Authorization: "Bearer " + token },
    });
    const payload = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      showError(payload.error || "Could not load bookings");
      bodyEl.innerHTML = "";
      return;
    }
    sessionStorage.setItem("rtmAdminToken", token);
    const rows = payload.bookings || [];
    if (!rows.length) {
      bodyEl.innerHTML = '<div class="admin-empty">No reservations yet.</div>';
      return;
    }
    bodyEl.innerHTML = '<table><thead><tr><th>Ref</th><th>Guest</th><th>Room</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>'
      + rows.map(function (row) {
        const paidBtn = row.status === "paid"
          ? ""
          : '<button class="btn btn-gold" type="button" data-mark="' + escapeHtml(row.ref) + '">Mark paid</button>';
        return "<tr><td class=\"ref\">" + escapeHtml(row.ref) + "</td><td>"
          + escapeHtml(row.name) + "<br><small>" + escapeHtml(row.email) + " · " + escapeHtml(row.phone || "—") + "</small></td><td>"
          + escapeHtml(row.roomType) + " · kids " + escapeHtml(row.kids) + "</td><td>"
          + fmt(row.total) + "</td><td class=\"status\">" + escapeHtml(row.status) + "</td><td>"
          + paidBtn + "</td></tr>";
      }).join("")
      + "</tbody></table>";
  }

  const authForm = document.getElementById("adminAuth");
  if (authForm) {
    authForm.addEventListener("submit", function (event) {
      event.preventDefault();
      load();
    });
  }

  bodyEl.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-mark]");
    if (!btn) return;
    const token = tokenInput.value.trim();
    btn.disabled = true;
    fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ ref: btn.getAttribute("data-mark"), status: "paid" }),
    }).then(function (res) {
      if (!res.ok) throw new Error("Mark paid failed");
      return load();
    }).catch(function (err) {
      showError(err.message);
      btn.disabled = false;
    });
  });

  if (stored) load();
})();
