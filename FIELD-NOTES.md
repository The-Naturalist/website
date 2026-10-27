# Posting field notes

The owner can post a field note (one photo plus an article) straight onto
`field-notes.html`, from the same private page used for bookings.

## One-time setup

This uses the Firebase project from `BOOKINGS-SETUP.md`, so do that first. Then:

1. Open https://console.firebase.google.com → the `the-naturalist` project →
   **Firestore Database → Rules**.
2. Replace everything with the new `firestore.rules` from this website folder and click **Publish**.
   (The bookings rules inside it are unchanged; it only adds rules for notes.)

No paid plan or extra storage is needed: photos are shrunk in the browser and saved with the note.

## Writing a note

1. Go to https://thenaturalist.lk/owner.html and sign in with thenaturalist.lk@gmail.com.
2. Open the **Field notes** tab and click **Write a field note**.
3. Choose a photo, add a short description of it, the title and the article.
   Leave an empty line between paragraphs.
4. Optionally add the kind of note (shown above the title, like "People"), a topic,
   tags separated by commas, and a tour to link to.
5. Click **Publish**. The note appears at the top of the Field Notes page straight away,
   newest first, above the notes already written into the page.

**Save as draft** keeps a note private until it's ready. To change a note later, click it
in the list, edit, and click **Update note**. **Unpublish** takes it off the site without
deleting it; **Delete note** removes it for good.

Each note has its own link (`field-notes.html#note-…`); **View on site** opens it.
