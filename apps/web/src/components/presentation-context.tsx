'use client';

import { createContext, useContext } from 'react';

const PresentationContext = createContext<string | null>(null);
export const usePresentationWorkspace = () => useContext(PresentationContext);

export function PresentationContextProvider({ workspace, children }: { workspace: string | null; children: React.ReactNode }) {
  return <PresentationContext.Provider value={workspace}>
    {children}
  </PresentationContext.Provider>;
}
