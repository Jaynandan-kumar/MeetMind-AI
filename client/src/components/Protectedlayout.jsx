import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Protectedlayout = () => {
  const location = useLocation();
  const isIde = location.pathname.startsWith('/ide');

  return (
    <div
      className={`${
        isIde
          ? 'h-screen w-full overflow-hidden bg-[#07070c]'
          : 'min-h-screen overflow-y-auto text-slate-900 bg-cover bg-center bg-no-repeat'
      } flex flex-col font-sans`}
      style={!isIde ? { backgroundImage: "url('/layout_bg.png')" } : {}}
    >
      {!isIde && <Navbar />}
      <Outlet />
      {!isIde && <Footer />}
    </div>
  );
};

export default Protectedlayout;