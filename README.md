// const { data, add, update, remove, loading, error } = useCollection("pages")
// const { data, update, debouncedUpdate, remove, loading, error } = useDoc("pages/foo");

# Firestore

- automatically maps dates with `toDate()`

```js
import { renderHook, act } from "@testing-library/react-hooks";
test("useCounter increments count", () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```
