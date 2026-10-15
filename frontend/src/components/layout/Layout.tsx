import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DataModals, ModalType } from './DataModals';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  return (
    <div className="h-screen w-full flex bg-[#f0f5fa] overflow-hidden">
      {/* Full-height Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-[250px]' : 'w-0'
        } flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-[#d8e4f0] bg-white h-screen flex flex-col z-30`}
      >
        <Sidebar onOpenModal={(type) => setActiveModal(type)} />
      </aside>

      {/* Main pane */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Data & Resources Modals (Live Data, Historical Data, Settings) */}
      <DataModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
};
