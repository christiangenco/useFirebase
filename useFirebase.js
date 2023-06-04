"use client";

import React, { useState, useEffect } from "react";

// yarn add firebase@9.6.4 react-firebase-hooks lodash.debounce lodash.mapvalues lodash.isarray lodash.mergewith

// const { data, add, update, remove, loading, error } = useCollection("pages")
// const { data, update, debouncedUpdate, remove, loading, error } = useDoc("pages/foo");

// V9
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  serverTimestamp,
  deleteField,
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  addDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collectionGroup,
  getCountFromServer,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getBlob,
  // updateMetadata,
  // getMetadata,
  deleteObject,
  connectStorageEmulator,
} from "firebase/storage";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
// import { getPerformance } from "firebase/performance";
import { getAnalytics, logEvent, setUserProperties } from "firebase/analytics";
const {
  initializeAppCheck,
  ReCaptchaV3Provider,
} = require("firebase/app-check");

import debounce from "lodash.debounce";
import mapValues from "lodash.mapvalues";
// import merge from "lodash.merge";
import mergeWith from "lodash.mergewith";
import isArray from "lodash.isarray";

// apparently I can't destructure *and* rename when using the ES6 import
const {
  useCollection: useCollectionHook,
  useCollectionOnce,
  useDocumentData,
  useDocumentDataOnce,
} = require("react-firebase-hooks/firestore");

const FirebaseContext = React.createContext();
const FirestoreContext = React.createContext();
const FirebaseUserContext = React.createContext();
const SettingsContext = React.createContext();

function getUserProperties(user) {
  if (!user) return null;

  const { uid, displayName, photoURL, email, phoneNumber, isAnonymous } = user;
  const { creationTime, lastSignInTime } = user.metadata;
  const userData = {
    uid,
    displayName,
    photoURL,
    email,
    phoneNumber,
    isAnonymous,
  };

  // if(!userData.photoURL){
  //   userData.photoURL = `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}`
  // }

  if (creationTime) userData.creationTime = new Date(creationTime);
  if (lastSignInTime) userData.lastSignInTime = new Date(lastSignInTime);

  return userData;
}

async function storeUser({ user, db, userDataKey }) {
  if (!user?.uid) return;
  const userRef = doc(db, "users", user[userDataKey]);

  const userData = getUserProperties(user);

  const storedUserData = mapDates((await getDoc(userRef)).data());
  // save a write if the user hasn't changed that much
  if (
    userData.displayName !== storedUserData.displayName ||
    userData.email !== storedUserData.email ||
    userData.photoURL !== storedUserData.photoURL ||
    Math.abs(storedUserData.lastSignInTime - userData.lastSignInTime) >
      1000 * 60 * 60
  ) {
    // console.info("✍🏻 writing to the user doc");
    // console.log({ userData, storedUserData });
    await setDoc(userRef, userData, { merge: true });
  }
  return { userRef, userData: storedUserData };
}

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

export function useFirestore() {
  const context = React.useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error("useFirestore must be used within a FirebaseProvider");
  }
  return context;
}

export function useFirebase() {
  const context = React.useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}

export function useSettings() {
  const context = React.useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a FirebaseProvider");
  }
  return context;
}

