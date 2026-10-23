// Shopwise Google sign-in using Firebase Authentication.
// Firebase web config is public; secure your project with authorized domains and proper Firebase rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdMkfK2rcMd7d0LMGGdAye06FisuhMZMA",
  authDomain: "logicwise-acdda.firebaseapp.com",
  projectId: "logicwise-acdda",
  storageBucket: "logicwise-acdda.firebasestorage.app",
  messagingSenderId: "457698966679",
  appId: "1:457698966679:web:f1970cb50c948da5c17dd2",
  measurementId: "G-1PJKQSCS3G"
};

const modal = document.getElementById("authModal");
const signInButton = document.getElementById("googleSignIn");
const signOutButton = document.getElementById("googleSignOut");
const status = document.getElementById("authStatus");
const emailLabel = document.getElementById("accountEmail");
const accountButton = document.getElementById("accountBtn");
const title = document.getElementById("authTitle");
const description = document.getElementById("authDescription");

const isConfigured = Object.values(firebaseConfig).every(
  value => value && !value.startsWith("YOUR_")
);

function setStatus(message) {
  status.textContent = message;
}

if (!isConfigured) {
  signInButton.addEventListener("click", () => {
    setStatus("Setup needed: add your Firebase Web App config in auth.js, enable Google sign-in, and authorize your website domain. See README.md.");
  });
  setStatus("Google sign-in is ready to configure. Follow the Firebase setup steps in README.md.");
} else {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    signInButton.addEventListener("click", async () => {
      signInButton.disabled = true;
      setStatus("Opening Google sign-in…");
      try {
        await signInWithPopup(auth, provider);
        setStatus("You're signed in.");
      } catch (error) {
        console.error("Google sign-in error:", error);
        const messages = {
          "auth/popup-closed-by-user": "The sign-in window was closed before sign-in finished.",
          "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings.",
          "auth/popup-blocked": "Your browser blocked the popup. Allow popups and try again."
        };
        setStatus(messages[error.code] || "Sign-in didn't complete. Check your Firebase setup and try again.");
      } finally {
        signInButton.disabled = false;
      }
    });

    signOutButton.addEventListener("click", async () => {
      try {
        await signOut(auth);
        setStatus("You have signed out.");
      } catch (error) {
        console.error("Sign-out error:", error);
        setStatus("Could not sign out. Please try again.");
      }
    });

    onAuthStateChanged(auth, user => {
      window.dispatchEvent(new CustomEvent("shopwise-auth-state", {
        detail: { user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null }
      }));
      if (user) {
        const displayName = user.displayName || user.email || "My account";
        accountButton.textContent = "♙ " + displayName;
        title.textContent = "You're signed in";
        description.textContent = "Your Google account is connected to this Shopwise demo.";
        emailLabel.textContent = user.email || "";
        signInButton.style.display = "none";
        signOutButton.style.display = "flex";
        setStatus("Signed in successfully with Google.");
      } else {
        accountButton.textContent = "♙ Account";
        title.textContent = "Welcome to Shopwise";
        description.textContent = "Sign in securely with your Google account to personalize your shopping experience.";
        emailLabel.textContent = "";
        signInButton.style.display = "flex";
        signOutButton.style.display = "none";
        setStatus("Choose Google sign-in to continue.");
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    setStatus("Firebase setup could not be loaded. Check the configuration in auth.js.");
  }
}
