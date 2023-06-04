import { useState, useEffect } from "react";
import {
  getFirestore,
  getCountFromServer,
  collection,
} from "firebase/firestore";

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
