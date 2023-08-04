import { getFirestore, doc, deleteDoc } from "firebase/firestore";

export function removeDocument(ref) {
  if (typeof ref === "string") ref = doc(getFirestore(), ref);

  return deleteDoc(ref);
}
