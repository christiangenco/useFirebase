import { useState, useEffect } from "react";

export function useTag() {
  const [tag, setTag] = useState(null);

  // console.log("Setting ref in pageview");
  // setRef("pageview test");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const paramRef = params.get("ref") || params.get("tag");
    const storedRef = localStorage.getItem("ref");

    if (storedRef) {
      if (paramRef) {
        // merge paramRef and storedRef
        const storedRefs = storedRef.split(";");
        if (storedRefs.includes(paramRef)) {
          // already merged
          setTag(storedRef);
        } else {
          setTag([...storedRefs, paramRef].join(";"));
        }
      } else {
        setTag(storedRef);
      }
    } else {
      setTag(paramRef);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ref", tag);
  }, [tag]);
  return tag;
}