export function useStorage(bucketUrl = null) {
  const { storageEmulatorPort } = useSettings();
  const firebaseApp = useFirebase();
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);

  const storage = getStorage(firebaseApp, bucketUrl);
  if (storageEmulatorPort)
    connectStorageEmulator(storage, "localhost", storageEmulatorPort);

  // upload({data: blob, path: `/files/foo.png`, metadata: {}, onProgress: ((total, transferred, percent)=>{ console.log({percent}) })})

  function pause(path) {
    console.log("TODO: implement global pause, resume, cancel");
  }
  function resume(path) {
    console.log("TODO: implement global pause, resume, cancel");
  }
  function cancel(path) {
    console.log("TODO: implement global pause, resume, cancel");
  }

  function download(path) {
    const objectRef = ref(storage, path);
    // getDownloadURL(objectRef)
    return getBlob(objectRef);
  }

  function downloadUrl({ path, bucket = bucketUrl }) {
    const storage = getStorage(firebaseApp, bucket);
    if (storageEmulatorPort)
      connectStorageEmulator(storage, "localhost", storageEmulatorPort);
    return getDownloadURL(ref(storage, path));
  }

  function upload({ data, path, metadata = {}, onProgress }) {
    const objectRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(objectRef, data, metadata);
    // console.log("uploading with bucketUrl=", bucketUrl);

    // const pause = () => uploadTask.pause()
    // const resume = () => uploadTask.resume()
    // const cancel = () => uploadTask.cancel()

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (typeof onProgress === "function") {
            const total = snapshot.totalBytes;
            const transferred = snapshot.bytesTransferred;
            const percent = (transferred / total) * 100;
            const fileProgress = { total, transferred, percent };
            onProgress(fileProgress);
            setProgress((progress) => ({ ...progress, [path]: fileProgress }));
          }
          // switch (snapshot.state) {
          //   case firebase.storage.TaskState.PAUSED:
          //     console.log("Upload is paused");
          //     break;
          //   case firebase.storage.TaskState.RUNNING:
          //     console.log("Upload is running");
          //     break;
          // }
        },
        function (error) {
          console.log({ error });
          reject(error);
        },
        function () {
          getDownloadURL(uploadTask.snapshot.ref).then((url) => {
            resolve({
              url,
              ref: uploadTask.snapshot.ref,
              bucket: bucketUrl,
              path,
            });
            //   console.log("File available at", downloadURL);
          });
        }
      );
    });
  }

  function remove(path) {
    return deleteObject(ref(storage, path));
  }

  return {
    upload,
    download,
    downloadUrl,
    remove,
    progress,
    error,
    cancel,
    resume,
    pause,
  };
}

// const { user, signOut, signinWithGoogle } = useAuth();
export function useAuth() {
  const auth = getAuth();
  const context = React.useContext(FirebaseUserContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a FirebaseProvider");
  }

  // TODO: link anonymous user with logged in user
  // https://firebase.google.com/docs/auth/web/anonymous-auth#convert-an-anonymous-account-to-a-permanent-account
  // firebase.auth().signInAnonymously()
  // TODO: error and loading?

  // signin buttons with svgs: https://flowbite.com/docs/components/buttons/
  return {
    user: context,
    signOut: () => signOut(auth),
    signinWithGoogle: ({ scopes, redirect = false }) => {
      const provider = new GoogleAuthProvider();

      // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
      // provider.addScope("https://www.googleapis.com/auth/youtube.upload");
      // provider.setCustomParameters({
      //   'login_hint': 'user@example.com'
      // });x
      if (scopes) scopes.forEach((scope) => provider.addScope(scope));

      if (redirect) return signInWithRedirect(auth, provider);
      else return signInWithPopup(auth, provider);
    },
    checkEmailLink: () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("firebase:email");
        if (!email)
          email = window.prompt("Please provide your email for confirmation");
        if (email)
          signInWithEmailLink(auth, email, window.location.href)
            .then((res) => {
              window.localStorage.removeItem("firebase:email");
            })
            .catch((err) => {
              alert(err.message);
            });
      }
    },
    resetPassword: ({ email, url }) => {
      // https://firebase.google.com/docs/reference/js/v8/firebase.auth.Auth#sendpasswordresetemail
      sendPasswordResetEmail(auth, email, { url, handleCodeInApp: true });
    },
    confirmPasswordReset: ({ code, password }) => {
      // https://firebase.google.com/docs/reference/js/v8/firebase.auth.Auth#confirmpasswordreset
      confirmPasswordReset({ code, newPassword: password });
    },
    signinWithEmail: ({ email, password }) => {
      // https://firebase.google.com/docs/auth/web/email-link-auth?authuser=0#send_an_authentication_link_to_the_users_email_address
      const actionCodeSettings = {
        url: document.location.href.replace(document.location.search, ""),
        handleCodeInApp: true,
      };
      if (password) {
        // https://firebase.google.com/docs/auth/web/password-auth?authuser=0
        alert("Email/password signin is unimplemented in useFirebase");
        // alert(`${email} ${password}`);
      } else {
        window.localStorage.setItem("firebase:email", email);
        sendSignInLinkToEmail(auth, email, actionCodeSettings);
      }
    },
    sendPhoneVerificationCode: ({ phoneNumber, buttonId }) => {
      if (!document.getElementById(buttonId))
        return Promise.reject(
          `sendPhoneVerificationCode cannot find element with id=${buttonId} on the page.`
        );

      if (!phoneNumber)
        return Promise.reject(
          "sendPhoneVerificationCode is missing a phoneNumber"
        );

      return new Promise((resolve, reject) => {
        window.recaptchaVerifier = new RecaptchaVerifier(
          buttonId,
          {
            size: "invisible",
            callback: (response) => {
              // console.log("recaptcha solved", response);
            },
          },
          auth
        );

        signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
          .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            resolve();
          })
          .catch((error) => {
            // reset the captcha so the user can try again
            window.recaptchaVerifier.render().then(function (widgetId) {
              grecaptcha.reset(widgetId);
            });
            reject(error);
          });
        // return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      });
    },
    signInWithPhoneNumber: ({ phoneNumber, code }) => {
      if (!window.confirmationResult)
        return Promise.reject(
          "Call sendPhoneVerificationCode({ phoneNumber, buttonId }) first."
        );
      return window.confirmationResult.confirm(code);
    },
  };
}

