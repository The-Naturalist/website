// News & events tab on owner.html: write, edit, publish and delete posts shown on news.html.
// Photos are shrunk in the browser. The cover is saved inside the post; each album photo is saved
// as its own document under news/{post}/photos, so a post can hold many photos on the free plan.
import { TOURS } from "./firebase-config.js";

var MAX_COVER = 450000, MAX_PHOTO = 450000, MAX_ALBUM = 40; // characters of base64; Firestore allows 1 MB per document
var TYPES = { event: "Event", special: "Tour special", news: "News" };
var $ = function (id) { return document.getElementById(id); };
var db, F, unsub = null, renderList = null;
var posts = [], editing = null, image = null, album = [], original = {}, dirty = false, busy = false;

// Called by owner.js after the owner signs in; returns a handle to stop on sign-out.
export function startNews(database, firestore) {
  db = database; F = firestore;
  if (!renderList) wire();
  unsub = F.onSnapshot(F.collection(db, "news"), function (snap) {
    posts = snap.docs.map(function (d) { var n = d.data({ serverTimestamps: "estimate" }); n.id = d.id; return n; });
    posts.sort(function (a, b) { return stamp(b) - stamp(a); });
    renderList();
  }, function (err) {
    console.error(err);
    $("nwOwnList").innerHTML = "";
    $("nwOwnList").appendChild(el("p", "bk-error", "Couldn't load news posts (" + err.code + "). Check the news rules from firestore.rules are published."));
  });
  return {
    stop: function () {
      if (unsub) unsub();
      unsub = null; posts = []; editing = null; dirty = false;
      $("nwForm").hidden = true; $("nwListView").hidden = false;
    }
  };
}

function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function stamp(n) { var t = n.publishedAt || n.createdAt; return t && t.toMillis ? t.toMillis() : Date.now(); }
function isImg(s) { return typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(s); }
function when(n) {
  var t = n.publishedAt || n.updatedAt || n.createdAt;
  return t && t.toDate ? t.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

// Shrink a photo to at most 1600px and re-encode as JPEG until it fits.
function loadImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}
async function shrink(file, max) {
  var img = await loadImage(file);
  var scale = Math.min(1, 1600 / img.naturalWidth, 1600 / img.naturalHeight), q = 0.82, out = "";
  var c = document.createElement("canvas"), x = c.getContext("2d");
  for (var tries = 0; tries < 12; tries++) {
    c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length <= max) return out;
    if (q > 0.62) q -= 0.08; else scale *= 0.8;
  }
  throw new Error("too big");
}

