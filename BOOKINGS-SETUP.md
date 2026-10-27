# Bookings and owner login: one-time setup

Visitors book on `book.html`. The owner signs in at `thenaturalist.lk/owner.html`
with Google to see every booking in a list and on a calendar. Bookings are stored
in Firebase (free plan), and only the owner's Google account can read them.

Until these steps are done, the booking form tells visitors to use WhatsApp instead.

## 1. Create the Firebase project (about 10 minutes)

1. Go to https://console.firebase.google.com and sign in with **thenaturalist.lk@gmail.com**.
2. **Add project** → name it `the-naturalist` → you can turn Google Analytics off → **Create**.
3. In the left menu, **Build → Firestore Database → Create database**.
   Pick a location near Sri Lanka (for example `asia-south1 (Mumbai)`), start in **production mode**.
4. Open the **Rules** tab, delete what's there, paste the whole of `firestore.rules`
   from this website folder, and click **Publish**.
5. **Build → Authentication → Get started → Google** → turn it on, choose the support
   email, **Save**.
6. Still in Authentication, open **Settings → Authorized domains → Add domain** and add
   `thenaturalist.lk` (and `www.thenaturalist.lk` if the site uses it).
7. Click the gear icon → **Project settings** → under "Your apps" click the **</>** (Web)
   icon → nickname `website` → **Register app**. Firebase shows a `firebaseConfig` block.

## 2. Paste the settings into the website

Open `assets/js/firebase-config.js` and replace the six `PASTE_...` values with the ones
Firebase showed you. Upload the changed file to GitHub as usual. These values are not
secret; the rules from step 4 are what keep bookings private.

## 3. Try it

1. Open https://thenaturalist.lk/book.html and send a test booking.
2. Open https://thenaturalist.lk/owner.html, click **Sign in with Google**, and choose
   thenaturalist.lk@gmail.com. The test booking appears on the calendar and in the list.
3. Click it to confirm, decline, add a private note, reply by email or WhatsApp, or delete it.

## Changing who can sign in

The owner account is listed in two places, and they must match:
`OWNER_EMAILS` in `assets/js/firebase-config.js`, and the `isOwner()` line in
`firestore.rules` (re-publish the rules in the Firebase console after editing).

## Good to know

- `owner.html` is not linked anywhere on the site and is hidden from search engines.
  Anyone who finds it only sees a sign-in button; other Google accounts are refused,
  both on the page and by the database rules.
- Tour lengths shown on the calendar come from `TOURS` in `assets/js/firebase-config.js`.
- The free Firebase plan allows 20,000 new bookings and 50,000 reads a day, far more
  than the site needs.
