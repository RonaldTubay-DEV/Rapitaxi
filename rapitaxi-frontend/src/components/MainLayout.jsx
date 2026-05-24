import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  CarFront, LayoutDashboard, Users, Wrench, FolderOpen, 
  FileText, ClipboardCheck, BookOpen, LogOut, Menu, DollarSign 
} from 'lucide-react'; // <--- AQUÍ ESTABA EL ERROR: Faltaba DollarSign

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) navigate('/');
  }, [navigate]);

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
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      
      {/* BARRA LATERAL */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#FFCC00] text-slate-900 transition-all duration-300 flex flex-col flex-shrink-0 z-20 shadow-lg`}>
        <div className="h-24 flex items-center justify-between px-4">
          <div className={`flex items-center overflow-hidden transition-all ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <CarFront className="w-8 h-8 mr-3 flex-shrink-0" />
            <div>
              <h1 className="font-extrabold text-xl tracking-tight leading-none">RAPITAXI</h1>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-yellow-500 transition-colors flex-shrink-0">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={index}
                to={item.path} 
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

      {/* CONTENIDO DINÁMICO */}
      <main className="flex-1 overflow-y-auto">
        <Outlet /> 
      </main>
    </div>
  );
};

export default MainLayout;