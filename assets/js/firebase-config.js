// Firebase settings for bookings and the owner login.
// Paste the values from Firebase console > Project settings > Your apps > Web app.
// These values are safe to publish: access is controlled by firestore.rules.
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// Google accounts allowed into owner.html. Keep in sync with firestore.rules.
export const OWNER_EMAILS = ["thenaturalist.lk@gmail.com"];

// Tours offered in the booking form. "days" sets how long a booking spans on the calendar.
export const TOURS = [
  { id: "wildlife", label: "Wildlife", days: 10 },
  { id: "herping", label: "Herping", days: 10 },
  { id: "birding", label: "Birding", days: 10 },
  { id: "culture", label: "Culture", days: 7 },
  { id: "heritage", label: "Heritage", days: 8 },
  { id: "custom", label: "Custom tour", days: null },
  { id: "workshop", label: "Workshop", days: 1 }
];

export const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE");
