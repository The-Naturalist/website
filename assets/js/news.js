// News & Events page: lists every post as a card, opens one post at a time (news.html#post-id),
// and adds posts published from owner.html above the ones written into the page.
import { firebaseConfig, isConfigured, TOURS } from "./firebase-config.js";

var TYPES = { event: "Event", special: "Tour special", news: "News" };
var TOUR_PAGES = { custom: "tours/customised-tours.html", workshop: "workshops.html" };
var list = document.getElementById("nwList"), grid = document.getElementById("nwGrid"), box = document.getElementById("nwPosts");
var filter = "all", baseTitle = document.title, F = null, db = null;

if (list && box) {
  list.hidden = false;
  document.querySelectorAll(".chip[data-nw]").forEach(function (c) {
    c.addEventListener("click", function () {
      filter = c.dataset.nw;
      document.querySelectorAll(".chip[data-nw]").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
      cards();
    });
  });
  window.addEventListener("hashchange", function () { route(true); });
  cards(); route(false);
  if (isConfigured) load().catch(function (e) { console.error("News didn't load", e); });
}

function posts() { return Array.prototype.slice.call(box.querySelectorAll(".nw-post")); }
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// The card for each post is built from the post itself, so a post only has to be written once.
function cards() {
  grid.innerHTML = "";
  var shown = posts().filter(function (p) { return filter === "all" || p.dataset.type === filter; });
  shown.forEach(function (p) {
    var a = el("a", "nw-card"); a.href = "#" + p.id;
    var cover = p.querySelector("article > .frame img");
    var fr = el("div", "frame " + (p.dataset.type === "special" ? "b" : p.dataset.type === "news" ? "d" : "c"));
    if (cover) { var i = el("img"); i.src = cover.getAttribute("src"); i.alt = ""; i.loading = "lazy"; i.decoding = "async"; fr.appendChild(i); }
    else fr.appendChild(el("div", "ph tag", TYPES[p.dataset.type] || "News"));
    a.appendChild(fr);
    var body = el("div", "body");
    var eb = p.querySelector(".eyebrow"), h = p.querySelector("h2"), first = p.querySelector(".prose p");
    body.appendChild(el("span", "tag", eb ? eb.textContent : TYPES[p.dataset.type] || "News"));
    body.appendChild(el("h3", null, h ? h.textContent : ""));
    if (first) body.appendChild(el("p", null, first.textContent));
    body.appendChild(el("span", "more", "Read more →"));
    a.appendChild(body);
    grid.appendChild(a);
  });
  document.getElementById("nwEmpty").hidden = shown.length > 0;
}

function route(scroll) {
  var id = decodeURIComponent(location.hash.slice(1)), open = null;
  posts().forEach(function (p) {
    var on = p.id === id; p.hidden = !on; if (on) open = p;
    if (!p.querySelector(".nw-back")) {
      var w = el("div", "wrap nw-back"), b = el("a", "btn btn-line", "← All news & events"); b.href = "#";
      w.appendChild(b); p.insertBefore(w, p.firstChild);
    }
  });
  list.hidden = !!open;
  document.title = open ? open.querySelector("h2").textContent + " · The Naturalist" : baseTitle;
  if (open) { if (open.dataset.remote) photos(open); if (scroll) window.scrollTo(0, 0); }
  else if (scroll && id === "") window.scrollTo(0, 0);
}

async function load() {
  var A = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
  F = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-lite.js");
  db = F.getFirestore(A.initializeApp(firebaseConfig));
  if (new URLSearchParams(location.search).has("emulator")) F.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  var snap = await F.getDocs(F.query(F.collection(db, "news"), F.where("published", "==", true)));
  var items = snap.docs.map(function (d) { var n = d.data(); n.id = d.id; return n; });
  items.sort(function (a, b) { return ms(a) - ms(b); });
  items.forEach(function (n) { box.insertBefore(render(n), box.firstChild); });
  cards(); route(false);
}

