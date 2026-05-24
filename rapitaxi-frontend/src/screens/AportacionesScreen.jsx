import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Loader2, AlertCircle, X, Save, DollarSign, Calendar } from 'lucide-react';

const AportacionesScreen = () => {
  // ==========================================
  // ESTADOS
  // ==========================================
  const [aportaciones, setAportaciones] = useState([]);
  const [socios, setSocios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal y Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const fechaHoy = new Date().toISOString().split('T')[0];
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

  const [formData, setFormData] = useState({
    socio_id: '',
    mes_pagado: mesActual,
    anio_pagado: anioActual,
    monto: '20.00',
    fecha_pago: fechaHoy,
    metodo_pago: 'Efectivo'
  });

  // ==========================================
  // FUNCIONES DE API
  // ==========================================
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

      // Conexión a la nueva ruta /api/aportaciones
      const [resAportaciones, resSocios] = await Promise.all([
        fetch('http://localhost:8000/api/aportaciones', { headers }),
        fetch('http://localhost:8000/api/socios', { headers })
      ]);

      if (resAportaciones.ok && resSocios.ok) {
        setAportaciones(await resAportaciones.json());
        setSocios(await resSocios.json());
      } else {
        setError('Error al cargar la información. Revisa que el servidor backend esté funcionando.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setFormData({
      socio_id: '', mes_pagado: mesActual, anio_pagado: anioActual,
      monto: '20.00', fecha_pago: fechaHoy, metodo_pago: 'Efectivo'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/aportaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setAportaciones([data.aportacion, ...aportaciones]);
        setIsModalOpen(false);
      } else {
        setFormError(data.message || 'Error al guardar la aportación.');
      }
    } catch (err) {
      setFormError('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Anular esta aportación?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`http://localhost:8000/api/aportaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAportaciones(aportaciones.filter(a => a.id !== id));
    } catch (err) { alert('Error al eliminar.'); }
  };

  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const aportacionesFiltradas = aportaciones.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (a.socio?.nombre ?? '').toLowerCase().includes(term);
  });

  return (
    <div className="p-8 lg:p-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Control de Aportaciones</h2>
          <p className="text-slate-500 mt-1">Registro de pagos mensuales y cuotas de la flota.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar socio..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 w-72 bg-white"
            />
          </div>
          <button onClick={openCreateModal} className="bg-slate-900 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center hover:bg-slate-800 transition-colors shadow-md">
            <DollarSign className="w-5 h-5 mr-2" /> Registrar Aportación
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr className="border-b border-slate-100">
                <th className="p-4">Recibo</th>
                <th className="p-4">Socio</th>
                <th className="p-4">Periodo</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Monto</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? <tr><td colSpan="6" className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-yellow-500 w-8 h-8" /></td></tr> : 
                aportacionesFiltradas.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500">No hay registros de aportaciones.</td></tr>
                ) : (
                aportacionesFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-500">#{a.id.toString().padStart(4, '0')}</td>
                    <td className="p-4 font-semibold text-slate-900">{a.socio?.nombre}</td>
                    <td className="p-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg">{nombresMeses[a.mes_pagado - 1]} {a.anio_pagado}</span></td>
                    <td className="p-4 flex items-center mt-2 text-slate-600"><Calendar className="w-4 h-4 mr-2" /> {a.fecha_pago}</td>
                    <td className="p-4 font-bold text-green-600">${parseFloat(a.monto).toFixed(2)}</td>
                    <td className="p-4 text-center"><button onClick={() => handleDelete(a.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA REGISTRAR APORTACIÓN (Que faltaba en tu código) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Registrar Aportación</h3>
                <p className="text-slate-500 mt-1">Ingrese el pago de la cuota mensual del socio</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 pt-4">
              {formError && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{formError}</div>
              )}

              <div className="space-y-4">
                
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Seleccionar Socio</label>
                  <select name="socio_id" value={formData.socio_id} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700">
                    <option value="" disabled>-- Elija un socio de la lista --</option>
                    {socios.map(socio => (
                      <option key={socio.id} value={socio.id}>
                        {socio.nombre} {socio.cedula ? `(C.I: ${socio.cedula})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Mes que paga</label>
                    <select name="mes_pagado" value={formData.mes_pagado} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700">
                      {nombresMeses.map((mes, index) => (
                        <option key={index + 1} value={index + 1}>{mes}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Año</label>
                    <input type="number" name="anio_pagado" value={formData.anio_pagado} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Monto ($)</label>
                    <input type="number" step="0.01" name="monto" value={formData.monto} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700 font-bold text-green-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Fecha del Recibo</label>
                    <input type="date" name="fecha_pago" value={formData.fecha_pago} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Método de Pago</label>
                  <select name="metodo_pago" value={formData.metodo_pago} onChange={handleInputChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  type="submit" disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-colors
                    ${isSubmitting ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600 shadow-md'}`}
                >
                  {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Procesando pago...</> : <><Save className="w-6 h-6 mr-2" /> Guardar Recibo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AportacionesScreen;