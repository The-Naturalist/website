// Owner dashboard (owner.html): Google sign-in, live bookings list and calendar, field notes and news tabs.
// Privacy is enforced by firestore.rules; the email check here only picks which screen to show.
import { OWNER_EMAILS, isConfigured } from "./firebase-config.js";

var $ = function (id) { return document.getElementById(id); };
var gateMsg = $("gateMsg"), signInBtn = $("signIn");

if (!isConfigured) {
  gateMsg.textContent = "The owner area isn't connected yet. Add the Firebase settings to assets/js/firebase-config.js (see BOOKINGS-SETUP.md).";
} else {
  start();
}

async function start() {
  var fb = await import("./firebase.js");
  var A = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
  var F = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  var db = fb.db, auth = fb.auth;

  var STATUS = { new: "New request", confirmed: "Confirmed", declined: "Declined", done: "Done" };
  var bookings = [], unsub = null;
  var view = "cal", status = "all", month = firstOfMonth(new Date()), selDay = null, current = null;
  var notes = null, news = null;

  signInBtn.disabled = false;
  signInBtn.addEventListener("click", function () {
    gateMsg.textContent = "Opening Google sign-in…";
    A.signInWithPopup(auth, new A.GoogleAuthProvider()).catch(function (e) {
      gateMsg.textContent = e.code === "auth/popup-blocked" ? "Your browser blocked the sign-in window. Allow pop-ups for this site and try again." : "Sign-in didn't finish. Please try again.";
    });
  });
  $("signOut").addEventListener("click", function () { A.signOut(auth); });

  A.onAuthStateChanged(auth, function (user) {
    if (unsub) { unsub(); unsub = null; }
    var ok = user && user.emailVerified && OWNER_EMAILS.indexOf((user.email || "").toLowerCase()) !== -1;
    $("who").hidden = !user;
    $("whoEmail").textContent = user ? user.email : "";
    $("gate").hidden = !!ok;
    $("app").hidden = !ok;
    if (user && !ok) gateMsg.textContent = user.email + " doesn't have access to the owner area. Sign out and use the business account.";
    if (!user) gateMsg.textContent = "Sign in with the business Google account to see bookings and post field notes and news.";
    if (notes) { notes.stop(); notes = null; }
    if (news) { news.stop(); news = null; }
    if (!ok) { bookings = []; return; }
    import("./owner-notes.js").then(function (m) { if (auth.currentUser === user && !notes) notes = m.startNotes(db, F); });
    import("./owner-news.js").then(function (m) { if (auth.currentUser === user && !news) news = m.startNews(db, F); });
    var q = F.query(F.collection(db, "bookings"), F.orderBy("date"));
    unsub = F.onSnapshot(q, function (snap) {
      bookings = snap.docs.map(function (d) { var b = d.data(); b.id = d.id; return b; });
      render();
      if (current) { var fresh = bookings.find(function (b) { return b.id === current.id; }); if (fresh) fill(fresh); else $("dlg").close(); }
    }, function (err) {
      console.error(err);
      $("app").hidden = true; $("gate").hidden = false;
      gateMsg.textContent = "Couldn't load bookings (" + err.code + "). Check the Firestore rules allow " + user.email + ".";
    });
  });

  // Date helpers. Booking dates are stored as plain YYYY-MM-DD strings.
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOf(b) { return ymd(addDays(parse(b.date), (b.days || 1) - 1)); }
  function fmt(s, opts) { return parse(s).toLocaleDateString(undefined, opts || { day: "numeric", month: "short", year: "numeric" }); }
  function range(b) { return (b.days || 1) > 1 ? fmt(b.date, { day: "numeric", month: "short" }) + " – " + fmt(endOf(b)) : fmt(b.date); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function shown() { return bookings.filter(function (b) { return status === "all" || b.status === status; }); }

  function render() {
    var today = ymd(new Date()), in30 = ymd(addDays(new Date(), 30));
    $("stNew").textContent = bookings.filter(function (b) { return b.status === "new"; }).length;
    $("stConf").textContent = bookings.filter(function (b) { return b.status === "confirmed" && endOf(b) >= today; }).length;
    $("stGuests").textContent = bookings.filter(function (b) { return b.status === "confirmed" && endOf(b) >= today && b.date <= in30; })
      .reduce(function (n, b) { return n + (b.guests || 0); }, 0);
    $("calView").hidden = view !== "cal";
    $("listView").hidden = view !== "list";
    if (view === "cal") renderCal(); else renderList();
  }

  function chip(b, label) {
    var c = el("button", "bk-chip s-" + b.status);
    c.type = "button";
    c.textContent = label;
    c.title = b.tourLabel + " · " + b.name + " · " + b.guests + " guests · " + STATUS[b.status];
    c.addEventListener("click", function (e) { e.stopPropagation(); openB(b); });
    return c;
  }

  function renderCal() {
    var cal = $("cal"), list = shown(), today = ymd(new Date());
    $("calTitle").textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    cal.innerHTML = "";
    var start = addDays(month, -((month.getDay() + 6) % 7)); // weeks start Monday
    var head = el("div", "cal-row cal-head"); head.setAttribute("role", "row");
    for (var i = 0; i < 7; i++) {
      var h = el("div", "cal-dow tag", addDays(start, i).toLocaleDateString(undefined, { weekday: "short" }));
      h.setAttribute("role", "columnheader"); head.appendChild(h);
    }
    cal.appendChild(head);
    var d = start;
    for (var w = 0; w < 6; w++) {
      var row = el("div", "cal-row"); row.setAttribute("role", "row");
      for (var j = 0; j < 7; j++) {
        var key = ymd(d);
        var cell = el("div", "cal-cell" + (d.getMonth() !== month.getMonth() ? " out" : "") + (key === today ? " today" : "") + (key === selDay ? " sel" : ""));
        cell.setAttribute("role", "gridcell");
        cell.tabIndex = 0;
        cell.dataset.day = key;
        var on = list.filter(function (b) { return b.date <= key && endOf(b) >= key; });
        cell.setAttribute("aria-label", fmt(key, { weekday: "long", day: "numeric", month: "long" }) + (on.length ? ", " + on.length + " booking" + (on.length > 1 ? "s" : "") : ""));
        cell.appendChild(el("span", "cal-n", d.getDate()));
        on.forEach(function (b) {
          var first = b.date === key || (j === 0);
          var c = chip(b, first ? b.tourLabel + " · " + b.name : "");
          if (b.date !== key) c.classList.add("cont");
          if (endOf(b) !== key && j < 6) c.classList.add("runs");
          cell.appendChild(c);
        });
        cell.addEventListener("click", pickDay);
        cell.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickDay.call(this); } });
        row.appendChild(cell);
        d = addDays(d, 1);
      }
      cal.appendChild(row);
      if (d.getMonth() !== month.getMonth() && d > month) break;
    }
    renderDay();
  }

  function pickDay() { selDay = this.dataset.day; renderCal(); }

  function renderDay() {
    var box = $("calDay"); box.innerHTML = "";
    var key = selDay || ymd(new Date());
    var on = shown().filter(function (b) { return b.date <= key && endOf(b) >= key; });
    box.appendChild(el("h3", null, fmt(key, { weekday: "long", day: "numeric", month: "long", year: "numeric" })));
    if (!on.length) { box.appendChild(el("p", "ow-empty", "No trips on this day.")); return; }
    on.forEach(function (b) { box.appendChild(row(b)); });
  }

  function row(b) {
    var r = el("button", "ow-row s-" + b.status); r.type = "button";
    var main = el("div", "ow-row-main");
    main.appendChild(el("strong", null, b.name));
    main.appendChild(el("span", null, b.tourLabel + " · " + b.guests + (b.guests > 1 ? " guests" : " guest") + (b.country ? " · " + b.country : "")));
    r.appendChild(el("span", "ow-row-date", range(b)));
    r.appendChild(main);
    r.appendChild(el("span", "ow-pill tag", STATUS[b.status]));
    r.addEventListener("click", function () { openB(b); });
    return r;
  }

  function renderList() {
    var box = $("list"), q = $("q").value.trim().toLowerCase(), today = ymd(new Date()), past = $("showPast").checked;
    box.innerHTML = "";
    var list = shown().filter(function (b) {
      if (!past && endOf(b) < today) return false;
      return !q || [b.name, b.email, b.phone, b.country, b.tourLabel, b.message].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    if (past) list.reverse();
    if (!list.length) { box.appendChild(el("p", "ow-empty", bookings.length ? "No bookings match." : "No booking requests yet. They'll appear here as soon as someone books.")); return; }
    list.forEach(function (b) { box.appendChild(row(b)); });
  }

  // Detail dialog
  function openB(b) { current = b; fill(b); $("dErr").hidden = true; if (!$("dlg").open) $("dlg").showModal(); }
  function fill(b) {
    current = b;
    $("dStatus").textContent = STATUS[b.status];
    $("dStatus").className = "tag ow-pill s-" + b.status;
    $("dTitle").textContent = b.tourLabel + " · " + b.name;
    $("dDates").textContent = range(b) + " · " + b.days + (b.days > 1 ? " days" : " day") + " · " + b.guests + (b.guests > 1 ? " guests" : " guest");
    var dl = $("dFields"); dl.innerHTML = "";
    [["Email", b.email], ["WhatsApp / phone", b.phone], ["Country", b.country], ["Message", b.message],
     ["Requested", b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().toLocaleString() : ""]].forEach(function (f) {
      if (!f[1]) return;
      var w = el("div"); w.appendChild(el("dt", "tag", f[0])); w.appendChild(el("dd", null, f[1])); dl.appendChild(w);
    });
    var rp = $("dReplies"); rp.innerHTML = "";
    var subj = "Your " + b.tourLabel + " tour, " + range(b);
    var mail = el("a", "btn btn-line", "Reply by email");
    mail.href = "mailto:" + encodeURIComponent(b.email) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent("Dear " + b.name + ",\n\n");
    rp.appendChild(mail);
    var digits = (b.phone || "").replace(/[^0-9]/g, "");
    if (digits.length >= 8) {
      var wa = el("a", "btn btn-line", "Reply on WhatsApp");
      wa.href = "https://wa.me/" + digits + "?text=" + encodeURIComponent("Hello " + b.name + ", thank you for booking " + b.tourLabel + " with The Naturalist.");
      wa.target = "_blank"; wa.rel = "noopener";
      rp.appendChild(wa);
    }
    if (document.activeElement !== $("dNote")) $("dNote").value = b.ownerNote || "";
    document.querySelectorAll("[data-set]").forEach(function (x) { x.hidden = x.dataset.set === b.status; });
  }
  async function save(fields) {
    $("dErr").hidden = true;
    fields.updatedAt = F.serverTimestamp();
    try { await F.updateDoc(F.doc(db, "bookings", current.id), fields); }
    catch (e) { console.error(e); $("dErr").textContent = "Couldn't save. Check your connection and try again."; $("dErr").hidden = false; }
  }
  document.querySelectorAll("[data-set]").forEach(function (x) {
    x.addEventListener("click", function () { save({ status: x.dataset.set, ownerNote: $("dNote").value }); });
  });
  $("dSave").addEventListener("click", function () { save({ ownerNote: $("dNote").value }).then(function () { $("dSave").textContent = "Saved"; setTimeout(function () { $("dSave").textContent = "Save note"; }, 1500); }); });
  $("dDelete").addEventListener("click", async function () {
    if (!confirm("Delete this booking from " + current.name + "? This can't be undone.")) return;
    try { await F.deleteDoc(F.doc(db, "bookings", current.id)); $("dlg").close(); }
    catch (e) { $("dErr").textContent = "Couldn't delete."; $("dErr").hidden = false; }
  });
  $("dlg").addEventListener("close", function () { current = null; });

  // Controls
  document.querySelectorAll("[data-view]").forEach(function (c) {
    c.addEventListener("click", function () {
      view = c.dataset.view;
      document.querySelectorAll("[data-view]").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
      render();
    });
  });
  document.querySelectorAll("[data-status]").forEach(function (c) {
    c.addEventListener("click", function () {
      status = c.dataset.status;
      document.querySelectorAll("[data-status]").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
      render();
    });
  });
  $("calPrev").addEventListener("click", function () { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); });
  $("calNext").addEventListener("click", function () { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); });
  $("calToday").addEventListener("click", function () { month = firstOfMonth(new Date()); selDay = ymd(new Date()); render(); });
  $("q").addEventListener("input", render);
  var TABS = { tabBookings: "", tabNotes: "#notes", tabNews: "#news" };
  Object.keys(TABS).forEach(function (id) {
    $(id).addEventListener("click", function () { showTab(id); });
  });
  function showTab(id) {
    Object.keys(TABS).forEach(function (t) {
      $(t).setAttribute("aria-selected", t === id);
      $($(t).getAttribute("aria-controls")).hidden = t !== id;
    });
    history.replaceState(null, "", TABS[id] || location.pathname + location.search);
  }
  Object.keys(TABS).forEach(function (t) { if (TABS[t] && location.hash === TABS[t]) showTab(t); });
  $("showPast").addEventListener("change", render);
}
