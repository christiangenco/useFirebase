import { doc, getDoc, setDoc } from "firebase/firestore";

import { getUserProperties } from "./getUserProperties";
import { mapDates } from "../firestore/mapDates";

export async function storeUser({ user, db, userDataKey }) {
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
