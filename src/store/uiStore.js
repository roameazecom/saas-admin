import { create } from 'zustand';

export const useUiStore = create((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  // Waiter UI active states
  activeLocationTab: localStorage.getItem('selectedLocationId') ? parseInt(localStorage.getItem('selectedLocationId'), 10) : 1,
  setActiveLocationTab: (id) => {
    localStorage.setItem('selectedLocationId', id);
    set({ activeLocationTab: id });
  },
  
  activeCategoryTab: 1,
  setActiveCategoryTab: (id) => set({ activeCategoryTab: id }),
  
  mobileView: 'menu',
  setMobileView: (view) => set({ mobileView: view })
}));
