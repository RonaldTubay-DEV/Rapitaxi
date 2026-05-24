import React, { useState, useEffect } from 'react';
import { 
  Users, FolderOpen, Search, FileText, Image as ImageIcon, 
  Upload, Trash2, Loader2, AlertCircle, X, ExternalLink, File
} from 'lucide-react';

const ExpedientesScreen = () => {
  // Estados para Socios (Izquierda)
  const [socios, setSocios] = useState([]);
  const [selectedSocio, setSelectedSocio] = useState(null);
  const [searchSocio, setSearchSocio] = useState('');

  // Estados para Documentos (Derecha)
  const [expedientes, setExpedientes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estado para el Modal de Subida
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileData, setFileData] = useState({ nombre: '', archivo: null });
  const [uploadError, setUploadError] = useState('');

  // ==========================================
  // CARGAR SOCIOS
  // ==========================================
  useEffect(() => {
    const fetchSocios = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:8000/api/socios', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSocios(data);
        }
      } catch (err) { console.error(err); }
    };
    fetchSocios();
  }, []);

  // ==========================================
  // CARGAR EXPEDIENTES DEL SOCIO SELECCIONADO
  // ==========================================
  useEffect(() => {
    if (selectedSocio) {
      const fetchExpedientes = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(`http://localhost:8000/api/expedientes?socio_id=${selectedSocio.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setExpedientes(data);
          }
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
      };
      fetchExpedientes();
    }
  }, [selectedSocio]);

  // ==========================================
  // SUBIR ARCHIVO (FORM DATA)
  // ==========================================
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileData.archivo) return setUploadError('Debe seleccionar un archivo.');
    
    setIsUploading(true);
    setUploadError('');

    // FormData es OBLIGATORIO para enviar archivos físicos
    const formData = new FormData();
    formData.append('socio_id', selectedSocio.id);
    formData.append('nombre_documento', fileData.nombre);
    formData.append('archivo', fileData.archivo);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/expedientes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // NO poner Content-Type, el navegador lo hará solo
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setExpedientes([data.expediente, ...expedientes]);
        setIsModalOpen(false);
        setFileData({ nombre: '', archivo: null });
      } else {
        setUploadError('Error al subir el archivo. Intente con un formato válido.');
      }
    } catch (err) {
      setUploadError('Error de conexión.');
    } finally { setIsUploading(false); }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm('¿Eliminar este documento permanentemente?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/expedientes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setExpedientes(expedientes.filter(e => e.id !== id));
    } catch (err) { alert('Error al eliminar.'); }
  };

  // Filtrado de lista lateral
  const sociosFiltrados = socios.filter(s => 
    (s.nombre || '').toLowerCase().includes(searchSocio.toLowerCase()) || 
    (s.vehiculos?.[0]?.numero_vehiculo ?? '').toString().includes(searchSocio)
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* PANEL IZQUIERDO: LISTA DE SOCIOS */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-yellow-500" /> Socios
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" placeholder="Buscar..." value={searchSocio} onChange={(e) => setSearchSocio(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sociosFiltrados.map(socio => (
            <button 
              key={socio.id}
              onClick={() => setSelectedSocio(socio)}
              className={`w-full p-4 flex items-center text-left border-b border-slate-50 transition-colors
                ${selectedSocio?.id === socio.id ? 'bg-yellow-50 border-r-4 border-r-yellow-500' : 'hover:bg-slate-50'}`}
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 mr-3">
                {socio.vehiculos?.[0]?.numero_vehiculo ?? ''}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-slate-800 text-sm truncate">{socio.nombre}</p>
                <p className="text-xs text-slate-400">{socio.vehiculos?.[0]?.placa ?? ''}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* PANEL DERECHO: CARPETA VIRTUAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedSocio ? (
          <>
            <header className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  <FolderOpen className="w-6 h-6 mr-3 text-yellow-500" />
                  Expediente de {selectedSocio.nombre}
                </h2>
                <p className="text-sm text-slate-500">Unidad: {selectedSocio.vehiculos?.[0]?.numero_vehiculo ?? ''} | Placa: {selectedSocio.vehiculos?.[0]?.placa ?? ''}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-900 text-yellow-400 px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-slate-800 transition-all shadow-md"
              >
                <Upload className="w-5 h-5 mr-2" /> Subir Documento
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-yellow-500" />
                  <p>Abriendo archivador...</p>
                </div>
              ) : expedientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">La carpeta está vacía</p>
                  <p className="text-sm">Empieza subiendo la matrícula o cédula del socio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {expedientes.map(doc => (
                    <div key={doc.id} className="group bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-xl transition-all relative">
                      <div className="aspect-square bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                        {['jpg', 'jpeg', 'png'].includes(doc.tipo_documento.toLowerCase()) ? (
                          <img src={doc.url_archivo} alt="doc" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-12 h-12 text-blue-500" />
                        )}
                      </div>
                      <p className="font-bold text-slate-800 text-xs truncate mb-1">{doc.nombre_documento}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{doc.tipo_documento} • {new Date(doc.created_at).toLocaleDateString()}</p>
                      
                      {/* Acciones flotantes */}
                      <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={doc.url_archivo} target="_blank" rel="noreferrer" className="p-1.5 bg-white shadow-md rounded-lg text-blue-600 hover:bg-blue-50">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => deleteDocument(doc.id)} className="p-1.5 bg-white shadow-md rounded-lg text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="bg-white p-10 rounded-full shadow-inner mb-6">
              <FolderOpen className="w-20 h-20 opacity-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-600">Gestión de Expedientes</h3>
            <p className="max-w-xs text-center mt-2">Selecciona un socio de la lista izquierda para ver sus documentos digitalizados.</p>
          </div>
        )}
      </main>

      {/* MODAL DE SUBIDA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Subir Documento</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {uploadError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> {uploadError}</div>}
              
              <div>
                <label className="block text-sm font-bold mb-2">Nombre del Documento</label>
                <input 
                  type="text" required value={fileData.nombre} onChange={(e) => setFileData({...fileData, nombre: e.target.value})}
                  placeholder="Ej: Matrícula 2026" className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Seleccionar Archivo (PDF o Imagen)</label>
                <div className="relative group">
                  <input 
                    type="file" required accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileData({...fileData, archivo: e.target.files[0]})}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center group-hover:border-yellow-400 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300 group-hover:text-yellow-500" />
                    <p className="text-xs text-slate-500">{fileData.archivo ? fileData.archivo.name : "Haga clic o arrastre aquí"}</p>
                  </div>
                </div>
              </div>

              <button 
                type="submit" disabled={isUploading}
                className="w-full py-4 bg-slate-900 text-yellow-400 rounded-2xl font-bold hover:bg-slate-800 transition-all flex justify-center items-center"
              >
                {isUploading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Subiendo...</> : "Empezar Subida"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpedientesScreen;