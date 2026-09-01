import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Autenticación
import { AuthProvider } from './features/auth/AuthContext';
import AdminLoginScreen from './features/auth/AdminLoginScreen';
import SessionIdleWatcher from './features/auth/SessionIdleWatcher';
import ProtectedRoute from './routes/ProtectedRoute';

// Importación de Pantallas
import DashboardScreen from './screens/DashboardScreen';
import SociosScreen from './screens/SociosScreen';
import AportacionesScreen from './screens/AportacionesScreen';
import ExpedientesScreen from './screens/ExpedientesScreen';
import VehiculosScreen from './screens/VehiculosScreen';
import RevisionesScreen from './screens/RevisionesScreen';
import MantenimientoScreen from './screens/MantenimientoScreen';
import ActasScreen from './screens/ActasScreen';
import LibrosContablesScreen from './screens/LibrosContablesScreen';
import ConfiguracionScreen from './screens/ConfiguracionScreen';
import UsuariosScreen from './screens/UsuariosScreen';

// Importación de la Plantilla Base
import MainLayout from './components/MainLayout';
import ToastHost from './components/ToastHost';
import ConfirmHost from './components/ConfirmHost';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastHost />
        <ConfirmHost />
        <SessionIdleWatcher />
        <Routes>
          {/* Ruta pública */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLoginScreen />} />

          {/* Rutas protegidas que comparten la barra lateral (solo admin/operador) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'operador']} />}>
            <Route element={<MainLayout />}>
              <Route path="/panel" element={<DashboardScreen />} />
              <Route path="/socios" element={<SociosScreen />} />
              <Route path="/aportaciones" element={<AportacionesScreen />} />
              <Route path="/expedientes" element={<ExpedientesScreen />} />
              <Route path="/vehiculos" element={<VehiculosScreen />} />
              <Route path="/revisiones" element={<RevisionesScreen />} />
              <Route path="/mantenimiento" element={<MantenimientoScreen />} />
              <Route path="/actas" element={<ActasScreen />} />
              <Route path="/libros-contables" element={<LibrosContablesScreen />} />

              {/* Solo admin: gestion de personal interno y configuracion critica */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/usuarios" element={<UsuariosScreen />} />
                <Route path="/configuracion" element={<ConfiguracionScreen />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
