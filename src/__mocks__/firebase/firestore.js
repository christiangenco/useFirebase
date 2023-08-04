export const getFirestore = jest.fn();

export const doc = jest.fn((firestore, ref) => ref);

export const deleteDoc = jest.fn(() => Promise.resolve());
