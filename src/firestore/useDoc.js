import { useState, useEffect } from "react";
import { getFirestore, setDoc, addDoc } from "firebase/firestore";
const {
  useDocumentData,
  useDocumentDataOnce,
} = require("react-firebase-hooks/firestore");

import { useAuth } from "../auth/useAuth";
import { mapDates } from "./mapDates";

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
