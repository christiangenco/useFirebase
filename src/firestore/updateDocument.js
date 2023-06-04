import {
  getFirestore,
  setDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import mapValues from "lodash.mapvalues";
import debounce from "lodash.debounce";

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
  // TODO: this won't work for deeply nested documents?
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

export const debouncedUpdate = debounce(
  (ref, data) => updateDocument(ref, data),
  1000
);
