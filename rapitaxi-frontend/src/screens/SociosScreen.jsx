import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle, X, Save } from 'lucide-react';
import { API_URL } from '../apiConfig';
const SociosScreen = () => {
  // ==========================================
  // ESTADOS
  // ==========================================
  const [socios, setSocios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal y Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Estado inicial limpio (sin datos de vehículo)
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    correo: '',
    direccion: '',
    estado: 'Activo',
    observaciones: ''
  });

  // ==========================================
  // FUNCIONES DE API
  // ==========================================
  const fetchSocios = async (query = '') => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const url = query 
        ? `${API_URL}/socios?search=${encodeURIComponent(query)}` 
        : `${API_URL}/socios`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSocios(data);
      } else {
        setError('Error al cargar los socios.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSocios(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setFormData({ 
      nombre: '', cedula: '', telefono: '', correo: '', 
      direccion: '', estado: 'Activo', observaciones: '' 
    });
    setEditingId(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (socio) => {
    setFormData({
      nombre: socio.nombre,
      cedula: socio.cedula || '',
      telefono: socio.telefono || '',
      correo: socio.correo || '',
      direccion: socio.direccion || '',
      estado: socio.estado,
      observaciones: socio.observaciones || ''
    });
    setEditingId(socio.id);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const dataToSend = {
      ...formData,
      cedula: formData.cedula.trim() === '' ? null : formData.cedula,
      telefono: formData.telefono.trim() === '' ? null : formData.telefono,
      correo: formData.correo.trim() === '' ? null : formData.correo,
      direccion: formData.direccion.trim() === '' ? null : formData.direccion,
      observaciones: formData.observaciones.trim() === '' ? null : formData.observaciones,
    };

    const isEditing = editingId !== null;
    const url = isEditing ? `${API_URL}/socios/${editingId}` : `${API_URL}/socios`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        if (isEditing) {
          setSocios(socios.map(s => s.id === editingId ? data.socio : s));
        } else {
          setSocios([data.socio, ...socios]);
        }
        setIsModalOpen(false);
      } else {
        if (data.errors) {
          setFormError(Object.values(data.errors)[0][0]);
        } else {
          setFormError(data.message || 'Error al guardar.');
        }
      }
    } catch (err) {
      setFormError('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/socios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setSocios(socios.filter(s => s.id !== id));
    } catch (err) {
      alert('Error de conexión.');
    }
  };

  return (
    <div className="p-8 lg:p-10 relative">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Gestión de Socios</h2>
          <p className="text-slate-500 mt-1">Administra los accionistas, control de estados financieros y observaciones.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar socio, cédula..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 w-72 bg-white"
            />
          </div>
          <button onClick={openCreateModal} className="bg-slate-900 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center hover:bg-slate-800 transition-colors shadow-md">
            <Plus className="w-5 h-5 mr-2" /> Nuevo Socio
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Tabla Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4">Nombre Accionista</th>
                <th className="p-4">Cédula</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Estado Pago</th>
                <th className="p-4">Observaciones</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-yellow-500" />Buscando...</td>
                </tr>
              ) : socios.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No se encontraron registros.</td>
                </tr>
              ) : (
                socios.map((socio) => (
                  <tr 
                    key={socio.id} 
                    className={`transition-colors ${socio.estado_pago_actual === 'En mora' ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-4 font-bold text-slate-900">{socio.nombre}</td>
                    <td className="p-4 font-medium">{socio.cedula || '---'}</td>
                    <td className="p-4 font-medium">{socio.telefono || '---'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        socio.estado_pago_actual === 'Al día' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'
                      }`}>
                        {socio.estado_pago_actual}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate">
                      {socio.observaciones ? (
                        <span className="text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 block truncate" title={socio.observaciones}>
                          {socio.observaciones}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Sin observaciones</span>
                      )}
                    </td>
                    <td className="p-4 flex justify-center space-x-2">
                      <button onClick={() => openEditModal(socio)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(socio.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE REGISTRO / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{editingId ? 'Editar Socio' : 'Registrar Nuevo Socio'}</h3>
                <p className="text-slate-500 mt-1">Complete la información personal y de contacto del socio</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 pt-4">
              {formError && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{formError}</div>
              )}

              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Nombre Completo</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" placeholder="Ej. Juan Pérez" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Cédula (Opcional)</label>
                    <input type="text" name="cedula" value={formData.cedula} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" placeholder="000-0000000-0" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Estado de Afiliación</label>
                    <select name="estado" value={formData.estado} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700 bg-white">
                      <option value="Activo">🟢 Activo</option>
                      <option value="Inactivo">🔴 Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Teléfono (Opcional)</label>
                    <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" placeholder="(099) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Correo (Opcional)</label>
                    <input type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" placeholder="correo@ejemplo.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Dirección (Opcional)</label>
                  <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" placeholder="Dirección completa" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Observaciones del Expediente (Opcional)</label>
                  <textarea 
                    name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows="2"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700 resize-none"
                    placeholder="Ej. Vendió el puesto a X persona / Cupo retirado provisionalmente..."
                  />
                </div>

              </div>

              <div className="mt-6">
                <button 
                  type="submit" disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center transition-colors shadow-md
                    ${isSubmitting ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#FFCC00] text-slate-900 hover:bg-yellow-500'}`}
                >
                  {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Guardando...</> : <><Save className="w-5 h-5 mr-2" /> {editingId ? 'Guardar Cambios' : 'Registrar Socio'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SociosScreen;