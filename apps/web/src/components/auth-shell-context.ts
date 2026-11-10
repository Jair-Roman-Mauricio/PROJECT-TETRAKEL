import { createContext, useContext } from "react";
export interface ShellMeta {
  title: string;
  description: string;
}
/** Present when a form is rendered inside the persistent sign-in shell. */
export const AuthShellContext = createContext<{
  setMeta: (meta: ShellMeta) => void;
} | null>(null);
export function useAuthShellSlot() {
  return useContext(AuthShellContext);
}
