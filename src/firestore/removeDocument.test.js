import { removeDocument } from "./removeDocument";
import { doc, deleteDoc } from "firebase/firestore";

jest.mock("firebase/firestore");

test("removeDocument calls deleteDoc with the correct ref", async () => {
  const ref = "some/ref";

  await removeDocument(ref);

  expect(deleteDoc).toHaveBeenCalledWith(ref);
});
