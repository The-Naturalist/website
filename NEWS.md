# News & Events

`news.html` (the **News** link in the menu) lists events, tour specials and announcements
as cards. Visitors can filter by Events, Tour specials or News, and clicking a card opens the
full post with its photo album. Each post has its own link, for example
`thenaturalist.lk/news.html#post-abc123`, which you can share on Facebook or WhatsApp.

There are two ways to add a post.

## A. From the web editor (recommended)

Sign in on the private owner page and post from any computer or phone. Nothing goes
through GitHub.

### One-time setup (about 15 minutes, free)

The editor needs the free Firebase project described in `BOOKINGS-SETUP.md`.

1. Do steps 1 and 2 of `BOOKINGS-SETUP.md`: create the Firebase project with
   thenaturalist.lk@gmail.com, turn on Firestore and Google sign-in, and paste the six values
   into `assets/js/firebase-config.js`.
2. When it says to paste `firestore.rules`, use the one in this folder. It already has the
   rules for news. If Firebase is already set up, open **Firestore Database → Rules**,
   replace everything with this `firestore.rules`, and click **Publish**.

### Posting

1. Go to https://thenaturalist.lk/owner.html#news and sign in with thenaturalist.lk@gmail.com.
2. Click **Write a news post**.
3. Choose what it is: **Event**, **Tour special** or **News**.
4. Choose a cover photo. Large photos are made smaller automatically.
5. Write the title and the write-up. Leave an empty line between paragraphs. The first
   paragraph is also shown on the card.
6. Optionally add the date (and an end date for events that run over several days), where it
   happened, and a tour to link to.
7. Under **Photo album**, click **+ Add photos** and pick several at once (up to 40). Add a
   caption under any photo, use the arrows to change the order, or remove one.
8. Click **Publish**. The post appears at the top of the News page straight away.

**Save as draft** keeps a post private until it's ready. To change a post later, click it in
the list, edit, and click **Update post**. **Unpublish** takes it off the site without deleting
it, and **Delete post** removes it and its photos for good. **View on site** opens the post.

Tour specials get an **Ask on WhatsApp** button that opens a message naming the special.

### Good to know

- Photos are stored in the free Firebase database (about 300 KB each after resizing).
  The free plan holds 1 GB, which is roughly 3,000 photos.
- Only the business Google account can post. Anyone else who opens owner.html is refused.

## B. By hand on GitHub (works without Firebase)

1. Upload the photos to `assets/img/news/` on GitHub.
2. Open `news.html` on GitHub and click the pencil to edit it.
3. Find the note that starts `HOW TO ADD A POST BY HAND`. Copy the example post under it
   (from `<section class="nw-post"` down to `</section>`) and paste it just below that note,
   outside the `<!--  -->` comment.
4. Change the `id` (letters, numbers and dashes, used in the link), `data-type`
   (`event`, `special` or `news`), the photo file names and the text. Delete lines you don't need.
5. Click **Commit changes**.

Posts from the web editor always show above hand-written ones.
