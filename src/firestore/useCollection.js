import { useState, useEffect } from "react";
import {
  getFirestore,
  serverTimestamp,
  collectionGroup,
  collection,
  orderBy,
  where,
  limit,
  // startAfter,
  // getDocs,
  setDoc,
  addDoc,
} from "firebase/firestore";

const {
  useCollection: useCollectionHook,
  useCollectionOnce,
} = require("react-firebase-hooks/firestore");

import { mapDates } from "./mapDates";
import { useAuth } from "../auth/useAuth";

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

  // const [startAfterSnap, setStartAfterSnap] = useState(null);
  // if (options.startAfter) queryArgs.push(limit(options.startAfter));
  // if (startAfterSnap) queryArgs.push(startAfter(startAfterSnap));

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
