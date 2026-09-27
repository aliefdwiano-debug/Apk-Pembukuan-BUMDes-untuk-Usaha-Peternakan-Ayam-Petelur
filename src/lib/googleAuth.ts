import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Use session persistence to avoid IndexedDB locks/closing issues on mobile browsers
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.warn('Failed to set session persistence:', err);
});

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Load stored token from session memory if available
try {
  const stored = sessionStorage.getItem('bumdes_g_access_token');
  if (stored) cachedAccessToken = stored;
} catch (e) {
  console.warn('Session storage error:', e);
}

// Check redirect result on load for mobile login flows
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        try {
          sessionStorage.setItem('bumdes_g_access_token', cachedAccessToken);
        } catch (e) {}
      }
    }
  })
  .catch((err) => {
    console.warn('Redirect result check error:', err);
  });

export const initAuthListener = (
  onSuccess: (user: User, token: string) => void,
  onFailed: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      onSuccess(user, cachedAccessToken);
    } else if (user && !cachedAccessToken && !isSigningIn) {
      onFailed();
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('bumdes_g_access_token');
      } catch (e) {}
      onFailed();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    await setPersistence(auth, browserSessionPersistence).catch(() => {});

    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      const errMsg = popupErr?.message || '';
      console.warn('Popup sign in failed, attempting redirect or fallback:', popupErr);

      // If popup failed due to mobile closing DB, popup blocked, or closed by user, try redirect
      if (
        errMsg.includes('closing') ||
        errMsg.includes('hidden') ||
        popupErr?.code === 'auth/popup-blocked' ||
        popupErr?.code === 'auth/internal-error'
      ) {
        console.info('Switching to signInWithRedirect for mobile browser stability...');
        await signInWithRedirect(auth, provider);
        // signInWithRedirect redirects the page, so this line won't complete until return
        return new Promise(() => {});
      }
      throw popupErr;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('bumdes_g_access_token', cachedAccessToken);
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Sign in error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const signInWithGoogleRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await setPersistence(auth, browserSessionPersistence).catch(() => {});
  await signInWithRedirect(auth, provider);
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('bumdes_g_access_token');
  } catch (e) {}
};

