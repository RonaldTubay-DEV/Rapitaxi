import React, { useState, useEffect } from 'react';
import { 
  Wrench, Search, Trash2, Loader2, AlertCircle, X, Save, 
  Gauge, FileText, Upload, BatteryCharging, CircleDot
} from 'lucide-react';

const MantenimientoScreen = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mantenimientoIdToComplete, setMantenimientoIdToComplete] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [file, setFile] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  
  const TIPOS_MANTENIMIENTO = [
    'Cambio de Aceite', 
    'Frenos', 
    'Suspensión', 
    'Llantas', 
    'Sistema Eléctrico'
  ];

  const [formData, setFormData] = useState({
    vehiculo_id: '',
    fecha_mantenimiento: new Date().toISOString().split('T')[0],
    tipo_mantenimiento: 'Cambio de Aceite',
    tipo_personalizado: '', 
    kilometraje_actual: '',
    proximo_mantenimiento_km: '',
    costo: '0.00',
    estado: 'En Proceso', 
    observaciones: '',
    detalle_1: '', 
    detalle_2: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
      const [resM, resV] = await Promise.all([
        fetch('http://localhost:8000/api/mantenimientos', { headers }),
        fetch('http://localhost:8000/api/vehiculos', { headers })
      ]);
      if (resM.ok && resV.ok) {
        setMantenimientos(await resM.json());
        setVehiculos(await resV.json());
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedForm = { ...formData, [name]: value };

    if (name === 'tipo_mantenimiento') {
      updatedForm.detalle_1 = '';
      updatedForm.detalle_2 = '';
      updatedForm.proximo_mantenimiento_km = ''; 
    }

    if (name === 'kilometraje_actual' || name === 'tipo_mantenimiento') {
      const kmActual = parseInt(name === 'kilometraje_actual' ? value : formData.kilometraje_actual);
      if (!isNaN(kmActual)) {
        if (updatedForm.tipo_mantenimiento === 'Cambio de Aceite') {
          updatedForm.proximo_mantenimiento_km = kmActual + 5000;
        } else if (updatedForm.tipo_mantenimiento === 'Frenos' || updatedForm.tipo_mantenimiento === 'Llantas') {
          updatedForm.proximo_mantenimiento_km = kmActual + 10000; 
        }
      }
    }

    setFormData(updatedForm);
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    if (formData.tipo_mantenimiento === 'Otro' && formData.tipo_personalizado.trim() === '') {
      setFormError('Debe especificar el tipo de mantenimiento.');
      setIsSubmitting(false); return;
    }

    const kmActual = parseInt(formData.kilometraje_actual);
    const kmProximo = parseInt(formData.proximo_mantenimiento_km);
    
    // Validaciones estrictas de kilometraje
    if (!isNaN(kmProximo)) {
      const diferencia = kmProximo - kmActual;
      
      if (diferencia <= 0) {
        setFormError('ILÓGICO: El kilometraje del próximo mantenimiento debe ser MAYOR al actual.');
        setIsSubmitting(false); return;
      }

      if (formData.tipo_mantenimiento === 'Cambio de Aceite') {
        if (diferencia < 3000 || diferencia > 8500) {
          setFormError('LÍMITE EXCEDIDO: Para cambio de aceite, el próximo kilometraje debe tener una diferencia de entre 3,000 km y 8,500 km respecto al actual.');
          setIsSubmitting(false); return;
        }
      }
    }

    let observacionesEnriquecidas = formData.observaciones;
    let textoDinamico = '';

    switch (formData.tipo_mantenimiento) {
      case 'Cambio de Aceite':
        textoDinamico = `[ACEITE: ${formData.detalle_1 || 'N/A'}] [FILTROS: ${formData.detalle_2 || 'N/A'}]`;
        break;
      case 'Llantas':
        textoDinamico = `[MARCA/MEDIDA: ${formData.detalle_1 || 'N/A'}] [TIEMPO VIDA ESTIMADO: ${formData.detalle_2 || 'N/A'} meses]`;
        break;
      case 'Sistema Eléctrico':
        textoDinamico = `[PIEZA/BATERÍA: ${formData.detalle_1 || 'N/A'}] [GARANTÍA: ${formData.detalle_2 || 'N/A'} meses]`;
        break;
      case 'Suspensión':
      case 'Frenos':
        textoDinamico = `[PIEZAS: ${formData.detalle_1 || 'N/A'}]`;
        break;
      default:
        break;
    }

    if (textoDinamico !== '') {
      observacionesEnriquecidas = `${textoDinamico} \nNotas adicionales: ${formData.observaciones}`;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key !== 'tipo_personalizado' && key !== 'detalle_1' && key !== 'detalle_2' && key !== 'observaciones') {
        if (key === 'tipo_mantenimiento') {
          data.append(key, formData.tipo_mantenimiento === 'Otro' ? formData.tipo_personalizado : formData.tipo_mantenimiento);
        } else {
          data.append(key, formData[key] || ''); 
        }
      }
    });

    data.append('observaciones', observacionesEnriquecidas);
    if (file) data.append('comprobante', file);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/mantenimientos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        body: data
      });

      if (response.ok) {
        const result = await response.json();
        setMantenimientos([result.mantenimiento, ...mantenimientos]);
        setIsModalOpen(false);
        setFile(null);
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || 'Error al guardar.');
      }
    } catch (err) { setFormError('Error de conexión.'); }
    finally { setIsSubmitting(false); }
  };

  const deleteMantenimiento = async (id) => {
    if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/mantenimientos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(response.ok) setMantenimientos(mantenimientos.filter(m => m.id !== id));
    } catch (err) { alert('Error al eliminar.'); }
  };

  const handleStatusChange = async (id, nuevoEstado) => {
    const m = mantenimientos.find(item => item.id === id);
    if (nuevoEstado === 'Completado' && !m.comprobante_ruta) {
      setMantenimientoIdToComplete(id);
      setUploadFile(null);
      setIsUploadModalOpen(true);
      return;
    }
    await enviarActualizacionEstado(id, nuevoEstado, null);
  };

  const enviarActualizacionEstado = async (id, nuevoEstado, archivoAdjunto) => {
    try {
      const token = localStorage.getItem('auth_token');
      let response;

      if (archivoAdjunto) {
        const data = new FormData();
        data.append('estado', nuevoEstado);
        data.append('comprobante', archivoAdjunto);
        data.append('_method', 'PUT'); 

        response = await fetch(`http://localhost:8000/api/mantenimientos/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          body: data
        });
      } else {
        response = await fetch(`http://localhost:8000/api/mantenimientos/${id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ estado: nuevoEstado })
        });
      }

      if (response.ok) {
        const result = await response.json();
        setMantenimientos(mantenimientos.map(m => m.id === id ? result.mantenimiento : m));
        setIsUploadModalOpen(false);
      } else {
        const err = await response.json();
        alert(err.message || 'Error al actualizar el estado.');
      }
    } catch (err) { alert('Error de conexión.'); }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsSubmitting(true);
    await enviarActualizacionEstado(mantenimientoIdToComplete, 'Completado', uploadFile);
    setIsSubmitting(false);
  };

  const mantenimientosFiltrados = mantenimientos.filter(m => {
    const matchesSearch = 
      (m.vehiculo?.socio?.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.vehiculo?.numero_vehiculo ?? '').includes(searchTerm) ||
      (m.vehiculo?.placa ?? '').includes(searchTerm) ||
      (m.tipo_mantenimiento ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || m.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderCamposDinamicos = () => {
    switch (formData.tipo_mantenimiento) {
      case 'Cambio de Aceite':
        return (
          <>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Tipo de Aceite (Viscosidad)</label>
              <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} placeholder="Ej. 20W-50 Sintético" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Filtros Cambiados</label>
              <input type="text" name="detalle_2" value={formData.detalle_2} onChange={handleInputChange} placeholder="Ej. Aceite, Aire, Cabina" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" />
            </div>
          </>
        );
      case 'Llantas':
        return (
          <>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400 flex items-center"><CircleDot className="w-3 h-3 mr-1"/> Marca y Medida</label>
              <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} placeholder="Ej. Michelin 185/65 R15 (x4)" className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Garantía / Vida Útil (Meses)</label>
              <input type="number" name="detalle_2" value={formData.detalle_2} onChange={handleInputChange} placeholder="Ej. 18" className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
            </div>
          </>
        );
      case 'Sistema Eléctrico':
        return (
          <>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400 flex items-center"><BatteryCharging className="w-3 h-3 mr-1"/> Elemento (Batería, Alternador)</label>
              <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} placeholder="Ej. Batería Bosch 42AM" className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Meses de Garantía</label>
              <input type="number" name="detalle_2" value={formData.detalle_2} onChange={handleInputChange} placeholder="Ej. 12" className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-slate-700" />
            </div>
          </>
        );
      case 'Suspensión':
      case 'Frenos':
        return (
          <div className="col-span-2">
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Piezas Reemplazadas / Rectificadas</label>
            <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} placeholder="Ej. Pastillas delanteras, Rectificación de discos..." className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Taller y Mantenimiento</h2>
          <p className="text-slate-500 mt-1">Control predictivo de flota, cambios de aceite y auditoría de facturas.</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-4">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
          >
            <option value="Todos">🔧 Todos los Estados</option>
            <option value="Programado">🔵 Programados</option>
            <option value="En Proceso">🟡 En Proceso</option>
            <option value="Completado">🟢 Completados</option>
          </select>
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" placeholder="Buscar unidad o trabajo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-64 bg-white focus:ring-2 focus:ring-yellow-400 outline-none shadow-sm"
            />
          </div>
          <button onClick={() => { setIsModalOpen(true); setFormError(''); }} className="bg-slate-900 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center hover:bg-slate-800 shadow-md">
            <Wrench className="w-5 h-5 mr-2" /> Nuevo Ingreso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 text-xs uppercase font-semibold">
              <th className="p-4">Fecha / Estado</th>
              <th className="p-4">Unidad / Socio</th>
              <th className="p-4">Kilometraje</th>
              <th className="p-4">Trabajo Realizado</th>
              <th className="p-4">Costo / Factura</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {isLoading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...</td></tr>
            ) : mantenimientosFiltrados.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay mantenimientos con este criterio.</td></tr>
            ) : mantenimientosFiltrados.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-slate-700">{new Date(m.fecha_mantenimiento).toLocaleDateString()}</div>
                  <select 
                    value={m.estado}
                    onChange={(e) => handleStatusChange(m.id, e.target.value)}
                    className={`text-[10px] px-2 py-1 mt-1 rounded-full font-bold uppercase cursor-pointer outline-none appearance-none text-center border shadow-sm transition-colors
                      ${m.estado === 'Completado' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 
                        m.estado === 'Programado' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 
                        'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                  >
                    <option value="Programado">Programado</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </td>
                <td className="p-4">
                  <div className="font-bold">Vehi: {m.vehiculo?.numero_vehiculo ?? ''}</div>
                  <div className="text-xs text-slate-400">{m.vehiculo?.socio?.nombre}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center text-slate-600 font-mono">
                    <Gauge className="w-3 h-3 mr-1" /> {m.kilometraje_actual} km
                  </div>
                  {m.proximo_mantenimiento_km && (
                    <div className="text-[10px] text-blue-500 font-bold mt-1">
                      {m.tipo_mantenimiento === 'Llantas' ? 'Rotación a: ' : 'Próx: '} 
                      {m.proximo_mantenimiento_km} km
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-semibold text-slate-800">{m.tipo_mantenimiento}</div>
                  {m.observaciones && <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 max-w-xs">{m.observaciones}</div>}
                </td>
                <td className="p-4">
                  <div className="font-bold text-green-600">${parseFloat(m.costo).toFixed(2)}</div>
                  {m.comprobante_ruta && (
                    <a href={`http://localhost:8000/storage/${m.comprobante_ruta}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 flex items-center mt-1 hover:underline">
                      <FileText className="w-3 h-3 mr-1" /> Ver Factura
                    </a>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => deleteMantenimiento(m.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold">Registrar Trabajo de Taller</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold flex items-center"><AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" /> {formError}</div>}
              
              <div className="grid grid-cols-2 gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Seleccionar Vehículo</label>
                  <select name="vehiculo_id" value={formData.vehiculo_id} onChange={handleInputChange} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700 shadow-sm">
                    <option value="">-- Elija la unidad --</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>Unidad {v.numero_vehiculo} | Placa: {v.placa} ({v.socio?.nombre})</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Tipo de Trabajo</label>
                  <select name="tipo_mantenimiento" value={formData.tipo_mantenimiento} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700 shadow-sm">
                    {TIPOS_MANTENIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="Otro">Otro (Especificar)</option>
                  </select>
                  
                  {formData.tipo_mantenimiento === 'Otro' && (
                    <input type="text" name="tipo_personalizado" value={formData.tipo_personalizado} onChange={handleInputChange} placeholder="Especifique el trabajo..." className="w-full px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-400 mt-1" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Fecha de Ingreso</label>
                  <input type="date" name="fecha_mantenimiento" value={formData.fecha_mantenimiento} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700 shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Kilometraje Actual</label>
                  <input type="number" name="kilometraje_actual" value={formData.kilometraje_actual} onChange={handleInputChange} required placeholder="Ej. 45000" className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-mono text-slate-700" />
                </div>

                {['Cambio de Aceite', 'Frenos', 'Llantas'].includes(formData.tipo_mantenimiento) && (
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase text-slate-400">
                      {formData.tipo_mantenimiento === 'Llantas' ? 'Próxima Rotación (Km)' : 'Próximo Cambio (Km)'}
                    </label>
                    <input type="number" name="proximo_mantenimiento_km" value={formData.proximo_mantenimiento_km} onChange={handleInputChange} placeholder="Ej. 50000" className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-mono text-slate-700" />
                  </div>
                )}

                {renderCamposDinamicos()}
              </div>

              <div className="grid grid-cols-2 gap-5 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Costo Total ($)</label>
                  <input type="number" step="0.01" name="costo" value={formData.costo} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-green-700 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Estado Inicial</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700">
                    <option value="En Proceso">🟡 En Proceso</option>
                    <option value="Programado">🔵 Programado</option>
                    <option value="Completado">🟢 Completado</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Observaciones Generales</label>
                  <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows="2" placeholder="Detalles de facturación, mecánicos asignados, etc..." className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700"></textarea>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Subir Factura / Comprobante (Opcional si no está completado)</label>
                  <div className="relative group">
                    <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center group-hover:border-yellow-400 transition-colors">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-300 group-hover:text-yellow-500 transition-colors" />
                      <p className="text-xs text-slate-500 font-medium">{file ? file.name : "Haga clic o arrastre su PDF/Imagen aquí"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 bg-slate-900 text-yellow-400 rounded-2xl font-bold hover:bg-slate-800 transition-all flex justify-center items-center shadow-lg">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} Registrar Mantenimiento
              </button>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Finalizar Mantenimiento</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Para marcar este registro como <span className="text-green-600 font-bold">Completado</span>, es obligatorio cargar el comprobante de pago o factura de la reparación.</p>
              
              <div>
                <div className="relative group">
                  <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" required className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center group-hover:border-green-500 transition-colors">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-slate-300 group-hover:text-green-500" />
                    <p className="text-xs text-slate-500 font-medium">{uploadFile ? uploadFile.name : "Subir PDF o Imagen corporativa"}</p>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex justify-center items-center shadow-md transition-colors">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} Guardar y Finalizar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MantenimientoScreen;