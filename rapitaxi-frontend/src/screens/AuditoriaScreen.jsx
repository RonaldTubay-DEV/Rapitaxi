import React, { useState, useEffect } from 'react';
import { History, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

const MODULOS = [
  { value: '', label: 'Todos los módulos' },
  { value: 'socios', label: 'Socios' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'aportaciones', label: 'Aportaciones' },
  { value: 'mantenimientos', label: 'Mantenimientos' },
  { value: 'libros-contables', label: 'Libros Contables' },
  { value: 'revisiones', label: 'Revisiones' },
  { value: 'expedientes', label: 'Expedientes' },
  { value: 'usuarios', label: 'Usuarios' },
];

const EVENTO_ESTILO = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  restored: 'bg-purple-100 text-purple-700',
};

const EVENTO_LABEL = {
  created: 'Creado',
  updated: 'Editado',
  deleted: 'Eliminado',
  restored: 'Reactivado',
};

// Interpretacion simple del user-agent para mostrar algo legible ("Chrome ·
// Windows") en vez del string crudo completo, sin agregar una libreria mas.
const resumirUserAgent = (ua) => {
  if (!ua) return null;
  let navegador = 'Navegador desconocido';
  if (/Edg\//.test(ua)) navegador = 'Edge';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) navegador = 'Chrome';
  else if (/Firefox\//.test(ua)) navegador = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) navegador = 'Safari';

  let so = '';
  if (/Windows/.test(ua)) so = 'Windows';
  else if (/Mac OS X/.test(ua)) so = 'macOS';
  else if (/Android/.test(ua)) so = 'Android';
  else if (/iPhone|iPad/.test(ua)) so = 'iOS';
  else if (/Linux/.test(ua)) so = 'Linux';

  return so ? `${navegador} · ${so}` : navegador;
};

// Muestra el "antes -> despues" de los campos que realmente cambiaron,
// tal como los guarda el paquete de auditoria (attributes = valor nuevo,
// old = valor anterior; en "created" solo viene attributes).
const CambiosDetalle = ({ cambios }) => {
  const nuevos = cambios?.attributes || {};
  const anteriores = cambios?.old || {};
  const campos = Object.keys(nuevos).length > 0 ? Object.keys(nuevos) : Object.keys(anteriores);

  if (campos.length === 0) return <span className="text-slate-400 italic text-xs">Sin detalle</span>;

  return (
    <div className="space-y-1">
      {campos.map((campo) => (
        <div key={campo} className="text-xs">
          <span className="font-semibold text-slate-600">{campo}: </span>
          {campo in anteriores && (
            <span className="text-red-500 line-through mr-1">{String(anteriores[campo] ?? 'vacío')}</span>
          )}
          <span className="text-slate-700">{String(nuevos[campo] ?? anteriores[campo] ?? '')}</span>
        </div>
      ))}
    </div>
  );
};

const AuditoriaScreen = () => {
  const [registros, setRegistros] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modulo, setModulo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  useEffect(() => {
    const fetchAuditoria = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(pagina) });
        if (modulo) params.set('modulo', modulo);
        const data = await apiClient.get(`/auditoria?${params.toString()}`);
        setRegistros(data.data || []);
        setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total });
      } catch {
        setError('No se pudo cargar el historial de auditoría.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditoria();
  }, [modulo, pagina]);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center">
            <History className="w-7 h-7 mr-2 text-slate-400" /> Auditoría
          </h2>
          <p className="text-slate-500 mt-1">Quién creó, editó, eliminó o reactivó cada registro del sistema.</p>
        </div>
        <select
          value={modulo}
          onChange={(e) => { setModulo(e.target.value); setPagina(1); }}
          className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-semibold text-slate-700 shadow-sm"
        >
          {MODULOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-sm text-red-700 font-medium">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 text-xs uppercase font-semibold">
                <th className="p-4">Fecha</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Módulo</th>
                <th className="p-4">Registro</th>
                <th className="p-4">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {isLoading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...</td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay actividad registrada.</td></tr>
              ) : registros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors align-top">
                  <td className="p-4 whitespace-nowrap text-slate-500 text-xs">
                    {new Date(r.fecha).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-700">{r.usuario || 'Sistema'}</p>
                    {(r.ip || r.user_agent) && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {r.ip}{r.ip && r.user_agent ? ' · ' : ''}{resumirUserAgent(r.user_agent)}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${EVENTO_ESTILO[r.evento] || 'bg-slate-100 text-slate-600'}`}>
                      {EVENTO_LABEL[r.evento] || r.evento}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{r.sujeto_tipo || r.modulo}</td>
                  <td className="p-4 text-slate-400 text-xs">#{r.sujeto_id}</td>
                  <td className="p-4 max-w-sm"><CambiosDetalle cambios={r.cambios} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">{meta.total} registros — página {meta.current_page} de {meta.last_page}</span>
            <div className="flex gap-2">
              <button
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagina >= meta.last_page}
                onClick={() => setPagina((p) => Math.min(meta.last_page, p + 1))}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditoriaScreen;
