// Field Notes page: shows notes the owner published from owner.html, newest first,
// above the notes written into this page. Does nothing until Firebase is set up.
import { firebaseConfig, isConfigured, TOURS } from "./firebase-config.js";

var TOUR_PAGES = { custom: "tours/customised-tours.html", workshop: "workshops.html" };
var box = document.getElementById("posted");

if (isConfigured && box) load().catch(function (e) { console.error("Field notes didn't load", e); });

async function load() {
  var A = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
  var F = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-lite.js");
  var db = F.getFirestore(A.initializeApp(firebaseConfig));
  if (new URLSearchParams(location.search).has("emulator")) F.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  var snap = await F.getDocs(F.query(F.collection(db, "notes"), F.where("published", "==", true)));
  var notes = snap.docs.map(function (d) { var n = d.data(); n.id = d.id; return n; });
  notes.sort(function (a, b) { return ms(b) - ms(a); });
  notes.forEach(function (n) { box.appendChild(render(n)); });
  if (location.hash && document.getElementById(location.hash.slice(1))) document.getElementById(location.hash.slice(1)).scrollIntoView();
}

function ms(n) { var t = n.publishedAt || n.createdAt; return t && t.toMillis ? t.toMillis() : 0; }
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function fact(label, value) {
  var w = el("div"); w.appendChild(el("dt", "tag", label));
  var dd = typeof value === "string" ? el("dd", null, value) : value;
  w.appendChild(dd); return w;
}

// Same markup as the hand-written article below it in field-notes.html.
function render(n) {
  var wrap = el("div", "wrap"), row = el("div", "article fn-post");
  wrap.id = "note-" + n.id;
  var art = el("article");
  var hId = "note-h-" + n.id;
  art.setAttribute("aria-labelledby", hId);

  if (/^data:image\/(jpeg|png|webp);base64,/.test(n.image || "")) {
    var fr = el("div", "frame c"), img = el("img");
    img.src = n.image; img.alt = n.imageAlt || ""; img.decoding = "async";
    fr.appendChild(img); art.appendChild(fr);
  }
  art.appendChild(el("span", "eyebrow tag", "Field note" + (n.category ? " · " + n.category : "")));
  var h = el("h2", null, n.title); h.id = hId; art.appendChild(h);
  var prose = el("div", "prose");
  (n.body || "").split(/\n\s*\n/).forEach(function (para) {
    var p = el("p");
    para.trim().split("\n").forEach(function (line, i) { if (i) p.appendChild(el("br")); p.appendChild(document.createTextNode(line)); });
    prose.appendChild(p);
  });
  art.appendChild(prose);
  row.appendChild(art);

  var aside = el("dl", "aside");
  if (n.topic) aside.appendChild(fact("Topic", n.topic));
  if (n.author) aside.appendChild(fact("Written by", n.author));
  var t = n.publishedAt || n.createdAt;
  if (t && t.toDate) aside.appendChild(fact("Posted", t.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })));
  if (n.tags && n.tags.length) {
    var pills = el("dd", "pills");
    n.tags.forEach(function (tag) { pills.appendChild(el("span", null, tag)); });
    aside.appendChild(fact("Tags", pills));
  }
  var see = el("dd"), tour = TOURS.find(function (x) { return x.id === n.tour; });
  if (tour) {
    var a = el("a", null, tour.label + (tour.id === "custom" || tour.id === "workshop" ? "s" : " tour"));
    a.href = TOUR_PAGES[tour.id] || "tours/" + tour.id + ".html";
    see.appendChild(a); see.appendChild(document.createTextNode(" · "));
  }
  var g = el("a", null, "Gallery"); g.href = "gallery.html"; see.appendChild(g);
  aside.appendChild(fact("See it on", see));
  row.appendChild(aside);

  wrap.appendChild(row);
  return wrap;
}
