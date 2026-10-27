// Public booking form (book.html). Saves a request to Firestore for the owner to review.
import { TOURS, isConfigured } from "./firebase-config.js";

var form = document.getElementById("bookForm");
var tourSel = document.getElementById("bkTour");
var dateIn = document.getElementById("bkDate");
var daysIn = document.getElementById("bkDays");
var errBox = document.getElementById("bkError");
var submit = document.getElementById("bkSubmit");
var WA = "https://wa.me/94712727755";

var pad = function (n) { return String(n).padStart(2, "0"); };
var ymd = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
var pretty = function (s) {
  var p = s.split("-");
  return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
};

// Tour list, preselected from ?tour=birding
TOURS.forEach(function (t) {
  var o = document.createElement("option");
  o.value = t.id;
  o.textContent = t.label + (t.days ? " · " + t.days + (t.days > 1 ? " days" : " day") : "");
  tourSel.appendChild(o);
});
var want = new URLSearchParams(location.search).get("tour");
if (want && TOURS.some(function (t) { return t.id === want; })) tourSel.value = want;

var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
dateIn.min = ymd(tomorrow);

// Fixed tours set their own length; custom tours let the visitor choose.
var syncDays = function () {
  var t = TOURS.find(function (x) { return x.id === tourSel.value; });
  daysIn.readOnly = !!t.days;
  daysIn.value = t.days || daysIn.value || 5;
};
tourSel.addEventListener("change", syncDays);
syncDays();

var waText = function (b) {
  return WA + "?text=" + encodeURIComponent(
    "Hello, I'd like to book " + b.tourLabel + " starting " + b.date + " for " + b.guests + " guest" + (b.guests > 1 ? "s" : "") + ". My name is " + b.name + "."
  );
};

var showError = function (msg, booking) {
  errBox.innerHTML = "";
  errBox.append(msg);
  if (booking) {
    var a = document.createElement("a");
    a.href = waText(booking); a.textContent = "Send it on WhatsApp instead";
    errBox.append(" ", a);
  }
  errBox.hidden = false;
};

var read = function () {
  var f = new FormData(form);
  var t = TOURS.find(function (x) { return x.id === f.get("tour"); });
  var b = {
    tour: t.id,
    tourLabel: t.label,
    date: f.get("date"),
    days: parseInt(f.get("days"), 10),
    guests: parseInt(f.get("guests"), 10),
    name: f.get("name").trim(),
    email: f.get("email").trim(),
    phone: f.get("phone").trim(),
    country: f.get("country").trim(),
    message: f.get("message").trim()
  };
  ["phone", "country", "message"].forEach(function (k) { if (!b[k]) delete b[k]; });
  return b;
};

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  errBox.hidden = true;
  if (!form.checkValidity()) {
    var bad = form.querySelector("input:invalid, select:invalid, textarea:invalid");
    showError("Please check " + bad.labels[0].firstChild.textContent.trim().toLowerCase() + ".");
    bad.focus();
    return;
  }
  if (form.website.value) return; // bot filled the hidden field
  var b = read();
  if (!isConfigured) { showError("Online booking isn't switched on yet.", b); return; }

  submit.disabled = true; submit.textContent = "Sending…";
  try {
    var fb = await import("./firebase.js");
    var fs = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
    b.status = "new";
    b.createdAt = fs.serverTimestamp();
    await fs.addDoc(fs.collection(fb.db, "bookings"), b);
  } catch (err) {
    console.error(err);
    showError("Sorry, the request didn't go through.", b);
    submit.disabled = false; submit.textContent = "Send booking request";
    return;
  }
  document.getElementById("bkDoneName").textContent = b.name.split(" ")[0];
  document.getElementById("bkDoneTour").textContent = b.tourLabel;
  document.getElementById("bkDoneDate").textContent = pretty(b.date);
  document.getElementById("bkDoneWa").hidden = !b.phone;
  document.getElementById("bkDoneWaLink").href = waText(b);
  form.hidden = true;
  var done = document.getElementById("bkDone");
  done.hidden = false; done.focus();
  window.scrollTo({ top: done.getBoundingClientRect().top + scrollY - 100 });
});
