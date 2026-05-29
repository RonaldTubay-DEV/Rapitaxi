import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  CarFront, LayoutDashboard, Users, Wrench, FolderOpen, 
  FileText, ClipboardCheck, BookOpen, LogOut, Menu, DollarSign, Settings, X
} from 'lucide-react';

// IMPORTAMOS TU NUEVO COMPONENTE DE NOTIFICACIONES
// (Asegúrate de que la ruta sea correcta según donde guardaste el archivo)
import NotificacionesBell from './NotificacionesBell'; 

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) navigate('/');
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/panel' },
    { icon: Users, label: 'Socios', path: '/socios' },
    { icon: CarFront, label: 'Vehículos', path: '/vehiculos' },
    { icon: Wrench, label: 'Mantenimiento', path: '/mantenimiento' },
    { icon: FolderOpen, label: 'Expedientes', path: '/expedientes' },
    { icon: FileText, label: 'Actas', path: '/actas' },
    { icon: ClipboardCheck, label: 'Revisiones', path: '/revisiones' },
    { icon: DollarSign, label: 'Aportaciones', path: '/aportaciones' },
    { icon: BookOpen, label: 'Libros Contables', path: '/libros-contables' },
    { icon: Settings, label: 'Configuración', path: '/configuracion' }, 
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* BARRA LATERAL */}
      <aside className={`${isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-20'} fixed inset-y-0 left-0 w-72 bg-[#FFCC00] text-slate-900 transition-all duration-300 flex flex-col flex-shrink-0 z-30 shadow-lg md:static`}>
        <div className="h-20 md:h-24 flex items-center justify-between px-4">
          <div className={`flex items-center overflow-hidden transition-all ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <CarFront className="w-8 h-8 mr-3 flex-shrink-0" />
            <div>
              <h1 className="font-extrabold text-xl tracking-tight leading-none">RAPITAXI</h1>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-yellow-500 transition-colors flex-shrink-0">
            {isSidebarOpen ? <X className="w-6 h-6 md:hidden" /> : <Menu className="w-6 h-6 md:hidden" />}
            <Menu className="hidden w-6 h-6 md:block" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={index}
                to={item.path} 
                onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                className={`flex items-center px-3 py-3.5 rounded-xl transition-all duration-200 whitespace-nowrap
                  ${isActive ? 'bg-slate-900 text-yellow-400 shadow-md' : 'text-slate-800 hover:bg-yellow-500 font-medium'}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4">
          <button onClick={handleLogout} className={`flex items-center w-full px-3 py-3 text-slate-800 hover:bg-yellow-500 rounded-xl font-bold transition-all whitespace-nowrap ${!isSidebarOpen && 'justify-center'}`}>
            <LogOut className={`w-5 h-5 flex-shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`} />
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>Salir</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL: Ahora dividido en TopBar y el Outlet */}
      <main className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* NUEVA BARRA SUPERIOR (TOP BAR) */}
        <header className="h-16 md:h-20 bg-slate-50 flex items-center justify-between md:justify-end px-4 sm:px-6 lg:px-8 flex-shrink-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-700 hover:bg-white hover:shadow-sm md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            {/* AQUÍ VA TU COMPONENTE DE CAMPANITA */}
            <NotificacionesBell />
            
            {/* Opcional: Info del usuario */}
            <div className="hidden md:flex flex-col text-right ml-2 border-l border-slate-200 pl-4">
              <span className="text-sm font-bold text-slate-800">Administración</span>
              <span className="text-xs text-slate-500 font-medium">En línea</span>
            </div>
          </div>
        </header>

        {/* CONTENIDO DINÁMICO (LAS PANTALLAS) */}
        <div className="flex-1 overflow-y-auto">
          <Outlet /> 
        </div>
        
      </main>
    </div>
  );
};

export default MainLayout;
