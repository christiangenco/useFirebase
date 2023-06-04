import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";

import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from "firebase/firestore";

import { getAuth, onAuthStateChanged } from "firebase/auth";

import { getAnalytics, setUserProperties } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import {
  FirebaseContext,
  FirestoreContext,
  FirebaseUserContext,
  SettingsContext,
} from "./context";
import { getUserProperties } from "./auth/getUserProperties";
import { storeUser } from "./auth/storeUser";

export function FirebaseProvider({
  children,
  config,
  enablePersistence,
  uid,
  functionsEmulatorPort = null,
  firestoreEmulatorPort = null,
  storageEmulatorPort = null,
  appCheckSiteKey = null,
  httpHost = null,
  userDataKey = "uid",
}) {
  const firebaseApp = initializeApp(config);

  const [user, setUser] = useState(null);

  const [settings, setSettings] = useState({
    storageEmulatorPort,
    httpHost,
    config,
  });

  const db = getFirestore(firebaseApp);
  if (firestoreEmulatorPort) {
    if (!global["FIRESTORE_EMULATOR_CONNECTED"]) {
      connectFirestoreEmulator(db, "localhost", firestoreEmulatorPort);
      global["FIRESTORE_EMULATOR_CONNECTED"] = true;
    }
  }

  // const auth = getAuth(firebaseApp);
  const auth = getAuth();

  const isServer = typeof window === "undefined";

  const analytics = isServer ? null : getAnalytics(firebaseApp);

  if (functionsEmulatorPort) {
    // getApp()
    const functions = getFunctions(firebaseApp);
    connectFunctionsEmulator(functions, "localhost", functionsEmulatorPort);
  }

  useEffect(() => {
    if (enablePersistence && false) {
      enableIndexedDbPersistence(db, { synchronizeTabs: true }).catch((err) => {
        if (err.code == "failed-precondition") {
          alert(
            "Oh yikes—looks like multiple tabs are open. Offline support may get weird."
          );
        } else if (err.code == "unimplemented") {
          // The current browser does not support all of the
          // features required to enable persistence
          console.error(
            "Offline Firestore persistence isn't supported in this browser."
          );
        }
      });
    }
  }, [enablePersistence, config]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      const userData = getUserProperties(user);
      // console.log({ userData });

      // if(user)
      // const { uid, displayName, photoURL, email, isAnonymous } = user;
      // const { creationTime, lastSignInTime } = user.metadata;

      if (uid) {
        console.info(
          "Using non-logged-in user.uid (for debugging. Hi Christian!)",
          uid
        );
        setUser((await getDoc(doc(db, "users", uid))).data());
      } else {
        setUser(userData || null);
        if (userData) setUserProperties(analytics, { userData });
      }

      await storeUser({ user, db, userDataKey });
    });
  }, [db, uid]);

  useEffect(() => {
    if (appCheckSiteKey && firebaseApp) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN =
        window.location.hostname === "localhost";
      const appCheck = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }, [firebaseApp, appCheckSiteKey]);

  return (
    <FirebaseContext.Provider value={firebaseApp}>
      <FirestoreContext.Provider value={db}>
        <FirebaseUserContext.Provider value={user}>
          <SettingsContext.Provider value={settings}>
            {children}
          </SettingsContext.Provider>
        </FirebaseUserContext.Provider>
      </FirestoreContext.Provider>
    </FirebaseContext.Provider>
  );
}
