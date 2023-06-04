import { useState, useEffect } from "react";
import {
  getFirestore,
  collectionGroup,
  collection,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";

import { useAuth } from "../auth/useAuth";

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
    options.desc ?? options.dsc,
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
