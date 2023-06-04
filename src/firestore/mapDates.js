export function mapDates(doc = {}) {
  return Object.fromEntries(
    Object.entries(doc).map(([k, v]) => {
      const value = typeof v?.toDate === "function" ? v.toDate() : v;
      return [k, value];
    })
  );
}
