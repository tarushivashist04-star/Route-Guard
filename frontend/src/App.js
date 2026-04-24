import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import DriverDashboard from './pages/DriverDashboard';

function AppRouter() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-page">
      <div style={{width:48,height:48,borderRadius:12,background:'rgba(245,200,66,0.2)',border:'1px solid rgba(245,200,66,0.3)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,animation:'pulse 1.5s ease infinite'}}>
        <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><path d="M1 3h15l5 7-5 7H1V3z" stroke="#f5c842" strokeWidth="2" strokeLinejoin="round"/><circle cx="5.5" cy="17.5" r="2.5" stroke="#f5c842" strokeWidth="2"/><circle cx="18.5" cy="17.5" r="2.5" stroke="#f5c842" strokeWidth="2"/></svg>
      </div>
      <span style={{color:'rgba(255,255,255,0.7)',fontWeight:600,fontFamily:'var(--font-heading)'}}>Loading RouteGuard AI...</span>
    </div>
  );
  if (!user) return <LoginPage />;
  if (user.role === 'manager') return <ManagerDashboard />;
  if (user.role === 'driver') return <DriverDashboard />;
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration:4000, style:{ background:'white', color:'var(--text-primary)', border:'1px solid var(--border-subtle)', borderRadius:12, fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:500, boxShadow:'var(--shadow-md)' } }} />
      <AppRouter />
    </AuthProvider>
  );
}
