import {
  getFunctions,
  httpsCallable,
  httpsCallableFromURL,
  // connectFunctionsEmulator,
} from "firebase/functions";

export function useCallableFunction(title, { zone = "us-central1" } = {}) {
  const functions = getFunctions();
  // const addMessage = httpsCallable(functions, "addMessage");
  // const firebaseApp = useFirebase();
  // return httpsCallable(getFunctions(firebaseApp, zone), title);
  if (title.includes("http://")) return httpsCallableFromURL(functions, title);
  return httpsCallable(functions, title);
}
