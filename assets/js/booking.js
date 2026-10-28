// Booking forms (book.html, contact.html). book.html hands the request to WhatsApp
// (or saves it to Firestore for the owner when SAVE_BOOKINGS is on). The contact page form
// (data-send="email") emails the request straight to the business through Web3Forms.
import { TOURS, isConfigured } from "./firebase-config.js";

var form = document.getElementById("bookForm");
var tourSel = document.getElementById("bkTour");
var dateIn = document.getElementById("bkDate");
var daysIn = document.getElementById("bkDays");
var errBox = document.getElementById("bkError");
var submit = document.getElementById("bkSubmit");
var WA = "https://wa.me/94712727755";
var EMAIL = "thenaturalist.lk@gmail.com";
// Web3Forms access key for EMAIL (safe to publish; it can only send to that inbox).
var W3F_KEY = "fc351e91-b0ce-4233-acfa-88f6678c25bc";
var byEmail = form.dataset.send === "email";
// book.html hands requests to WhatsApp (owner's choice). Set to true to save them to Firestore
// for owner.html instead, once Firebase is configured.
var SAVE_BOOKINGS = false;

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
  var lines = [
    "Hello, I'd like to book a tour.",
    "",
    "Tour: " + b.tourLabel,
    "Start date: " + pretty(b.date),
    "Days: " + b.days,
    "Guests: " + b.guests,
    "",
    "Name: " + b.name,
    "Email: " + b.email
  ];
  if (b.phone) lines.push("Phone: " + b.phone);
  if (b.country) lines.push("Country: " + b.country);
  if (b.message) lines.push("", "Notes: " + b.message);
  return WA + "?text=" + encodeURIComponent(lines.join("\n"));
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
  if (byEmail) {
    submit.disabled = true; submit.textContent = "Sending…";
    try {
      // Never leave the visitor on "Sending…": give up after 20 seconds.
      var ctl = new AbortController();
      var timer = setTimeout(function () { ctl.abort(); }, 20000);
      var res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        signal: ctl.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: W3F_KEY,
          subject: "Booking request: " + b.tourLabel + " from " + pretty(b.date) + " (" + b.name + ")",
          from_name: "The Naturalist website",
          replyto: b.email,
          Tour: b.tourLabel,
          "Start date": pretty(b.date),
          Days: b.days,
          Guests: b.guests,
          Name: b.name,
          Email: b.email,
          Phone: b.phone || "",
          Country: b.country || "",
          Notes: b.message || ""
        })
      });
      clearTimeout(timer);
      var out = await res.json().catch(function () { return {}; });
      if (!res.ok || String(out.success) !== "true") throw new Error(out.message || "HTTP " + res.status);
    } catch (err) {
      clearTimeout(timer);
      console.error("Booking email failed:", err);
      errBox.innerHTML = "";
      var m = document.createElement("a");
      m.href = "mailto:" + EMAIL; m.textContent = EMAIL;
      errBox.append("Sorry, the request didn't go through. Please try again, or email us at ", m, ".");
      errBox.hidden = false;
      submit.disabled = false; submit.textContent = "Send booking request";
      return;
    }
    showDone(b, "email");
    return;
  }
  if (!isConfigured || !SAVE_BOOKINGS) {
    var url = waText(b);
    var w = window.open(url, "_blank");
    if (w) w.opener = null; else location.href = url;
    showDone(b, "whatsapp");
    return;
  }

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
  showDone(b, "saved");
});

function showDone(b, how) {
  document.getElementById("bkDoneName").textContent = b.name.split(" ")[0];
  document.getElementById("bkDoneTour").textContent = b.tourLabel;
  document.getElementById("bkDoneDate").textContent = pretty(b.date);
  document.getElementById("bkDoneWa").hidden = !b.phone;
  var link = document.getElementById("bkDoneWaLink");
  link.href = waText(b);
  if (how === "email") {
    document.getElementById("bkDoneLede").textContent = "Your request for " + b.tourLabel + " starting " + pretty(b.date) + " has been sent. Priyanwada will reply to " + b.email + ", usually within 24 hours.";
    link.hidden = true;
  } else if (how === "whatsapp") {
    document.getElementById("bkDoneLede").textContent = "WhatsApp should now be open with your request for " + b.tourLabel + " starting " + pretty(b.date) + ". Press send there and Priyanwada will reply to confirm.";
    link.textContent = "Open WhatsApp again";
  }
  form.hidden = true;
  var done = document.getElementById("bkDone");
  done.hidden = false; done.focus();
  window.scrollTo({ top: done.getBoundingClientRect().top + scrollY - 100 });
}
