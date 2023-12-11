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

# Local development

1. Run `yarn link` in the directory of your local package "@christiangenco/use-firebase".

2. Go to your main project directory where you want to use the local package and run `yarn link "@christiangenco/use-firebase"`. Now, your local version of "@christiangenco/use-firebase" will be used in your main project.

3. Make changes in the local package as needed. The changes will be reflected in your main project because of the symbolic link.

4. Once you're done making changes and you're ready to deploy, follow these steps:

   a. Update the version of your local package in its `package.json` file.

   b. In the local package directory, run `npm publish` to publish your new changes to npm.

   c. Go to your main project directory and run `yarn unlink "@christiangenco/use-firebase"` to remove the link.

   d. Now, in your main project, run `yarn add "@christiangenco/use-firebase"` to add the latest version of the package from npm.

5. Now your main project is ready to be deployed with the latest version of your package.
