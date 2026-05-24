import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importación de Pantallas
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import SociosScreen from './screens/SociosScreen';
import AportacionesScreen from './screens/AportacionesScreen'; // Corregido el nombre
import ExpedientesScreen from './screens/ExpedientesScreen';
import VehiculosScreen from './screens/VehiculosScreen'; 
import RevisionesScreen from './screens/RevisionesScreen';
import MantenimientoScreen from './screens/MantenimientoScreen';
import ActasScreen from './screens/ActasScreen';
import LibrosContablesScreen from './screens/LibrosContablesScreen'; // Pantalla para PDFs

// Importación de la Plantilla Base
import MainLayout from './components/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública (Login) */}
        <Route path="/" element={<LoginScreen />} />
        
        {/* Rutas protegidas que comparten la barra lateral */}
        <Route element={<MainLayout />}>
          <Route path="/panel" element={<DashboardScreen />} />
          <Route path="/socios" element={<SociosScreen />} />
          <Route path="/aportaciones" element={<AportacionesScreen />} /> {/* Nueva ruta */}
          <Route path="/expedientes" element={<ExpedientesScreen />} />
          <Route path="/vehiculos" element={<VehiculosScreen />} /> 
          <Route path="/revisiones" element={<RevisionesScreen />} />
          <Route path="/mantenimiento" element={<MantenimientoScreen />} />
          <Route path="/actas" element={<ActasScreen />} />
          <Route path="/libros-contables" element={<LibrosContablesScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;