import React, { useState, useEffect } from 'react';
import { Car, Search, Edit, Trash2, Loader2, AlertCircle, X, Save, Plus } from 'lucide-react';
import { API_URL } from '../apiConfig';
import { showSuccessToast } from '../utils/feedback';
import { formatPlate, formatUnitNumber, limitText, onlyDigits } from '../utils/inputFormatters';
const VehiculosScreen = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [socios, setSocios] = useState([]); // Para el selector
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    socio_id: '',
    numero_vehiculo: '',
    placa: '',
    marca: '',
    modelo: '',
    anio_fabricacion: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
      
      const [resVehiculos, resSocios] = await Promise.all([
        fetch(`${API_URL}/vehiculos`, { headers }),
        fetch(`${API_URL}/socios`, { headers }) // Necesitamos la lista de socios
      ]);

      if (resVehiculos.ok && resSocios.ok) {
        setVehiculos(await resVehiculos.json());
        setSocios(await resSocios.json());
      } else {
        setError('Error al cargar la información.');
      }
    } catch (err) { setError('Error de conexión.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const formatters = {
      numero_vehiculo: formatUnitNumber,
      placa: formatPlate,
      marca: (input) => limitText(input, 50),
      modelo: (input) => limitText(input, 50),
      anio_fabricacion: (input) => onlyDigits(input, 4),
    };
    setFormData({ ...formData, [name]: formatters[name] ? formatters[name](value) : value });
  };

  const openCreateModal = () => {
    setFormData({ socio_id: '', numero_vehiculo: '', placa: '', marca: '', modelo: '', anio_fabricacion: '' });
    setEditingId(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (v) => {
    setFormData({
      socio_id: v.socio_id,
      numero_vehiculo: v.numero_vehiculo,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anio_fabricacion: v.anio_fabricacion
    });
    setEditingId(v.id);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const isEditing = editingId !== null;
    const url = isEditing ? `${API_URL}/vehiculos/${editingId}` : `${API_URL}/vehiculos`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        if (isEditing) {
          setVehiculos(vehiculos.map(v => v.id === editingId ? data.vehiculo : v));
          showSuccessToast('Vehiculo actualizado exitosamente.');
        } else {
          setVehiculos([data.vehiculo, ...vehiculos]);
          showSuccessToast('Vehiculo registrado exitosamente.');
          window.dispatchEvent(new Event('notificacion_creada'));
        }
        setIsModalOpen(false);
      } else {
        setFormError(data.message || 'Error al guardar el vehículo.');
      }
    } catch (err) { setFormError('Error de conexión.'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo del sistema?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setVehiculos(vehiculos.filter(v => v.id !== id));
        showSuccessToast('Vehiculo eliminado exitosamente.');
      }
    } catch (err) { alert('Error al eliminar.'); }
  };

  const vehiculosFiltrados = vehiculos.filter(v => {
    const term = searchTerm.toLowerCase();
    return v.numero_vehiculo?.toLowerCase().includes(term) || 
           v.placa?.toLowerCase().includes(term) ||
           (v.socio?.nombre ?? '').toLowerCase().includes(term);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Parque Automotor</h2>
          <p className="text-slate-500 mt-1">Gestión de unidades, placas y especificaciones técnicas de la flota.</p>
        </div>
        <div className="mt-4 md:mt-0 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar unidad, placa o socio..." 
              className="w-full sm:w-72 pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
            />
          </div>
          <button onClick={openCreateModal} className="w-full sm:w-auto bg-slate-900 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-slate-800 transition-colors shadow-md">
            <Plus className="w-5 h-5 mr-2" /> Agregar Vehículo
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-3" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-4">N° Unidad</th>
                <th className="p-4">Placa</th>
                <th className="p-4">Propietario / Socio</th>
                <th className="p-4">Detalles del Auto</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-yellow-500" />Buscando flota...</td></tr>
              ) : vehiculosFiltrados.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No se encontraron vehículos.</td></tr>
              ) : (
                vehiculosFiltrados.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 text-lg">{v.numero_vehiculo}</td>
                    <td className="p-4 font-mono font-bold text-slate-700 bg-yellow-50 rounded-lg inline-block mt-2 px-3 py-1 border border-yellow-200">{v.placa}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{v.socio?.nombre}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{v.marca} {v.modelo}</div>
                      <div className="text-xs text-slate-500">Año: {v.anio_fabricacion} | Color: Amarillo</div>
                    </td>
                    <td className="p-4 flex justify-center space-x-2">
                      <button onClick={() => openEditModal(v)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE VEHÍCULOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start p-4 pb-2 sm:p-6 sm:pb-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{editingId ? 'Editar Vehículo' : 'Registrar Vehículo'}</h3>
                <p className="text-slate-500 mt-1">Asigne los datos del activo al socio correspondiente.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 pt-4 sm:p-6 sm:pt-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {formError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{formError}</div>}

              <div className="space-y-4">
                
                {/* Selector de Socio */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Propietario / Socio Asignado</label>
                  <select name="socio_id" value={formData.socio_id} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400">
                    <option value="" disabled>-- Seleccione un socio --</option>
                    {socios.map(s => <option key={s.id} value={s.id}>{s.nombre} (C.I: {s.cedula || 'N/A'})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">N° de Unidad</label>
                    <input type="text" name="numero_vehiculo" value={formData.numero_vehiculo} onChange={handleInputChange} required maxLength="6" pattern="[0-9]{3}-[0-9]{2}" placeholder="Ej. 012-01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Placa (Única)</label>
                    <input type="text" name="placa" value={formData.placa} onChange={handleInputChange} required maxLength="8" pattern="[A-Z]{3}-[0-9]{4}" placeholder="Ej. MBC-4650" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 font-mono uppercase text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Marca</label>
                    <input type="text" name="marca" value={formData.marca} onChange={handleInputChange} required maxLength="50" placeholder="Ej. Chevrolet" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Modelo</label>
                    <input type="text" name="modelo" value={formData.modelo} onChange={handleInputChange} required maxLength="50" placeholder="Ej. Aveo Family" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Año de Fabricación</label>
                    <input type="text" name="anio_fabricacion" value={formData.anio_fabricacion} onChange={handleInputChange} required inputMode="numeric" pattern="[0-9]{4}" maxLength="4" placeholder="Ej. 2018" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-colors ${isSubmitting ? 'bg-slate-200 text-slate-500' : 'bg-[#FFCC00] text-slate-900 hover:bg-yellow-500 shadow-md'}`}>
                  {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Guardando...</> : <><Save className="w-5 h-5 mr-2" /> Guardar Vehículo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiculosScreen;
