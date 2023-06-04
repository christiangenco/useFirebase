import { useState } from "react";

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

import { useSettings } from "../useSettings";
import { useFirebase } from "../useFirebase";

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
