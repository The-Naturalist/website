// Field notes tab on owner.html: write, edit, publish and delete posts shown on field-notes.html.
// Photos are shrunk in the browser and saved inside the note itself, so no paid file storage is needed.
import { TOURS } from "./firebase-config.js";

var MAX_IMAGE = 700000; // characters of base64; keeps each note well under Firestore's 1 MB limit
var $ = function (id) { return document.getElementById(id); };
var db, F, unsub = null, renderList = null;
var notes = [], editing = null, image = null, dirty = false, busy = false;

// Called by owner.js after the owner signs in; returns a handle to stop on sign-out.
export function startNotes(database, firestore) {
  db = database; F = firestore;
  if (!renderList) wire();
  unsub = F.onSnapshot(F.collection(db, "notes"), function (snap) {
    notes = snap.docs.map(function (d) { var n = d.data({ serverTimestamps: "estimate" }); n.id = d.id; return n; });
    notes.sort(function (a, b) { return stamp(b) - stamp(a); });
    renderList();
  }, function (err) {
    console.error(err);
    $("fnList").innerHTML = "";
    $("fnList").appendChild(el("p", "bk-error", "Couldn't load field notes (" + err.code + "). Check the notes rules from firestore.rules are published."));
  });
  return {
    stop: function () {
      if (unsub) unsub();
      unsub = null; notes = []; editing = null; dirty = false;
      $("fnForm").hidden = true; $("fnListView").hidden = false;
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

function wire() {
  var form = $("fnForm");

  TOURS.forEach(function (t) {
    if ($("fnTour").querySelector('option[value="' + t.id + '"]')) return;
    var o = document.createElement("option"); o.value = t.id; o.textContent = t.label + (t.id === "workshop" ? "s" : t.id === "custom" ? "s" : " tour");
    $("fnTour").appendChild(o);
  });

  renderList = function () {
    var box = $("fnList"); box.innerHTML = "";
    if (!notes.length) { box.appendChild(el("p", "ow-empty", "No field notes posted from here yet. Click “Write a field note” to add the first one.")); return; }
    notes.forEach(function (n) {
      var r = el("button", "ow-row fn-row " + (n.published ? "s-confirmed" : "s-declined")); r.type = "button";
      var th = el("span", "fn-thumb");
      if (isImg(n.image)) { var i = el("img"); i.src = n.image; i.alt = ""; th.appendChild(i); }
      var main = el("div", "ow-row-main");
      main.appendChild(el("strong", null, n.title));
      main.appendChild(el("span", null, [n.category, n.topic, n.author].filter(Boolean).join(" · ")));
      r.appendChild(th); r.appendChild(main);
      var side = el("div", "fn-row-side");
      side.appendChild(el("span", "ow-pill tag", n.published ? "Published" : "Draft"));
      side.appendChild(el("span", "ow-row-date", when(n)));
      r.appendChild(side);
      r.addEventListener("click", function () { open(n); });
      box.appendChild(r);
    });
  };

  function open(n) {
    editing = n || null; image = n ? n.image : null; dirty = false;
    $("fnTitle").value = n ? n.title : "";
    $("fnBody").value = n ? n.body : "";
    $("fnCat").value = n ? n.category || "" : "";
    $("fnTopic").value = n ? n.topic || "" : "";
    $("fnAuthor").value = n ? n.author || "" : "Priyanwada Rathnayake";
    $("fnTour").value = n ? n.tour || "" : "";
    $("fnTags").value = n ? (n.tags || []).join(", ") : "";
    $("fnAlt").value = n ? n.imageAlt || "" : "";
    $("fnPhoto").value = "";
    showImage();
    setState();
    $("fnErr").hidden = true; $("fnSaved").textContent = "";
    $("fnListView").hidden = true; form.hidden = false;
    window.scrollTo(0, 0);
    $("fnTitle").focus({ preventScroll: true });
  }
  function close() {
    if (dirty && !confirm("Leave without saving your changes?")) return;
    dirty = false; editing = null;
    form.hidden = true; $("fnListView").hidden = false;
  }
  function setState() {
    var pub = editing && editing.published;
    $("fnState").textContent = !editing ? "New note" : pub ? "Published" : "Draft";
    $("fnState").className = "tag ow-pill " + (pub ? "s-confirmed" : editing ? "s-declined" : "s-new");
    $("fnPublish").textContent = pub ? "Update note" : "Publish";
    $("fnDraft").textContent = pub ? "Unpublish" : "Save as draft";
    $("fnDelete").hidden = !editing;
    $("fnView").hidden = !pub;
    if (pub) $("fnView").href = "field-notes.html#note-" + editing.id;
  }
  function showImage() {
    var ok = isImg(image);
    $("fnPreview").hidden = !ok;
    if (ok) $("fnPreview").src = image; else $("fnPreview").removeAttribute("src");
    $("fnDropMsg").hidden = ok;
    $("fnChange").hidden = !ok;
    $("fnDrop").classList.toggle("has", ok);
  }

  // Shrink the photo to at most 1800px wide and re-encode as JPEG until it fits.
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
      img.src = url;
    });
  }
  async function shrink(file) {
    var img = await loadImage(file);
    var scale = Math.min(1, 1800 / img.naturalWidth, 1800 / img.naturalHeight), q = 0.85, out = "";
    var c = document.createElement("canvas"), x = c.getContext("2d");
    for (var tries = 0; tries < 12; tries++) {
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL("image/jpeg", q);
      if (out.length <= MAX_IMAGE) return out;
      if (q > 0.62) q -= 0.08; else scale *= 0.8;
    }
    throw new Error("too big");
  }
  $("fnPhoto").addEventListener("change", async function () {
    var f = this.files[0]; if (!f) return;
    $("fnErr").hidden = true;
    $("fnDropMsg").firstChild.textContent = "Preparing photo…";
    try { image = await shrink(f); dirty = true; }
    catch (e) { fail("That photo couldn't be used. Try a JPG or PNG file."); }
    $("fnDropMsg").firstChild.textContent = "Choose a photo";
    showImage();
  });
  $("fnChange").addEventListener("click", function () { $("fnPhoto").click(); });

  function fail(msg) { $("fnErr").textContent = msg; $("fnErr").hidden = false; $("fnErr").scrollIntoView({ block: "nearest" }); }

  function collect(publish) {
    var tags = $("fnTags").value.split(",").map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 12)
      .map(function (t) { return t.slice(0, 40); });
    return {
      title: $("fnTitle").value.trim(),
      body: $("fnBody").value.replace(/\r\n/g, "\n").trim(),
      category: $("fnCat").value.trim(),
      topic: $("fnTopic").value.trim(),
      author: $("fnAuthor").value.trim(),
      tour: $("fnTour").value,
      tags: tags,
      image: image,
      imageAlt: $("fnAlt").value.trim(),
      published: publish
    };
  }

  async function save(publish) {
    if (busy) return;
    var d = collect(publish);
    if (publish || !editing) {
      if (!d.title) return fail("Add a title.");
      if (!d.body) return fail("Write the article text.");
      if (publish && !isImg(d.image)) return fail("Choose a photo for the note.");
    }
    if (!isImg(d.image)) d.image = "";
    $("fnErr").hidden = true; busy = true;
    form.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
    var now = F.serverTimestamp(), live = editing && notes.find(function (n) { return n.id === editing.id; });
    d.updatedAt = now;
    try {
      if (editing) {
        if (publish && !(live && live.publishedAt) && !editing.everPublished) d.publishedAt = now;
        await F.updateDoc(F.doc(db, "notes", editing.id), d);
      } else {
        d.createdAt = now;
        d.publishedAt = publish ? now : null;
        var ref = await F.addDoc(F.collection(db, "notes"), d);
        editing = { id: ref.id };
      }
      editing.published = publish;
      editing.title = d.title;
      editing.everPublished = editing.everPublished || publish;
      dirty = false;
      setState();
      $("fnSaved").textContent = publish ? "Published. It's live on the Field Notes page." : "Saved as a draft. Only you can see it.";
    } catch (e) {
      console.error(e);
      fail(e.code === "permission-denied" ? "The database refused the note. Make sure the latest firestore.rules are published." : "Couldn't save. Check your connection and try again.");
    } finally {
      busy = false;
      form.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
    }
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); save(true); });
  $("fnDraft").addEventListener("click", function () { save(false); });
  $("fnDelete").addEventListener("click", async function () {
    if (!confirm("Delete “" + (editing.title || "this note") + "”? It will disappear from the website. This can't be undone.")) return;
    try { await F.deleteDoc(F.doc(db, "notes", editing.id)); dirty = false; close(); }
    catch (e) { fail("Couldn't delete. Check your connection and try again."); }
  });
  $("fnNew").addEventListener("click", function () { open(null); });
  $("fnBack").addEventListener("click", close);
  form.addEventListener("input", function () { dirty = true; $("fnSaved").textContent = ""; });
  function guard(e) { if (dirty && !form.hidden) { e.preventDefault(); e.returnValue = ""; } }
  window.addEventListener("beforeunload", guard);
}
