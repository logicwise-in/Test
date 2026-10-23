// Logic Wise Google sign-in using Firebase Authentication.
// The web config is public; secure access with Firebase authorized domains and server-side token verification.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
const firebaseConfig = {
  apiKey: "AIzaSyCdMkfK2rcMd7d0LMGGdAye06FisuhMZMA",
  authDomain: "logicwise-acdda.firebaseapp.com",
  projectId: "logicwise-acdda",
  storageBucket: "logicwise-acdda.firebasestorage.app",
  messagingSenderId: "457698966679",
  appId: "1:457698966679:web:f1970cb50c948da5c17dd2",
  measurementId: "G-1PJKQSCS3G"
};
const modal=document.getElementById("authModal"),signInButton=document.getElementById("googleSignIn"),signOutButton=document.getElementById("googleSignOut"),status=document.getElementById("authStatus"),emailLabel=document.getElementById("accountEmail"),accountButton=document.getElementById("accountBtn"),title=document.getElementById("authTitle"),description=document.getElementById("authDescription");
const isConfigured=Object.values(firebaseConfig).every(value=>value&&!value.startsWith("YOUR_"));
function setStatus(message){if(status)status.textContent=message;}
if(!isConfigured){signInButton?.addEventListener("click",()=>setStatus("Setup needed: configure the Firebase Web App, enable Google sign-in and authorize your website domain. See README.md."));setStatus("Google sign-in needs Firebase setup. See README.md.");}
else{try{
 const app=initializeApp(firebaseConfig),auth=getAuth(app),provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});
 signInButton?.addEventListener("click",async()=>{signInButton.disabled=true;setStatus("Opening Google sign-in…");try{await signInWithPopup(auth,provider);setStatus("You're signed in.");}catch(error){console.error("Google sign-in error:",error);const messages={"auth/popup-closed-by-user":"The sign-in window was closed before sign-in finished.","auth/unauthorized-domain":"This website domain is not authorized in Firebase Authentication settings.","auth/popup-blocked":"Your browser blocked the popup. Allow popups and try again."};setStatus(messages[error.code]||"Sign-in didn't complete. Check Firebase setup and try again.");}finally{signInButton.disabled=false;}});
 signOutButton?.addEventListener("click",async()=>{try{await signOut(auth);setStatus("You have signed out.");}catch(error){console.error("Sign-out error:",error);setStatus("Could not sign out. Please try again.");}});
 onAuthStateChanged(auth,user=>{window.shopwiseFirebaseUser=user||null;window.dispatchEvent(new CustomEvent("shopwise-auth-state",{detail:{user:user||null}}));
  if(user){if(accountButton)accountButton.textContent="♙ "+(user.displayName||"My account");if(title)title.textContent="You're signed in";if(description)description.textContent="Your Google account is connected to Logic Wise.";if(emailLabel)emailLabel.textContent=user.email||"";if(signInButton)signInButton.hidden=true;if(signOutButton)signOutButton.hidden=false;setStatus("Signed in successfully with Google.");}
  else{if(accountButton)accountButton.textContent="♙ Account";if(title)title.textContent="Welcome to Logic Wise";if(description)description.textContent="Sign in securely with Google to configure your website project.";if(emailLabel)emailLabel.textContent="";if(signInButton)signInButton.hidden=false;if(signOutButton)signOutButton.hidden=true;setStatus("Choose Google sign-in to continue.");}
 });
}catch(error){console.error("Firebase initialization error:",error);setStatus("Firebase could not be initialized. Check auth.js configuration.");}}
