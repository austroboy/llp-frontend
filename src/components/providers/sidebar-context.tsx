"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  pinned: boolean;
  setPinned: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  pinned: false,
  setPinned: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState(false);
  return (
    <SidebarContext.Provider value={{ pinned, setPinned }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
