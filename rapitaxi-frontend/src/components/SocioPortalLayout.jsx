import React from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { CarFront, LogOut, UserCircle, Receipt } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

const TABS = [
  { path: '/portal/perfil', label: 'Mi Perfil', icon: UserCircle },
  { path: '/portal/aportaciones', label: 'Mis Aportaciones', icon: Receipt },
];

// Layout propio del portal del socio: mucho mas simple que MainLayout (el
// del panel administrativo) porque solo tiene dos secciones y el socio no
// necesita el menu completo del staff.
const SocioPortalLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <CarFront className="w-7 h-7 mr-2 text-yellow-400" />
            <span className="font-extrabold tracking-tight">RAPITAXI</span>
            <span className="ml-2 text-xs text-slate-400 hidden sm:inline">Portal del Socio</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold hidden sm:inline">{user?.name}</span>
            <button onClick={handleLogout} className="flex items-center text-sm font-bold text-slate-300 hover:text-white transition-colors">
              <LogOut className="w-4 h-4 mr-1.5" /> Salir
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {TABS.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  isActive ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default SocioPortalLayout;
