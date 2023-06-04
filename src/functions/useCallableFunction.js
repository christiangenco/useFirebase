export function useCallableFunction(title, { zone = "us-central1" } = {}) {
  const functions = getFunctions();
  // const addMessage = httpsCallable(functions, "addMessage");
  // const firebaseApp = useFirebase();
  // return httpsCallable(getFunctions(firebaseApp, zone), title);
  return httpsCallable(functions, title);
}
