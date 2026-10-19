import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import MeetingRoom from './pages/MeetingRoom';
import Pricing from './pages/Pricing';
import Sessions from './pages/Sessions';
import IdeStudio from './pages/IdeStudio';

import ProtectedRoute from './components/ProtectedRoute';
import Protectedlayout from './components/Protectedlayout';

const App = () => {
  return (
    <>
      <Toaster position="top-right" />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/register" element={<Login mode="register" />} />

        {/* Private Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Protectedlayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/ide" element={<IdeStudio />} />
          </Route>
          <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
        </Route>

        {/* Default Routes */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </>
  );
};

export default App;