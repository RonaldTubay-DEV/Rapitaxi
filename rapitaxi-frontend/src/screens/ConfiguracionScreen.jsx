import React, { useState } from 'react';
import { Settings, BellRing, Moon } from 'lucide-react';
import { areToastsEnabled, setToastsEnabled, showSuccessToast } from '../utils/feedback';
import { getTheme, setTheme } from '../utils/theme';

const ConfiguracionScreen = () => {
  const [toastEnabled, setToastEnabled] = useState(areToastsEnabled());
  const [isDark, setIsDark] = useState(getTheme() === 'dark');

  const handleToastToggle = (enabled) => {
    setToastEnabled(enabled);
    setToastsEnabled(enabled);
    if (enabled) showSuccessToast('Notificaciones emergentes activadas.');
  };

  const handleThemeToggle = (dark) => {
    setIsDark(dark);
    setTheme(dark ? 'dark' : 'light');
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

        <div className="p-4 sm:p-6 bg-white flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center">
              <Moon className="w-5 h-5 mr-2 text-yellow-500" /> Modo oscuro
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cambia la apariencia de todo el panel a un tema oscuro. Se recuerda en este navegador.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className="text-sm font-bold text-slate-600">{isDark ? 'Activado' : 'Desactivado'}</span>
            <input
              type="checkbox"
              checked={isDark}
              onChange={(e) => handleThemeToggle(e.target.checked)}
              className="sr-only peer"
            />
            <span className="relative h-7 w-12 rounded-full bg-slate-200 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#FFCC00] peer-checked:after:translate-x-5"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionScreen;
