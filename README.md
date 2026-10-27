# The Naturalist website

Static site for thenaturalist.lk. Plain HTML, CSS and a little JavaScript; no build step needed to host it.

- `index.html`, `about-us.html`, `tours.html`, `gallery.html`, `field-notes.html`, `workshops.html`, `contact.html`
- `tours/*.html`: one page per tour
- `assets/css/style.css`, `assets/js/site.js`: shared styles and behaviour

Photos live in `assets/img/`. To swap one, upload a new file with the same name.

## Bookings

- `book.html`: public booking form; tour pages link to it with `?tour=<id>`
- `owner.html`: private owner dashboard (Google sign-in, list and calendar)
- `assets/js/firebase-config.js`, `firestore.rules`: Firebase settings and access rules

First-time setup is in `BOOKINGS-SETUP.md`.

## Field notes

- `owner.html` (Field notes tab): the owner writes, edits and publishes notes
- `assets/js/owner-notes.js`, `assets/js/field-notes.js`: the editor and the public list on `field-notes.html`

How to post is in `FIELD-NOTES.md`.
