(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.BookingState = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ROOM_TYPES = ["share", "partner", "single"];

  function normalizeRoom(room) {
    const value = String(room || "").trim().toLowerCase();
    return ROOM_TYPES.indexOf(value) === -1 ? null : value;
  }

  function normalizeKids(kids, room) {
    const n = Number(kids);
    const count = Number.isFinite(n) ? Math.max(0, Math.min(2, Math.round(n))) : 0;
    if (room === "share") return 0;
    return count;
  }

  function parseBookingSearch(search) {
    const raw = String(search || "");
    const query = raw.indexOf("?") === 0 ? raw.slice(1) : raw;
    const params = new URLSearchParams(query);
    const room = normalizeRoom(params.get("room")) || "share";
    const kids = normalizeKids(params.get("kids"), room);
    return { room: room, kids: kids };
  }

  function bookingSearchString(state) {
    const room = normalizeRoom(state && state.room) || "share";
    const kids = normalizeKids(state && state.kids, room);
    const params = new URLSearchParams();
    params.set("room", room);
    params.set("kids", String(kids));
    return params.toString();
  }

  function adultsLabel(room) {
    if (room === "partner") return "2 adults";
    return "1 adult";
  }

  function companionsFromState(state) {
    const room = normalizeRoom(state && state.room) || "share";
    const kids = normalizeKids(state && state.kids, room);
    const parts = [];
    if (room === "partner") parts.push("Partner");
    if (kids === 1) parts.push("1 child");
    if (kids > 1) parts.push(kids + " children");
    return parts.join(" + ");
  }

  return {
    ROOM_TYPES: ROOM_TYPES,
    normalizeRoom: normalizeRoom,
    normalizeKids: normalizeKids,
    parseBookingSearch: parseBookingSearch,
    bookingSearchString: bookingSearchString,
    adultsLabel: adultsLabel,
    companionsFromState: companionsFromState,
  };
});
