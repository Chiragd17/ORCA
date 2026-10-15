import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500 font-mono">
        ORCA — Open-Source Marine and Coastal Intelligence Platform • Verified Evidence Architecture
      </footer>
    </div>
  );
};
