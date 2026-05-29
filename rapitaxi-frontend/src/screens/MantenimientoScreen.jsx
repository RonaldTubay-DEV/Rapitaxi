import React, { useState, useEffect } from 'react';
import { 
  Wrench, Search, Trash2, Loader2, AlertCircle, X, Save, 
  Gauge, FileText, Upload, BatteryCharging, CircleDot
} from 'lucide-react';
import { API_URL } from '../apiConfig';
import { showSuccessToast } from '../utils/feedback';
import { limitText, normalizeDecimal, onlyDigits } from '../utils/inputFormatters';

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
  const [completionData, setCompletionData] = useState({
    kilometraje_actual: '',
    proximo_mantenimiento_km: '',
    detalle_1: '',
    detalle_2: '',
    costo: '',
    observaciones: ''
  });
  
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
    costo: '',
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
        fetch(`${API_URL}/mantenimientos`, { headers }),
        fetch(`${API_URL}/vehiculos`, { headers })
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
    const formatters = {
      kilometraje_actual: (input) => onlyDigits(input, 7),
      proximo_mantenimiento_km: (input) => onlyDigits(input, 7),
      costo: (input) => normalizeDecimal(input, 6),
      tipo_personalizado: (input) => limitText(input, 80),
      detalle_1: (input) => limitText(input, 120),
      detalle_2: (input) => ['Llantas', 'Sistema Eléctrico'].includes(formData.tipo_mantenimiento) ? onlyDigits(input, 3) : limitText(input, 120),
      observaciones: (input) => limitText(input, 500),
    };
    let updatedForm = { ...formData, [name]: formatters[name] ? formatters[name](value) : value };

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

  const getApiErrorMessage = (errorData, fallback = 'No se pudo guardar el registro.') => {
    if (errorData?.errors) {
      const fieldLabels = {
        vehiculo_id: 'Vehiculo',
        fecha_mantenimiento: 'Fecha de ingreso',
        tipo_mantenimiento: 'Tipo de trabajo',
        kilometraje_actual: 'Kilometraje actual',
        proximo_mantenimiento_km: 'Proximo mantenimiento',
        costo: 'Costo',
        estado: 'Estado',
        observaciones: 'Descripcion del trabajo',
        comprobante: 'Comprobante de pago',
      };

      const validationMessages = Object.entries(errorData.errors).map(([field, messages]) => {
        const label = fieldLabels[field] || field.replaceAll('_', ' ');
        const text = messages.join(' ');

        if (text.toLowerCase().includes('required')) return `${label}: campo obligatorio.`;
        if (text.toLowerCase().includes('integer') || text.toLowerCase().includes('numeric')) return `${label}: ingresa un valor numerico valido.`;
        if (text.toLowerCase().includes('file')) return `${label}: adjunta un archivo valido.`;
        if (text.toLowerCase().includes('greater')) return `${label}: debe ser mayor al kilometraje actual.`;

        return `${label}: ${text}`;
      });

      return `Revisa los campos faltantes: ${validationMessages.join(' ')}`;
    }

    return errorData?.message || fallback;
  };

  const handleCompletionChange = (e) => {
    const { name, value } = e.target;
    const mantenimientoActual = mantenimientos.find(item => item.id === mantenimientoIdToComplete);
    const tipoActual = mantenimientoActual?.tipo_mantenimiento ?? formData.tipo_mantenimiento;
    const formatters = {
      kilometraje_actual: (input) => onlyDigits(input, 7),
      proximo_mantenimiento_km: (input) => onlyDigits(input, 7),
      costo: (input) => normalizeDecimal(input, 6),
      detalle_1: (input) => limitText(input, 120),
      detalle_2: (input) => ['Llantas', 'Sistema Eléctrico'].includes(tipoActual) ? onlyDigits(input, 3) : limitText(input, 120),
      observaciones: (input) => limitText(input, 500),
    };
    const updatedCompletion = {
      ...completionData,
      [name]: formatters[name] ? formatters[name](value) : value
    };

    if (name === 'kilometraje_actual') {
      const kmActual = parseInt(value);
      if (!isNaN(kmActual)) {
        if (tipoActual === 'Cambio de Aceite') {
          updatedCompletion.proximo_mantenimiento_km = String(kmActual + 5000);
        } else if (tipoActual === 'Frenos' || tipoActual === 'Llantas') {
          updatedCompletion.proximo_mantenimiento_km = String(kmActual + 10000);
        }
      }
    }

    setCompletionData(updatedCompletion);
  };

  const buildObservacionesCierre = (tipoMantenimiento, datos) => {
    let textoDinamico = '';

    switch (tipoMantenimiento) {
      case 'Cambio de Aceite':
        textoDinamico = `[ACEITE: ${datos.detalle_1 || 'N/A'}] [FILTROS: ${datos.detalle_2 || 'N/A'}]`;
        break;
      case 'Llantas':
        textoDinamico = `[MARCA/MEDIDA: ${datos.detalle_1 || 'N/A'}] [TIEMPO VIDA ESTIMADO: ${datos.detalle_2 || 'N/A'} meses]`;
        break;
      case 'Sistema Eléctrico':
        textoDinamico = `[PIEZA/BATERIA: ${datos.detalle_1 || 'N/A'}] [GARANTIA: ${datos.detalle_2 || 'N/A'} meses]`;
        break;
      case 'Suspensión':
      case 'Frenos':
        textoDinamico = `[PIEZAS: ${datos.detalle_1 || 'N/A'}]`;
        break;
      default:
        break;
    }

    return textoDinamico !== ''
      ? `${textoDinamico} \nNotas adicionales: ${datos.observaciones}`
      : datos.observaciones;
  };

  const validarDatosCierre = (datos, tipoMantenimiento, setError) => {
    if (!datos.kilometraje_actual || parseInt(datos.kilometraje_actual) <= 0) {
      setError('Para completar debes ingresar el kilometraje actual de la unidad.');
      return false;
    }

    if (['Cambio de Aceite', 'Frenos', 'Llantas'].includes(tipoMantenimiento)) {
      if (!datos.proximo_mantenimiento_km) {
        setError('Debes ingresar el kilometraje del proximo mantenimiento.');
        return false;
      }

      const kmActual = parseInt(datos.kilometraje_actual);
      const kmProximo = parseInt(datos.proximo_mantenimiento_km);
      const diferencia = kmProximo - kmActual;

      if (diferencia <= 0) {
        setError('El kilometraje del proximo mantenimiento debe ser mayor al actual.');
        return false;
      }

      if (tipoMantenimiento === 'Cambio de Aceite' && (diferencia < 3000 || diferencia > 8500)) {
        setError('Para cambio de aceite, el proximo kilometraje debe tener una diferencia de entre 3,000 km y 8,500 km respecto al actual.');
        return false;
      }
    }

    if (['Cambio de Aceite', 'Llantas', 'Sistema Eléctrico', 'Suspensión', 'Frenos'].includes(tipoMantenimiento) && datos.detalle_1.trim() === '') {
      setError('Debes completar el detalle tecnico del trabajo realizado.');
      return false;
    }

    if (['Cambio de Aceite', 'Llantas', 'Sistema Eléctrico'].includes(tipoMantenimiento) && datos.detalle_2.trim() === '') {
      setError('Debes completar el segundo detalle tecnico del trabajo realizado.');
      return false;
    }

    if (!datos.costo || parseFloat(datos.costo) <= 0) {
      setError('Para completar debes ingresar el costo del mantenimiento.');
      return false;
    }

    if (datos.observaciones.trim() === '') {
      setError('Para completar debes describir el trabajo realizado.');
      return false;
    }

    return true;
  };

  const renderCamposCierre = (datos, onChange, tipoMantenimiento) => (
    <>
      <div>
        <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Kilometraje Actual</label>
        <input type="text" inputMode="numeric" name="kilometraje_actual" value={datos.kilometraje_actual} onChange={onChange} required maxLength="7" placeholder="Ej. 45000" className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-slate-700" />
      </div>

      {['Cambio de Aceite', 'Frenos', 'Llantas'].includes(tipoMantenimiento) && (
        <div>
          <label className="block text-xs font-bold mb-1 uppercase text-slate-400">
            {tipoMantenimiento === 'Llantas' ? 'Proxima Rotacion (Km)' : 'Proximo Cambio (Km)'}
          </label>
          <input type="text" inputMode="numeric" name="proximo_mantenimiento_km" value={datos.proximo_mantenimiento_km} onChange={onChange} required maxLength="7" placeholder="Ej. 50000" className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-slate-700" />
        </div>
      )}

      {tipoMantenimiento === 'Cambio de Aceite' && (
        <>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Tipo de Aceite</label>
            <input type="text" name="detalle_1" value={datos.detalle_1} onChange={onChange} required maxLength="120" placeholder="Ej. 20W-50 Sintetico" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Filtros Cambiados</label>
            <input type="text" name="detalle_2" value={datos.detalle_2} onChange={onChange} required maxLength="120" placeholder="Ej. Aceite, Aire, Cabina" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" />
          </div>
        </>
      )}

      {tipoMantenimiento === 'Llantas' && (
        <>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400 flex items-center"><CircleDot className="w-3 h-3 mr-1"/> Marca y Medida</label>
            <input type="text" name="detalle_1" value={datos.detalle_1} onChange={onChange} required maxLength="120" placeholder="Ej. Michelin 185/65 R15 (x4)" className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Garantia / Vida Util (Meses)</label>
            <input type="text" inputMode="numeric" name="detalle_2" value={datos.detalle_2} onChange={onChange} required maxLength="3" placeholder="Ej. 18" className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
          </div>
        </>
      )}

      {tipoMantenimiento === 'Sistema Eléctrico' && (
        <>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400 flex items-center"><BatteryCharging className="w-3 h-3 mr-1"/> Elemento</label>
            <input type="text" name="detalle_1" value={datos.detalle_1} onChange={onChange} required maxLength="120" placeholder="Ej. Bateria Bosch 42AM" className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Meses de Garantia</label>
            <input type="text" inputMode="numeric" name="detalle_2" value={datos.detalle_2} onChange={onChange} required maxLength="3" placeholder="Ej. 12" className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-slate-700" />
          </div>
        </>
      )}

      {['Suspensión', 'Frenos'].includes(tipoMantenimiento) && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Piezas Reemplazadas / Rectificadas</label>
          <input type="text" name="detalle_1" value={datos.detalle_1} onChange={onChange} required maxLength="120" placeholder="Ej. Pastillas delanteras, rectificacion de discos..." className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-slate-700" />
        </div>
      )}
    </>
  );

  const getAllowedStatusOptions = (estado) => {
    if (estado === 'Completado') return ['Completado'];
    if (estado === 'En Proceso') return ['En Proceso', 'Completado'];
    return ['Programado', 'En Proceso', 'Completado'];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    if (formData.tipo_mantenimiento === 'Otro' && formData.tipo_personalizado.trim() === '') {
      setFormError('Debe especificar el tipo de mantenimiento.');
      setIsSubmitting(false); return;
    }

    if (formData.estado === 'Completado') {
      if (!file) {
        setFormError('Para registrar como completado debes adjuntar el comprobante de pago.');
        setIsSubmitting(false); return;
      }
      if (!validarDatosCierre(formData, formData.tipo_mantenimiento, setFormError)) {
        setIsSubmitting(false); return;
      }
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
      if (key !== 'tipo_personalizado' && key !== 'detalle_1' && key !== 'detalle_2' && key !== 'observaciones' && key !== 'costo') {
        if (key === 'tipo_mantenimiento') {
          data.append(key, formData.tipo_mantenimiento === 'Otro' ? formData.tipo_personalizado : formData.tipo_mantenimiento);
        } else {
          data.append(key, formData[key] || ''); 
        }
      }
    });

    if (formData.estado === 'Completado') {
      data.append('costo', formData.costo);
      data.append('observaciones', observacionesEnriquecidas);
      data.append('comprobante', file);
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/mantenimientos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        body: data
      });

      if (response.ok) {
        const result = await response.json();
        setMantenimientos([result.mantenimiento, ...mantenimientos]);
        setIsModalOpen(false);
        setFile(null);
        showSuccessToast('Mantenimiento registrado exitosamente.');
        
      } else {
        const errorData = await response.json();
        setFormError(getApiErrorMessage(errorData, 'Error al guardar el mantenimiento.'));
      }
    } catch (err) { setFormError('Error de conexión.'); }
    finally { setIsSubmitting(false); }
  };

  const deleteMantenimiento = async (id) => {
    const mantenimiento = mantenimientos.find(item => item.id === id);
    if (mantenimiento?.estado === 'Completado') {
      alert('No se puede eliminar un mantenimiento completado.');
      return;
    }
    if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/mantenimientos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(response.ok) {
        setMantenimientos(mantenimientos.filter(m => m.id !== id));
        showSuccessToast('Mantenimiento eliminado exitosamente.');
      }
    } catch (err) { alert('Error al eliminar.'); }
  };

  const handleStatusChange = async (id, nuevoEstado) => {
    const m = mantenimientos.find(item => item.id === id);
    if (m.estado === 'Completado') return;
    if (m.estado === 'En Proceso' && nuevoEstado === 'Programado') {
      alert('El estado solo puede avanzar, no regresar a Programado.');
      return;
    }
    if (nuevoEstado === 'Completado') {
      setMantenimientoIdToComplete(id);
      setUploadFile(null);
      setCompletionData({
        kilometraje_actual: m.kilometraje_actual && parseInt(m.kilometraje_actual) > 0 ? String(m.kilometraje_actual) : '',
        proximo_mantenimiento_km: m.proximo_mantenimiento_km ? String(m.proximo_mantenimiento_km) : '',
        detalle_1: '',
        detalle_2: '',
        costo: m.costo && parseFloat(m.costo) > 0 ? parseFloat(m.costo).toFixed(2) : '',
        observaciones: ''
      });
      setIsUploadModalOpen(true);
      return;
    }
    await enviarActualizacionEstado(id, nuevoEstado);
  };

  const enviarActualizacionEstado = async (id, nuevoEstado, cierre = null) => {
    try {
      const token = localStorage.getItem('auth_token');
      let response;

      if (cierre?.archivoAdjunto) {
        const data = new FormData();
        data.append('estado', nuevoEstado);
        data.append('kilometraje_actual', cierre.kilometraje_actual);
        data.append('proximo_mantenimiento_km', cierre.proximo_mantenimiento_km || '');
        data.append('costo', cierre.costo);
        data.append('observaciones', cierre.observaciones);
        data.append('comprobante', cierre.archivoAdjunto);
        data.append('_method', 'PUT'); 

        response = await fetch(`${API_URL}/mantenimientos/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          body: data
        });
      } else {
        response = await fetch(`${API_URL}/mantenimientos/${id}`, {
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
        showSuccessToast('Estado de mantenimiento actualizado exitosamente.');
      } else {
        const err = await response.json();
        alert(getApiErrorMessage(err, 'Error al actualizar el estado.'));
      }
    } catch (err) { alert('Error de conexión.'); }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Debes adjuntar el comprobante de pago.');
      return;
    }
    const mantenimientoActual = mantenimientos.find(item => item.id === mantenimientoIdToComplete);
    const tipoMantenimiento = mantenimientoActual?.tipo_mantenimiento ?? '';
    if (!validarDatosCierre(completionData, tipoMantenimiento, alert)) {
      return;
    }
    setIsSubmitting(true);
    await enviarActualizacionEstado(mantenimientoIdToComplete, 'Completado', {
      archivoAdjunto: uploadFile,
      kilometraje_actual: completionData.kilometraje_actual,
      proximo_mantenimiento_km: completionData.proximo_mantenimiento_km,
      costo: completionData.costo,
      observaciones: buildObservacionesCierre(tipoMantenimiento, completionData)
    });
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
              <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} maxLength="120" placeholder="Ej. 20W-50 Sintético" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Filtros Cambiados</label>
              <input type="text" name="detalle_2" value={formData.detalle_2} onChange={handleInputChange} maxLength="120" placeholder="Ej. Aceite, Aire, Cabina" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" />
            </div>
          </>
        );
      case 'Llantas':
        return (
          <>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400 flex items-center"><CircleDot className="w-3 h-3 mr-1"/> Marca y Medida</label>
              <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} maxLength="120" placeholder="Ej. Michelin 185/65 R15 (x4)" className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Garantía / Vida Útil (Meses)</label>
              <input type="text" inputMode="numeric" name="detalle_2" value={formData.detalle_2} onChange={handleInputChange} maxLength="3" placeholder="Ej. 18" className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-700" />
            </div>
          </>
        );
      case 'Sistema Eléctrico':
        return (
          <>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400 flex items-center"><BatteryCharging className="w-3 h-3 mr-1"/> Elemento (Batería, Alternador)</label>
              <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} maxLength="120" placeholder="Ej. Batería Bosch 42AM" className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Meses de Garantía</label>
              <input type="text" inputMode="numeric" name="detalle_2" value={formData.detalle_2} onChange={handleInputChange} maxLength="3" placeholder="Ej. 12" className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-slate-700" />
            </div>
          </>
        );
      case 'Suspensión':
      case 'Frenos':
        return (
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Piezas Reemplazadas / Rectificadas</label>
            <input type="text" name="detalle_1" value={formData.detalle_1} onChange={handleInputChange} maxLength="120" placeholder="Ej. Pastillas delanteras, Rectificación de discos..." className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700" />
          </div>
        );
      default:
        return null;
    }
  };

  // Función para obtener la URL correcta del archivo subido
  const getStorageUrl = (ruta) => {
    return API_URL.replace('/api', '/storage/') + ruta;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Taller y Mantenimiento</h2>
          <p className="text-slate-500 mt-1">Control predictivo de flota, cambios de aceite y auditoría de facturas.</p>
        </div>
        <div className="mt-4 md:mt-0 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-semibold text-slate-700 shadow-sm cursor-pointer"
          >
            <option value="Todos">🔧 Todos los Estados</option>
            <option value="Programado">🔵 Programados</option>
            <option value="En Proceso">🟡 En Proceso</option>
            <option value="Completado">🟢 Completados</option>
          </select>
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" placeholder="Buscar unidad o trabajo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 outline-none shadow-sm"
            />
          </div>
          <button onClick={() => { setIsModalOpen(true); setFormError(''); }} className="w-full sm:w-auto bg-slate-900 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-slate-800 shadow-md">
            <Wrench className="w-5 h-5 mr-2" /> Nuevo Ingreso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left border-collapse">
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
                    disabled={m.estado === 'Completado'}
                    className={`text-[10px] px-2 py-1 mt-1 rounded-full font-bold uppercase cursor-pointer outline-none appearance-none text-center border shadow-sm transition-colors
                      ${m.estado === 'Completado' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 
                        m.estado === 'Programado' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 
                        'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                  >
                    {getAllowedStatusOptions(m.estado).map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
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
                  {m.estado === 'Completado' ? (
                    <div className="font-bold text-green-600">${parseFloat(m.costo || 0).toFixed(2)}</div>
                  ) : (
                    <div className="text-xs font-bold uppercase text-slate-400">Pendiente de cierre</div>
                  )}
                  {m.comprobante_ruta && (
                    <a href={getStorageUrl(m.comprobante_ruta)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 flex items-center mt-1 hover:underline">
                      <FileText className="w-3 h-3 mr-1" /> Ver Factura
                    </a>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => deleteMantenimiento(m.id)}
                    disabled={m.estado === 'Completado'}
                    className={`p-2 rounded-lg ${m.estado === 'Completado' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-600 hover:bg-red-50'}`}
                    title={m.estado === 'Completado' ? 'Los mantenimientos completados no se pueden modificar' : 'Eliminar'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg sm:text-xl font-bold">Registrar Trabajo de Taller</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {formError && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold flex items-center"><AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" /> {formError}</div>}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Seleccionar Vehículo</label>
                  <select name="vehiculo_id" value={formData.vehiculo_id} onChange={handleInputChange} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700 shadow-sm">
                    <option value="">-- Elija la unidad --</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>Unidad {v.numero_vehiculo} | Placa: {v.placa} ({v.socio?.nombre})</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2 sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Tipo de Trabajo</label>
                  <select name="tipo_mantenimiento" value={formData.tipo_mantenimiento} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700 shadow-sm">
                    {TIPOS_MANTENIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="Otro">Otro (Especificar)</option>
                  </select>
                  
                  {formData.tipo_mantenimiento === 'Otro' && (
                    <input type="text" name="tipo_personalizado" value={formData.tipo_personalizado} onChange={handleInputChange} maxLength="80" placeholder="Especifique el trabajo..." className="w-full px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-400 mt-1" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Fecha de Ingreso</label>
                  <input type="date" name="fecha_mantenimiento" value={formData.fecha_mantenimiento} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700 shadow-sm" />
                </div>
              </div>

              <div className={formData.estado === 'Completado' ? 'grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4' : 'hidden'}>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Kilometraje Actual</label>
                  <input type="text" inputMode="numeric" name="kilometraje_actual" value={formData.kilometraje_actual} onChange={handleInputChange} required={formData.estado === 'Completado'} maxLength="7" placeholder="Ej. 45000" className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-mono text-slate-700" />
                </div>

                {['Cambio de Aceite', 'Frenos', 'Llantas'].includes(formData.tipo_mantenimiento) && (
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase text-slate-400">
                      {formData.tipo_mantenimiento === 'Llantas' ? 'Próxima Rotación (Km)' : 'Próximo Cambio (Km)'}
                    </label>
                    <input type="text" inputMode="numeric" name="proximo_mantenimiento_km" value={formData.proximo_mantenimiento_km} onChange={handleInputChange} maxLength="7" placeholder="Ej. 50000" className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-mono text-slate-700" />
                  </div>
                )}

                {renderCamposDinamicos()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4 pt-4 border-t border-slate-100">
                <div className={formData.estado === 'Completado' ? '' : 'hidden'}>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Costo Total ($)</label>
                  <input type="text" inputMode="decimal" name="costo" value={formData.costo} onChange={handleInputChange} maxLength="9" required={formData.estado === 'Completado'} className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-green-700 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Estado Inicial</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-slate-700">
                    <option value="En Proceso">🟡 En Proceso</option>
                    <option value="Programado">🔵 Programado</option>
                    <option value="Completado">🟢 Completado</option>
                  </select>
                </div>
                
                <div className={formData.estado === 'Completado' ? 'sm:col-span-2' : 'hidden'}>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Observaciones Generales</label>
                  <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows="3" maxLength="500" required={formData.estado === 'Completado'} placeholder="Descripcion del trabajo realizado a la unidad." className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-slate-700"></textarea>
                </div>

                <div className={formData.estado === 'Completado' ? 'sm:col-span-2' : 'hidden'}>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Comprobante de pago del mantenimiento</label>
                  <div className="relative group">
                    <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" required={formData.estado === 'Completado'} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center group-hover:border-yellow-400 transition-colors">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-300 group-hover:text-yellow-500 transition-colors" />
                      <p className="text-xs text-slate-500 font-medium">{file ? file.name : "Subir comprobante en PDF o imagen"}</p>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Finalizar Mantenimiento</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-4 sm:p-6 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <p className="text-sm text-slate-600">Para marcar este registro como <span className="text-green-600 font-bold">Completado</span>, registra kilometraje, detalles del trabajo, costo, descripcion y comprobante de pago.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderCamposCierre(completionData, handleCompletionChange, mantenimientos.find(item => item.id === mantenimientoIdToComplete)?.tipo_mantenimiento ?? '')}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Costo Total ($)</label>
                <input type="text" inputMode="decimal" name="costo" value={completionData.costo} onChange={handleCompletionChange} maxLength="9" required className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-green-700 font-bold" />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Descripcion del trabajo realizado</label>
                <textarea name="observaciones" value={completionData.observaciones} onChange={handleCompletionChange} rows="3" maxLength="500" required placeholder="Detalle lo realizado a la unidad." className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-slate-700" />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase text-slate-400">Comprobante de pago</label>
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