function ms(n) { var t = n.publishedAt || n.createdAt; return t && t.toMillis ? t.toMillis() : 0; }
function fact(label, value) {
  var w = el("div"); w.appendChild(el("dt", "tag", label));
  w.appendChild(typeof value === "string" ? el("dd", null, value) : value); return w;
}
function isImg(s) { return typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(s); }
function longDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return "";
  var p = s.split("-");
  return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function whenText(n) {
  var a = longDate(n.date), b = longDate(n.dateEnd);
  if (!a || !b || b === a) return a;
  if (n.date.slice(0, 7) === n.dateEnd.slice(0, 7)) return a.split(" ")[0] + " to " + b;
  return a + " to " + b;
}

// Same markup as the hand-written posts in news.html.
function render(n) {
  var sec = el("section", "nw-post"), row = el("div", "wrap article"), art = el("article");
  sec.id = "post-" + n.id; sec.dataset.type = TYPES[n.type] ? n.type : "news"; sec.dataset.remote = n.id;
  if (isImg(n.image)) {
    var fr = el("div", "frame c"), img = el("img");
    img.src = n.image; img.alt = n.imageAlt || ""; img.decoding = "async";
    fr.appendChild(img); art.appendChild(fr);
  }
  var when = whenText(n);
  art.appendChild(el("span", "eyebrow tag", TYPES[sec.dataset.type] + (when ? " · " + when : "")));
  art.appendChild(el("h2", null, n.title));
  var prose = el("div", "prose");
  (n.body || "").split(/\n\s*\n/).forEach(function (para) {
    var p = el("p");
    para.trim().split("\n").forEach(function (line, i) { if (i) p.appendChild(el("br")); p.appendChild(document.createTextNode(line)); });
    prose.appendChild(p);
  });
  art.appendChild(prose);
  if (n.photoCount > 0) art.appendChild(el("div", "photos album"));
  row.appendChild(art);

  var aside = el("dl", "aside");
  aside.appendChild(fact("What", TYPES[sec.dataset.type]));
  if (when) aside.appendChild(fact("When", when));
  if (n.place) aside.appendChild(fact("Where", n.place));
  var tour = TOURS.find(function (x) { return x.id === n.tour; });
  if (tour) {
    var dd = el("dd"), a = el("a", null, tour.label + (tour.id === "custom" || tour.id === "workshop" ? "s" : " tour"));
    a.href = TOUR_PAGES[tour.id] || "tours/" + tour.id + ".html"; dd.appendChild(a);
    aside.appendChild(fact("See it on", dd));
  }
  if (sec.dataset.type === "special") {
    var ask = el("dd"), w = el("a", "btn btn-accent", "Ask on WhatsApp");
    w.href = "https://wa.me/94712727755?text=" + encodeURIComponent("Hi! I saw “" + n.title + "” on your website and would like to know more.");
    ask.appendChild(w); aside.appendChild(fact("Interested?", ask));
  }
  row.appendChild(aside);
  sec.appendChild(row);
  return sec;
}

// Album photos are stored one per document and only fetched when the post is opened.
async function photos(sec) {
  var album = sec.querySelector(".album");
  if (!album || album.dataset.loaded) return;
  album.dataset.loaded = "1";
  album.appendChild(el("p", "nw-loading tag", "Loading photos…"));
  try {
    var snap = await F.getDocs(F.query(F.collection(db, "news", sec.dataset.remote, "photos"), F.orderBy("order")));
    album.innerHTML = "";
    snap.docs.forEach(function (d) {
      var ph = d.data(); if (!isImg(ph.image)) return;
      var b = el("button", "shot"); b.type = "button"; b.dataset.full = ph.image; b.dataset.title = ph.caption || "";
      var fr = el("div", "frame"), img = el("img"); img.src = ph.image; img.alt = ph.caption || ""; img.decoding = "async";
      fr.appendChild(img); b.appendChild(fr);
      if (ph.caption) b.appendChild(el("span", "cap", ph.caption));
      album.appendChild(b);
    });
  } catch (e) {
    console.error(e); album.innerHTML = ""; delete album.dataset.loaded;
  }
}