export function useTag() {
  const [tag, setTag] = useState(null);

  // console.log("Setting ref in pageview");
  // setRef("pageview test");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const paramRef = params.get("ref") || params.get("tag");
    const storedRef = localStorage.getItem("ref");

    if (storedRef) {
      if (paramRef) {
        // merge paramRef and storedRef
        const storedRefs = storedRef.split(";");
        if (storedRefs.includes(paramRef)) {
          // already merged
          setTag(storedRef);
        } else {
          setTag([...storedRefs, paramRef].join(";"));
        }
      } else {
        setTag(storedRef);
      }
    } else {
      setTag(paramRef);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ref", tag);
  }, [tag]);
  return tag;
}

export function useAnalytics() {
  const firebaseApp = useFirebase();
  const isServer = typeof window === "undefined";
  const analytics = isServer ? null : getAnalytics(firebaseApp);

  return {
    // ex: { source: "google" }
    setUserProperties: (props = {}) => setUserProperties(analytics, props),
    // built in events: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
    // relevant to me: login, purchase, refund, sign_up, tutorial_begin, tutorial_complete
    // first_open, first_visit, logout, page_view, screen_view, session_start
    // meta built in params: page_location, page_referrer, page_title, source, term,
    logEvent: (title, meta = {}) => {
      if (window.location.hostname === "localhost") {
        console.info("logEvent not running in development", { title, meta });
        return;
      }

      logEvent(analytics, title, meta);
    },
    pageview: () => {
      if (window.location.hostname === "localhost") {
        console.info("pageview not running in development");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const source = params.get("utm_source");

      logEvent(analytics, "page_view", {
        page_location: document.location.href,
        page_referrer: document.referrer,
        page_title: document.title,
        source,
      });
    },
  };
}

function mapDates(doc = {}) {
  return Object.fromEntries(
    Object.entries(doc).map(([k, v]) => {
      const value = typeof v?.toDate === "function" ? v.toDate() : v;
      return [k, value];
    })
  );
}

export function removeDocument(ref) {
  if (typeof ref === "string") ref = doc(getFirestore(), ref);

  return deleteDoc(ref);
}

export function updateDocument(ref, data) {
  // support ref or path
  if (typeof ref === "string") ref = doc(getFirestore(), ref);

  // nested object updates use dot notation:
  // https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects
  // but you **don't need to use dot notation with merge:true**

  // console.info("updateDocument");
  // console.log({ ref, data });
  // return;

  // set fields to undefined to delete them
  const updatedFields = mapValues(data, (v) => {
    return v === undefined ? deleteField() : v;
  });
  const { id } = data;
  delete updatedFields.id;
  delete updatedFields.path;

  // console.log({ updatedFields, data });

  return setDoc(
    ref,
    {
      ...updatedFields,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

const debouncedUpdate = debounce(
  (ref, data) => updateDocument(ref, data),
  1000
);

export function usePaginatedCollection(collectionPath, options = {}) {
  const db = getFirestore();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [lastVisibleSnap, setLastVisibleSnap] = useState(null);
  const [startAfterSnap, setStartAfterSnap] = useState(null);

  const [queryArgs, setQueryArgs] = useState(null);
  useEffect(() => {
    // console.log("Options changed");

    // options changed; clear cached data
    setData(null);
    setLastVisibleSnap(null);
    setStartAfterSnap(null);

    // reconstruct queryArgs
    let path = collectionPath;
    if (user && path[0] !== "/" && !options.group)
      path = `/users/${user.uid}/${path}`;

    let collectionRef;
    if (options.group) collectionRef = collectionGroup(db, path);
    else collectionRef = collection(db, path);

    const newQueryArgs = [collectionRef];

    if (options.orderBy)
      newQueryArgs.push(
        orderBy(options.orderBy, options.desc || options.dsc ? "desc" : "asc")
      );

    if (options.where) {
      // where can be an array of arrays or just an array
      // let's force it to be an array of arrays
      let whereClauses = options.where;
      if (!Array.isArray(options.where[0])) whereClauses = [options.where];

      whereClauses.forEach(([a, b, c]) => {
        newQueryArgs.push(where(a, b, c));
      });
    }

    if (options.limit) newQueryArgs.push(limit(options.limit));
    setQueryArgs(newQueryArgs);
  }, [
    user?.uid,
    collectionPath,
    options.orderBy,
    options.limit,
    options.desc || options.dsc,
    JSON.stringify(options.where),
    // options, // this causes infinite renders wtf
  ]);

  useEffect(() => {
    if (!queryArgs) {
      // console.log("queryArgs is null");
      return;
    }
    // console.log("queryArgs is not null. Fetching data!");
    // if (startAfterSnap && startAfterSnap?.id === lastVisibleSnap?.id) {
    //   // console.log({ startAfterSnap });
    //   queryArgs.push(startAfter(startAfterSnap));
    // }
    const queryArgsMaybeWithPagination = [...queryArgs];
    if (startAfterSnap)
      queryArgsMaybeWithPagination.push(startAfter(startAfterSnap));

    setLoading(true);
    // // clear the cached data unless we're fetching more
    // if (lastVisibleSnap?.id !== startAfterSnap?.id) setData(null);

    getDocs(query(...queryArgsMaybeWithPagination))
      .then((querySnapshot) => {
        setLoading(false);

        const newData = [];
        querySnapshot.forEach((doc) => {
          // { ...mapDates(doc.data()), path: doc.ref.path, id: doc.id }
          newData.push({
            ...mapDates(doc.data()),
            path: doc.ref.path,
            id: doc.id,
          });
        });

        setData([...(data || []), ...newData]);
        // if (lastVisibleSnap?.id === startAfterSnap?.id) {
        //   // append data if we're fetching more
        //   setData([...(data || []), ...newData]);
        // } else {
        //   // otherwise replace the data
        //   setData(newData);
        // }

        setLastVisibleSnap(querySnapshot.docs[querySnapshot.docs.length - 1]);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setError(err);
      });

    return () => {};
  }, [queryArgs, startAfterSnap]);

  function loadMore() {
    // console.log("Loading more");
    // console.log({ lastVisibleSnap });
    setStartAfterSnap(lastVisibleSnap);
  }

  return { data, loading, error, loadMore };
}

// const { data, add, update, remove, loading, error } = useCollection("pages")
export function useCollection(collectionPath, options = { live: true }) {
  // const db = useFirestore();
  const db = getFirestore();

  // window.db = db;

  // const firebaseApp = useFirebase();
  const { user } = useAuth();

  let path = collectionPath;
  if (user && path[0] !== "/" && !options.group)
    path = `/users/${user.uid}/${path}`;

  let collectionRef;
  if (options.group) collectionRef = collectionGroup(db, path);
  else collectionRef = collection(db, path);

  const queryArgs = [collectionRef];

  if (options.orderBy)
    queryArgs.push(
      orderBy(options.orderBy, options.desc || options.dsc ? "desc" : "asc")
    );

  if (options.where) {
    // where can be an array of arrays or just an array
    // let's force it to be an array of arrays
    let whereClauses = options.where;
    if (!Array.isArray(options.where[0])) whereClauses = [options.where];

    whereClauses.forEach(([a, b, c]) => {
      queryArgs.push(where(a, b, c));
    });
  }

  if (options.limit) queryArgs.push(limit(options.limit));

  const [startAfterSnap, setStartAfterSnap] = useState(null);
  // if (options.startAfter) queryArgs.push(limit(options.startAfter));
  if (startAfterSnap) queryArgs.push(startAfter(startAfterSnap));

  let data = null,
    loading = null,
    error = null,
    snap = null;

  // only fetch the data if the limit isn't zero
  // this lets me just get the add function by passing limit=0
  // be careful not to ever change the limit to zero and back again D:
  if (options.limit !== 0) {
    // if(options.live)
    const useCollectionLiveOrNot =
      options.live === false ? useCollectionOnce : useCollectionHook;

    // console.log(options, queryArgs);

    [snap, loading, error] = useCollectionLiveOrNot(query(...queryArgs));
    // console.log({ snap, loading, error });
    if (snap?.docs) {
      // append instead of resetting if fetching more
      data = snap.docs.map((doc) => {
        return { ...mapDates(doc.data()), path: doc.ref.path, id: doc.id };
      });
    }
    if (error) {
      console.info("useCollection encountered an info with these options:");
      console.info({ collectionPath, options });
      console.error(error);
    }
  }

  function add(docData) {
    const data = {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (options.group) {
      return setDoc(doc(db, docData.path), data);
    } else return addDoc(collectionRef, data);
  }

  // TODO: merge properties here? It might already be happening? I might not need to do it with useDoc?
  const update = (docData) =>
    updateDocument(
      docData.path ? doc(db, docData.path) : doc(collectionRef, docData.id),
      docData
    );
  const remove = (docData) =>
    deleteDoc(
      docData.path ? doc(db, docData.path) : doc(collectionRef, docData.id)
    );

  // console.log({ path });
  // return [firebaseData, addDoc, loading, error];
  return { data, add, update, remove, loading, error };
}

export function useDoc(docPath, config = { live: true }) {
  let path = docPath; // || "/null/null";
  const db = useFirestore();
  const { user } = useAuth();
  if (user && path && path[0] !== "/") path = `/users/${user.uid}/${path}`;

  // use an empty string to get the current user's doc
  if (user && path === "") path = `/users/${user.uid}`;

  if (!path) path = "/";

  const docRef = doc(db, path);
  const [data, setData] = useState(null);

  // idField might not work anymore?
  // if you change live during a render bad things will happen lol.
  const useDocHook = config.live ? useDocumentData : useDocumentDataOnce;
  const [firebaseData, loading, error] = useDocHook(docRef, {
    idField: "id",
  });

  // update local data if remote data changes
  useEffect(() => {
    setData(
      firebaseData ? { ...mapDates(firebaseData), path, id: docRef.id } : null
    );
  }, [firebaseData, path]);

  const remove = () => deleteDoc(docRef);
  const update = (docData) => updateDocument(docRef, docData);

  function setDataWithFirebase(newData) {
    // console.info("setDataWithFirebase", newData);
    // I don't know why I have to spread merge, but setData doesn't update if I don't
    // this might not work with setting data to undefined?

    // without this customizer I can't update the order of an array
    // just using `merge` tries to merge the object values at the same
    // index of an array
    function customizer(objValue, srcValue) {
      if (isArray(objValue)) {
        return srcValue;
      }
    }
    setData({ ...mergeWith(data, newData, customizer) });
    debouncedUpdate(docRef, newData);
  }

  return {
    data,
    update,
    upsert: update,
    debouncedUpdate: setDataWithFirebase,
    // if you're fucking around with debounceUpdating nested data,
    // make sure you flush between each written key
    flushDebouncedUpdates: debouncedUpdate.flush,
    remove,
    loading,
    error,
  };
}

export function useCount(collectionPath) {
  const db = getFirestore();
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    setLoading(true);
    getCountFromServer(collection(db, collectionPath))
      .then((snap) => {
        setCount(snap.data().count);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [collectionPath]);
  return { count, loading, error };
}

export function useCallableFunction(title, { zone = "us-central1" } = {}) {
  const functions = getFunctions();
  // const addMessage = httpsCallable(functions, "addMessage");
  // const firebaseApp = useFirebase();
  // return httpsCallable(getFunctions(firebaseApp, zone), title);
  return httpsCallable(functions, title);
}

export function useHttp(title, { method = "GET" } = {}) {
  let {
    httpHost,
    config: { projectId },
  } = useSettings();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!httpHost)
    httpHost = `https://us-central1-${projectId}.cloudfunctions.net/`;

  function qs(params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => search.set(k, v));
    return search.toString();
  }

  const fn = async (params) => {
    setLoading(true);

    const url = `${httpHost}/${title}${
      method === "GET" ? `?${qs(params)}` : ""
    }`;
    const args = {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
    if (method !== "GET") args.body = JSON.stringify(params);

    let res = null;
    try {
      res = await fetch(url, args);
      setLoading(false);
      return await res.json();
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err;
    }
  };

  return [fn, { loading, error }];
}

// TODO: update for v9
// export function useIdToken() {
//   const firebase = useFirebase();
//   const { user } = useAuth();
//   const [token, setToken] = useState(null);
//   useEffect(() => {
//     if (!firebase.auth().currentUser) return;
//     async function fetchToken() {
//       const _token = await firebase.auth().currentUser.getIdToken(true);
//       setToken(_token);
//     }
//     fetchToken();
//   }, [user, firebase]);
//   return token;
// }
