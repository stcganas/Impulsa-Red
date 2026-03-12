/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MobileLayout from "./components/layout/MobileLayout";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlanSelection from "./pages/PlanSelection";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Referrals from "./pages/Referrals";
import Levels from "./pages/Levels";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Training from "./pages/Training";
import Mentor from "./pages/Mentor";
import AdminDashboard from "./pages/AdminDashboard";
import Ranking from "./pages/Ranking";
import { UserProvider, useUser } from "./contexts/UserContext";

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'user' | 'admin' }) => {
  const { user, loading } = useUser();
  
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>;
  
  if (!user) return <Navigate to="/login" />;
  
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/plan-selection" element={<PlanSelection />} />
          
          {/* Standalone Pages */}
          <Route path="/mentor" element={<Mentor />} />

          {/* Main App */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          
          <Route element={<ProtectedRoute role="user"><MobileLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/training" element={<Training />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/levels" element={<Levels />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
