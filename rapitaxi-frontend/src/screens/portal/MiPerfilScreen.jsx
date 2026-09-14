import React, { useState, useEffect } from 'react';
import { Loader2, Save, User, CarFront, AlertCircle } from 'lucide-react';
import { apiClient, ApiError } from '../../lib/apiClient';
import { showErrorToast, showSuccessToast } from '../../utils/feedback';
import { onlyDigits, limitText } from '../../utils/inputFormatters';

const MiPerfilScreen = () => {
  const [socio, setSocio] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ telefono: '', correo: '', direccion: '' });

  useEffect(() => {
    const fetchPerfil = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.get('/mi-perfil');
        setSocio(data);
        setFormData({
          telefono: data.telefono || '',
          correo: data.correo || '',
          direccion: data.direccion || '',
        });
      } catch {
        setError('No se pudo cargar tu información. Intenta de nuevo más tarde.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerfil();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const formatters = {
      telefono: (input) => onlyDigits(input, 10),
      correo: (input) => limitText(input, 100),
      direccion: (input) => limitText(input, 150),
    };
    setFormData({ ...formData, [name]: formatters[name] ? formatters[name](value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = await apiClient.put('/mi-perfil', formData);
      setSocio(data.socio);
      showSuccessToast('Tus datos se actualizaron exitosamente.');
    } catch (err) {
      showErrorToast(err instanceof ApiError ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start">
        <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Datos de afiliación: solo lectura, los controla el administrador */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4">
          <User className="w-5 h-5 mr-2 text-slate-400" /> Datos de Afiliación
        </h2>
        <p className="text-xs text-slate-400 mb-4">Estos datos solo puede modificarlos el administrador de la cooperativa.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="block text-xs font-bold uppercase text-slate-400 mb-1">Nombre</span>
            <p className="font-semibold text-slate-800">{socio.nombre}</p>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase text-slate-400 mb-1">Cédula</span>
            <p className="font-semibold text-slate-800">{socio.cedula || '---'}</p>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase text-slate-400 mb-1">Estado</span>
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
              socio.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {socio.estado}
            </span>
          </div>
        </div>
      </div>

      {/* Datos de contacto: editables por el socio */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Datos de Contacto</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Teléfono</label>
              <input
                type="text" name="telefono" value={formData.telefono} onChange={handleInputChange}
                inputMode="numeric" pattern="[0-9]{10}" maxLength="10"
                placeholder="Teléfono de 10 dígitos"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Correo</label>
              <input
                type="email" name="correo" value={formData.correo} onChange={handleInputChange}
                maxLength="100" placeholder="correo@ejemplo.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Dirección</label>
            <input
              type="text" name="direccion" value={formData.direccion} onChange={handleInputChange}
              maxLength="150" placeholder="Dirección completa"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700"
            />
          </div>
          <button
            type="submit" disabled={isSaving}
            className={`px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-colors shadow-md ${
              isSaving ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#FFCC00] text-slate-900 hover:bg-yellow-500'
            }`}
          >
            {isSaving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...</> : <><Save className="w-5 h-5 mr-2" /> Guardar Cambios</>}
          </button>
        </form>
      </div>

      {/* Vehículos a mi nombre: solo lectura */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center mb-4">
          <CarFront className="w-5 h-5 mr-2 text-slate-400" /> Mis Vehículos
        </h2>
        {socio.vehiculos?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {socio.vehiculos.map((v) => (
              <div key={v.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <p className="font-bold text-slate-800">Unidad {v.numero_vehiculo}</p>
                <p className="text-sm text-slate-500">{v.marca} {v.modelo} · Placa {v.placa}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 italic text-sm">No tienes vehículos registrados a tu nombre.</p>
        )}
      </div>
    </div>
  );
};

export default MiPerfilScreen;
