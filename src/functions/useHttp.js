import { useState, useEffect } from "react";
import { useSettings } from "../useSettings";

export function useHttp(title, { method = "GET" } = {}) {
  let {
    httpHost,
    config: { projectId },
  } = useSettings();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!httpHost)
    httpHost = `https://us-central1-${projectId}.cloudfunctions.net/`;

  function qs(params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => search.set(k, v));
    return search.toString();
  }

  const fn = async (params) => {
    setLoading(true);

    const url = `${httpHost}/${title}${
      method === "GET" ? `?${qs(params)}` : ""
    }`;
    const args = {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
    if (method !== "GET") args.body = JSON.stringify(params);

    let res = null;
    try {
      res = await fetch(url, args);
      setLoading(false);
      return await res.json();
    } catch (err) {
      setLoading(false);
      setError(err);
      throw err;
    }
  };

  return [fn, { loading, error }];
}