function wire() {
  var form = $("nwForm");

  TOURS.forEach(function (t) {
    if ($("nwTour").querySelector('option[value="' + t.id + '"]')) return;
    var o = document.createElement("option"); o.value = t.id; o.textContent = t.label + (t.id === "workshop" || t.id === "custom" ? "s" : " tour");
    $("nwTour").appendChild(o);
  });

  renderList = function () {
    var box = $("nwOwnList"); box.innerHTML = "";
    if (!posts.length) { box.appendChild(el("p", "ow-empty", "No news posted from here yet. Click “Write a news post” to add the first one.")); return; }
    posts.forEach(function (n) {
      var r = el("button", "ow-row fn-row " + (n.published ? "s-confirmed" : "s-declined")); r.type = "button";
      var th = el("span", "fn-thumb");
      if (isImg(n.image)) { var i = el("img"); i.src = n.image; i.alt = ""; th.appendChild(i); }
      var main = el("div", "ow-row-main");
      main.appendChild(el("strong", null, n.title));
      main.appendChild(el("span", null, [TYPES[n.type], n.place, n.photoCount ? n.photoCount + " photos" : ""].filter(Boolean).join(" · ")));
      r.appendChild(th); r.appendChild(main);
      var side = el("div", "fn-row-side");
      side.appendChild(el("span", "ow-pill tag", n.published ? "Published" : "Draft"));
      side.appendChild(el("span", "ow-row-date", when(n)));
      r.appendChild(side);
      r.addEventListener("click", function () { open(n); });
      box.appendChild(r);
    });
  };

  function type() { var c = form.querySelector('input[name="nwType"]:checked'); return c ? c.value : "news"; }

  async function open(n) {
    editing = n || null; image = n ? n.image : null; album = []; original = {}; dirty = false;
    var t = n && TYPES[n.type] ? n.type : "event";
    form.querySelectorAll('input[name="nwType"]').forEach(function (r) { r.checked = r.value === t; });
    $("nwTitle").value = n ? n.title : "";
    $("nwBody").value = n ? n.body : "";
    $("nwDate").value = n ? n.date || "" : "";
    $("nwDateEnd").value = n ? n.dateEnd || "" : "";
    $("nwPlace").value = n ? n.place || "" : "";
    $("nwTour").value = n ? n.tour || "" : "";
    $("nwAlt").value = n ? n.imageAlt || "" : "";
    $("nwPhoto").value = ""; $("nwPhotos").value = "";
    showImage(); showAlbum(); setState();
    $("nwErr").hidden = true; $("nwSaved").textContent = "";
    $("nwListView").hidden = true; form.hidden = false;
    window.scrollTo(0, 0);
    $("nwTitle").focus({ preventScroll: true });
    if (n && n.photoCount) {
      $("nwCount").textContent = "loading…";
      try {
        var snap = await F.getDocs(F.query(F.collection(db, "news", n.id, "photos"), F.orderBy("order")));
        if (editing !== n) return;
        album = snap.docs.map(function (d) { var p = d.data(); original[d.id] = { caption: p.caption || "", order: p.order }; return { id: d.id, image: p.image, caption: p.caption || "" }; });
      } catch (e) { console.error(e); fail("Couldn't load this post's photos. Check your connection and open it again."); }
      showAlbum();
    }
  }
  function close() {
    if (dirty && !confirm("Leave without saving your changes?")) return;
    dirty = false; editing = null;
    form.hidden = true; $("nwListView").hidden = false;
  }
  function setState() {
    var pub = editing && editing.published;
    $("nwState").textContent = !editing ? "New post" : pub ? "Published" : "Draft";
    $("nwState").className = "tag ow-pill " + (pub ? "s-confirmed" : editing ? "s-declined" : "s-new");
    $("nwPublish").textContent = pub ? "Update post" : "Publish";
    $("nwDraft").textContent = pub ? "Unpublish" : "Save as draft";
    $("nwDelete").hidden = !editing;
    $("nwView").hidden = !pub;
    if (pub) $("nwView").href = "news.html#post-" + editing.id;
  }
  function showImage() {
    var ok = isImg(image);
    $("nwPreview").hidden = !ok;
    if (ok) $("nwPreview").src = image; else $("nwPreview").removeAttribute("src");
    $("nwDropMsg").hidden = ok;
    $("nwChange").hidden = !ok;
    $("nwDrop").classList.toggle("has", ok);
  }
  function showAlbum() {
    var box = $("nwAlbum"); box.innerHTML = "";
    album.forEach(function (p, i) {
      var item = el("div", "nw-ph");
      var th = el("div", "nw-ph-img"), im = el("img"); im.src = p.image; im.alt = ""; th.appendChild(im); item.appendChild(th);
      var cap = el("input"); cap.maxLength = 200; cap.placeholder = "Caption (optional)"; cap.value = p.caption;
      cap.setAttribute("aria-label", "Caption for photo " + (i + 1));
      cap.addEventListener("input", function () { p.caption = cap.value; });
      item.appendChild(cap);
      var tools = el("div", "nw-ph-tools");
      var mk = function (label, aria, fn, off) {
        var b = el("button", "copy", label); b.type = "button"; b.setAttribute("aria-label", aria); b.disabled = !!off;
        b.addEventListener("click", function () { fn(); dirty = true; showAlbum(); }); tools.appendChild(b);
      };
      mk("←", "Move photo " + (i + 1) + " earlier", function () { album.splice(i - 1, 0, album.splice(i, 1)[0]); }, i === 0);
      mk("→", "Move photo " + (i + 1) + " later", function () { album.splice(i + 1, 0, album.splice(i, 1)[0]); }, i === album.length - 1);
      mk("Remove", "Remove photo " + (i + 1), function () { album.splice(i, 1); });
      item.appendChild(tools);
      box.appendChild(item);
    });
    $("nwCount").textContent = album.length ? album.length + " of " + MAX_ALBUM : "optional";
    $("nwAdd").hidden = album.length >= MAX_ALBUM;
  }

  $("nwPhoto").addEventListener("change", async function () {
    var f = this.files[0]; if (!f) return;
    $("nwErr").hidden = true;
    $("nwDropMsg").firstChild.textContent = "Preparing photo…";
    try { image = await shrink(f, MAX_COVER); dirty = true; }
    catch (e) { fail("That photo couldn't be used. Try a JPG or PNG file."); }
    $("nwDropMsg").firstChild.textContent = "Choose a cover photo";
    showImage();
  });
  $("nwChange").addEventListener("click", function () { $("nwPhoto").click(); });
  $("nwPhotos").addEventListener("change", async function () {
    var files = Array.prototype.slice.call(this.files, 0, MAX_ALBUM - album.length), bad = 0;
    $("nwErr").hidden = true;
    for (var i = 0; i < files.length; i++) {
      $("nwCount").textContent = "preparing " + (i + 1) + " of " + files.length + "…";
      try { album.push({ id: null, image: await shrink(files[i], MAX_PHOTO), caption: "" }); dirty = true; }
      catch (e) { bad++; }
    }
    this.value = "";
    showAlbum();
    if (bad) fail(bad + (bad === 1 ? " photo" : " photos") + " couldn't be used. Try JPG or PNG files.");
  });

  function fail(msg) { $("nwErr").textContent = msg; $("nwErr").hidden = false; $("nwErr").scrollIntoView({ block: "nearest" }); }

  function collect(publish) {
    return {
      type: type(),
      title: $("nwTitle").value.trim(),
      body: $("nwBody").value.replace(/\r\n/g, "\n").trim(),
      date: $("nwDate").value,
      dateEnd: $("nwDateEnd").value,
      place: $("nwPlace").value.trim(),
      tour: $("nwTour").value,
      image: image,
      imageAlt: $("nwAlt").value.trim(),
      photoCount: album.length,
      published: publish
    };
  }

  // Bring news/{id}/photos in line with the album on screen: add new, update changed, delete removed.
  async function syncPhotos(id) {
    var keep = {};
    for (var i = 0; i < album.length; i++) {
      var p = album[i], o = p.id && original[p.id];
      $("nwSaved").textContent = "Saving photo " + (i + 1) + " of " + album.length + "…";
      if (!p.id) {
        var ref = await F.addDoc(F.collection(db, "news", id, "photos"), { image: p.image, caption: p.caption.trim(), order: i });
        p.id = ref.id;
      } else if (o.caption !== p.caption.trim() || o.order !== i) {
        await F.updateDoc(F.doc(db, "news", id, "photos", p.id), { caption: p.caption.trim(), order: i });
      }
      original[p.id] = { caption: p.caption.trim(), order: i };
      keep[p.id] = true;
    }
    for (var gone in original) {
      if (!keep[gone]) { await F.deleteDoc(F.doc(db, "news", id, "photos", gone)); delete original[gone]; }
    }
  }

  async function save(publish) {
    if (busy) return;
    var d = collect(publish);
    if (publish || !editing) {
      if (!d.title) return fail("Add a title.");
      if (!d.body) return fail("Write the post text.");
      if (publish && !isImg(d.image)) return fail("Choose a cover photo for the post.");
    }
    if (d.date && d.dateEnd && d.dateEnd < d.date) return fail("The “Until” date is before the start date.");
    if (!isImg(d.image)) d.image = "";
    $("nwErr").hidden = true; busy = true;
    form.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
    var now = F.serverTimestamp(), live = editing && posts.find(function (n) { return n.id === editing.id; });
    d.updatedAt = now;
    try {
      if (editing) {
        if (publish && !(live && live.publishedAt) && !editing.everPublished) d.publishedAt = now;
        await F.updateDoc(F.doc(db, "news", editing.id), d);
      } else {
        d.createdAt = now;
        d.publishedAt = publish ? now : null;
        var ref = await F.addDoc(F.collection(db, "news"), d);
        editing = { id: ref.id };
      }
      await syncPhotos(editing.id);
      editing.published = publish;
      editing.title = d.title;
      editing.everPublished = editing.everPublished || publish;
      dirty = false;
      setState();
      $("nwSaved").textContent = publish ? "Published. It's live on the News & Events page." : "Saved as a draft. Only you can see it.";
    } catch (e) {
      console.error(e);
      $("nwSaved").textContent = "";
      fail(e.code === "permission-denied" ? "The database refused the post. Make sure the latest firestore.rules are published." : "Couldn't save everything. Check your connection and click the button again.");
    } finally {
      busy = false;
      form.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      showAlbum();
    }
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); save(true); });
  $("nwDraft").addEventListener("click", function () { save(false); });
  $("nwDelete").addEventListener("click", async function () {
    if (!confirm("Delete “" + (editing.title || "this post") + "” and its photos? It will disappear from the website. This can't be undone.")) return;
    try {
      var snap = await F.getDocs(F.collection(db, "news", editing.id, "photos"));
      for (var i = 0; i < snap.docs.length; i++) await F.deleteDoc(snap.docs[i].ref);
      await F.deleteDoc(F.doc(db, "news", editing.id)); dirty = false; close();
    } catch (e) { fail("Couldn't delete. Check your connection and try again."); }
  });
  $("nwNew").addEventListener("click", function () { open(null); });
  $("nwBack").addEventListener("click", close);
  form.addEventListener("input", function () { dirty = true; $("nwSaved").textContent = ""; });
  function guard(e) { if (dirty && !form.hidden) { e.preventDefault(); e.returnValue = ""; } }
  window.addEventListener("beforeunload", guard);
}
