import React, { useState, useEffect } from 'react';
import { Settings, BellRing, Wrench, Save, Loader2 } from 'lucide-react';
import { areToastsEnabled, setToastsEnabled, showSuccessToast, showErrorToast } from '../utils/feedback';
import { apiClient, ApiError } from '../lib/apiClient';
import { onlyDigits } from '../utils/inputFormatters';

const ConfiguracionScreen = () => {
  const [toastEnabled, setToastEnabled] = useState(areToastsEnabled());
  const [frecuencias, setFrecuencias] = useState([]);
  const [isLoadingFrecuencias, setIsLoadingFrecuencias] = useState(true);
  const [isSavingFrecuencias, setIsSavingFrecuencias] = useState(false);

  useEffect(() => {
    apiClient.get('/configuraciones-mantenimiento')
      .then((data) => setFrecuencias(data))
      .catch(() => showErrorToast('No se pudieron cargar las frecuencias de mantenimiento.'))
      .finally(() => setIsLoadingFrecuencias(false));
  }, []);

  const handleToastToggle = (enabled) => {
    setToastEnabled(enabled);
    setToastsEnabled(enabled);
    if (enabled) showSuccessToast('Notificaciones emergentes activadas.');
  };

  const handleFrecuenciaChange = (id, campo, valor) => {
    setFrecuencias((actuales) => actuales.map((config) => (
      config.id === id ? { ...config, [campo]: onlyDigits(valor, 3) } : config
    )));
  };

  const guardarFrecuencias = async () => {
    setIsSavingFrecuencias(true);
    try {
      const data = await apiClient.put('/configuraciones-mantenimiento', {
        configuraciones: frecuencias.map(({ id, meses_frecuencia, dias_anticipacion }) => ({
          id,
          meses_frecuencia: Number(meses_frecuencia),
          dias_anticipacion: Number(dias_anticipacion),
        })),
      });
      setFrecuencias(data.configuraciones);
      showSuccessToast(data.message);
    } catch (err) {
      showErrorToast(err instanceof ApiError ? err.message : 'No se pudieron guardar las frecuencias.');
    } finally {
      setIsSavingFrecuencias(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-slate-700" /> Ajustes del Sistema
        </h2>
        <p className="text-slate-500 mt-1">
          Preferencias generales de la aplicacion administrativa.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-4xl divide-y divide-slate-100">
        <div className="p-4 sm:p-6 bg-white flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center">
              <BellRing className="w-5 h-5 mr-2 text-yellow-500" /> Notificaciones emergentes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Activa o desactiva los mensajes breves que aparecen al completar acciones exitosas.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className="text-sm font-bold text-slate-600">{toastEnabled ? 'Activadas' : 'Desactivadas'}</span>
            <input
              type="checkbox"
              checked={toastEnabled}
              onChange={(e) => handleToastToggle(e.target.checked)}
              className="sr-only peer"
            />
            <span className="relative h-7 w-12 rounded-full bg-slate-200 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#FFCC00] peer-checked:after:translate-x-5"></span>
          </label>
        </div>
      </div>

      {/* Frecuencias de mantenimiento: de aqui sale el aviso que cada socio
          ve en su portal para cada una de sus unidades. */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-4xl mt-6">
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-yellow-500" /> Frecuencia de mantenimientos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cada cuánto le toca a una unidad cada trabajo, y con cuántos días de anticipación avisarle al socio en su portal.
          </p>
        </div>

        {isLoadingFrecuencias ? (
          <div className="p-10 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-yellow-500" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-semibold">
                    <th className="p-4">Tipo de trabajo</th>
                    <th className="p-4 w-48">Cada cuántos meses</th>
                    <th className="p-4 w-48">Avisar con (días)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {frecuencias.map((config) => (
                    <tr key={config.id}>
                      <td className="p-4 font-semibold text-slate-700">{config.tipo_mantenimiento}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text" inputMode="numeric" maxLength="2"
                            value={config.meses_frecuencia}
                            onChange={(e) => handleFrecuenciaChange(config.id, 'meses_frecuencia', e.target.value)}
                            className="w-20 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700 font-bold text-center"
                          />
                          <span className="text-xs text-slate-400">meses</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text" inputMode="numeric" maxLength="3"
                            value={config.dias_anticipacion}
                            onChange={(e) => handleFrecuenciaChange(config.id, 'dias_anticipacion', e.target.value)}
                            className="w-20 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700 font-bold text-center"
                          />
                          <span className="text-xs text-slate-400">días antes</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={guardarFrecuencias}
                disabled={isSavingFrecuencias}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-colors shadow-md ${
                  isSavingFrecuencias ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#FFCC00] text-slate-900 hover:bg-yellow-500'
                }`}
              >
                {isSavingFrecuencias
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...</>
                  : <><Save className="w-5 h-5 mr-2" /> Guardar frecuencias</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfiguracionScreen;
