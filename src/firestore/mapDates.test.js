import { mapDates } from "./mapDates";

describe("mapDates", () => {
  it("transforms Firestore timestamps to JavaScript Dates", () => {
    const createdAt = new Date(2023, 6, 1);
    const updatedAt = new Date(2023, 6, 2);

    const id = "abc13";
    const name = "Test document";
    const doc = {
      id,
      createdAt: { toDate: () => createdAt },
      updatedAt: { toDate: () => updatedAt },
      name,
    };

    const result = mapDates(doc);

    expect(result).toEqual({
      id,
      createdAt,
      updatedAt,
      name,
    });
  });

  it.skip("transforms deeply nested Firestore timestamps to JavaScript Dates", () => {
    const createdAt = new Date(2023, 6, 1);

    const id = "abc13";

    const doc = {
      id,
      properties: {
        createdAt: { toDate: () => createdAt },
      },
    };

    const result = mapDates(doc);

    expect(result).toEqual({
      id,
      properties: {
        createdAt,
      },
    });
  });

  it("leaves non-timestamp values unchanged", () => {
    const doc = {
      id: "abc123",
      name: "Test Document",
      tags: ["test", "document"],
    };

    const result = mapDates(doc);

    expect(result).toEqual(doc);
  });

  it("works with an empty object", () => {
    const result = mapDates({});
    expect(result).toEqual({});
  });

  it("works when no argument is passed", () => {
    const result = mapDates();
    expect(result).toEqual({});
  });
});
