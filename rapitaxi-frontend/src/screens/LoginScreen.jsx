import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../apiConfig';

const LoginScreen = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Nuevos estados para manejar la petición
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reiniciamos errores y activamos el estado de carga
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // 1. Guardamos el token en el almacenamiento local del navegador
        localStorage.setItem('auth_token', data.token);
        
        // 2. Redirigimos automáticamente al panel
        navigate('/panel');
      } else {
        // Si hay un error (credenciales incorrectas, etc.), lo mostramos
        // Validamos si Laravel envía errores de validación específicos o un mensaje general
        if (data.errors && data.errors.email) {
          setError(data.errors.email[0]);
        } else {
          setError(data.message || 'Error de autenticación.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor. Verifica que Laravel esté encendido.');
    } finally {
      // Apagamos el estado de carga sin importar el resultado
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400"></div>
          
          <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <ShieldCheck className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            RapiTaxi
          </h1>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
              Portal de Administración
            </span>
          </div>
        </div>

        <div className="p-8">
          {/* Banner de Error Dinámico */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Correo de Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="admin@rapitaxi.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Contraseña de Acceso
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-4 flex items-center justify-center transition-all group ${
                isLoading 
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                  : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500 focus:ring-yellow-200'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-5 h-5" />
                  Verificando...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-500">
              Acceso restringido. Este sistema es de uso exclusivo para personal autorizado. Todo acceso no autorizado será registrado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;