import { useContext } from "react";
import { SettingsContext } from "./context";

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a FirebaseProvider");
  }
  return context;
}
