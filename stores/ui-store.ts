import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  commandOpen: boolean
  taskDrawerOpen: boolean
  selectedTaskId: string | null
  density: "comfortable" | "compact"
  setSidebarCollapsed: (value: boolean) => void
  toggleSidebar: () => void
  setMobileNavOpen: (value: boolean) => void
  setCommandOpen: (value: boolean) => void
  openTaskDrawer: (taskId: string) => void
  closeTaskDrawer: () => void
  setDensity: (density: "comfortable" | "compact") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandOpen: false,
      taskDrawerOpen: false,
      selectedTaskId: null,
      density: "comfortable",
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
      setCommandOpen: (value) => set({ commandOpen: value }),
      openTaskDrawer: (taskId) => set({ taskDrawerOpen: true, selectedTaskId: taskId }),
      closeTaskDrawer: () => set({ taskDrawerOpen: false, selectedTaskId: null }),
      setDensity: (density) => set({ density }),
    }),
    {
      name: "yadbox-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
      }),
    }
  )
)

interface WorkspaceState {
  currentWorkspaceId: string | null
  currentProjectId: string | null
  setCurrentWorkspaceId: (id: string | null) => void
  setCurrentProjectId: (id: string | null) => void
  clearWorkspaceContext: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      currentProjectId: null,
      setCurrentWorkspaceId: (id) =>
        set((state) => ({
          currentWorkspaceId: id,
          currentProjectId: id === state.currentWorkspaceId ? state.currentProjectId : null,
        })),
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      clearWorkspaceContext: () => set({ currentWorkspaceId: null, currentProjectId: null }),
    }),
    { name: "yadbox-workspace" }
  )
)
