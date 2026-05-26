import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, AlertCircle, CheckCircle2, Sliders, Calendar, Gauge } from 'lucide-react';
import { API_URL } from '../apiConfig';

const ConfiguracionScreen = () => {
  const [configuraciones, setConfiguraciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchConfiguraciones = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/configuraciones-mantenimiento`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (response.ok) {
        setConfiguraciones(await response.json());
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al conectar con el servidor.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfiguraciones();
  }, []);

  const handleValueChange = (id, field, value) => {
    setConfiguraciones(configuraciones.map(config => 
      config.id === id ? { ...config, [field]: parseInt(value) || 0 } : config
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/configuraciones-mantenimiento`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ configuraciones })
      });

      if (response.ok) {
        setMessage({ text: 'Configuraciones guardadas correctamente.', type: 'success' });
      } else {
        setMessage({ text: 'Error al actualizar los parámetros.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de red al intentar guardar.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 lg:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-slate-700" /> Ajustes del Sistema
        </h2>
        <p className="text-slate-500 mt-1">
          Configuración de márgenes predictivos y umbrales para las alertas de la campanita.
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center border ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
          <span className="font-semibold text-sm">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-4xl">
        <div className="p-6 bg-slate-50 border-b">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Sliders className="w-5 h-5 mr-2 text-yellow-500" /> Umbrales de Alerta Preventiva
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Establece con cuánta anticipación la aplicación generará una notificación para cada servicio técnico.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-yellow-500" />
              Cargando parámetros...
            </div>
          ) : (
            <div className="space-y-4">
              {configuraciones.map((config) => (
                <div key={config.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
                  <div>
                    <span className="font-bold text-slate-700 text-sm block">{config.tipo_mantenimiento}</span>
                    <span className="text-[11px] text-slate-400 font-medium">Regla activa para la flota</span>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center">
                      <Gauge className="w-3 h-3 mr-1" /> Anticipación Kilómetros
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={config.km_anticipacion} 
                        onChange={(e) => handleValueChange(config.id, 'km_anticipacion', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-mono text-slate-700 font-semibold"
                        min="0"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KM Antes</span>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" /> Anticipación Días
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={config.dias_anticipacion} 
                        onChange={(e) => handleValueChange(config.id, 'dias_anticipacion', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-mono text-slate-700 font-semibold"
                        min="0"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Días Antes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="pt-4 border-t flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="bg-slate-900 text-yellow-400 px-6 py-3 rounded-xl font-bold flex items-center hover:bg-slate-800 shadow-md transition-all text-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} 
                Guardar Ajustes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ConfiguracionScreen;