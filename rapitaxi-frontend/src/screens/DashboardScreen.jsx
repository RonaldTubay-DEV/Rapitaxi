import React, { useState, useEffect } from 'react';
import { 
  Users, Car, Wrench, ShieldCheck, TrendingUp, 
  Clock, AlertTriangle, Loader2, DollarSign 
} from 'lucide-react';
import { API_URL } from '../apiConfig';
const DashboardScreen = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        setStats(await response.json());
      } else {
        setError('Error al cargar las métricas.');
      }
    } catch (err) { setError('Error de conexión con el servidor.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-[#FFCC00]" /></div>;
  }

  if (error) {
    return <div className="p-10 text-red-500 font-bold flex items-center"><AlertTriangle className="mr-2"/> {error}</div>;
  }

  const kpis = stats?.kpis || {};
  const recientes = stats?.actividad_reciente || [];

  // Cálculos para las barras de progreso
  const porcentajeLegal = kpis.flota_total > 0 ? Math.round((kpis.vehiculos_al_dia / kpis.flota_total) * 100) : 0;

  return (
    <div className="p-8 lg:p-10 bg-slate-50 min-h-screen">
      
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Resumen Operativo</h2>
        <p className="text-slate-500 mt-1 font-medium">Monitoreo en tiempo real de RapitaxisMontecristi S.A.</p>
      </div>

      {/* =========================================
          TARJETAS KPI (Key Performance Indicators)
          ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KPI 1: Socios */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Socios</p>
            <h3 className="text-4xl font-black text-slate-800">{kpis.socios_activos}</h3>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Users className="w-7 h-7" /></div>
        </div>

        {/* KPI 2: Flota */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Flota Total</p>
            <h3 className="text-4xl font-black text-slate-800">{kpis.flota_total}</h3>
          </div>
          <div className="w-14 h-14 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center"><Car className="w-7 h-7" /></div>
        </div>

        {/* KPI 3: Taller */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">En Taller</p>
            <h3 className="text-4xl font-black text-slate-800">{kpis.taller_pendientes}</h3>
          </div>
          <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center"><Wrench className="w-7 h-7" /></div>
        </div>

        {/* KPI 4: Gastos */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos (Mes)</p>
            <h3 className="text-3xl font-black text-green-600">${parseFloat(kpis.gastos_mes).toFixed(2)}</h3>
          </div>
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center"><DollarSign className="w-7 h-7" /></div>
        </div>

      </div>

      {/* =========================================
          SEGUNDA FILA: Estado Legal y Actividad
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: Estado de la Flota (1/3) */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2 text-green-500" /> Estatus Legal (RTV)
          </h3>
          
          <div className="mb-6">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-slate-600">Unidades Aprobadas</span>
              <span className="text-slate-900">{porcentajeLegal}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ${porcentajeLegal >= 80 ? 'bg-green-500' : porcentajeLegal >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                style={{ width: `${porcentajeLegal}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              {kpis.vehiculos_al_dia} de {kpis.flota_total} vehículos cuentan con revisión vigente.
            </p>
          </div>

          <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center"><TrendingUp className="w-4 h-4 mr-2"/> Resumen Rápido</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              El sistema se encuentra monitoreando la actividad del taller y las fechas de matriculación. Mantén actualizados los expedientes para un 100% de operatividad.
            </p>
          </div>
        </div>

        {/* COLUMNA DERECHA: Actividad Reciente del Taller (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-orange-500" /> Últimos Movimientos en Taller
          </h3>

          {recientes.length === 0 ? (
            <div className="text-center py-10">
              <Wrench className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">No hay registros de mantenimiento recientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recientes.map((mant) => (
                <div key={mant.id} className="flex items-center p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mr-4 ${
                    mant.estado === 'Completado' ? 'bg-green-100 text-green-600' :
                    mant.estado === 'En Proceso' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-grow">
                    <h4 className="font-bold text-slate-900">
                      Unidad {mant.vehiculo?.numero_vehiculo} - {mant.tipo_mantenimiento}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Socio: {mant.vehiculo?.socio?.nombre} • {new Date(mant.fecha_mantenimiento).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-black text-slate-800">${parseFloat(mant.costo).toFixed(2)}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{mant.estado}</span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardScreen;