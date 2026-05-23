import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import DashboardPage from './pages/dashboard/DashboardPage';

import PatientsPage from './pages/patients/PatientsPage';
import NewPatientPage from './pages/patients/NewPatientPage';
import PatientDossierPage from './pages/patients/PatientDossierPage';
import DoublonsPage from './pages/patients/Doublonspage';

import DiagnosticsPage from './pages/diagnostics/DiagnosticsPage';
import NewDiagnosticPage from './pages/diagnostics/NewDiagnosticPage';
import DiagnosticDetailPage from './pages/diagnostics/DiagnosticDetailPage';

import TraitementsPage from './pages/traitements/TraitementsPage';
import NewTraitementPage from './pages/traitements/NewTraitementPage';
import TraitementDetailPage from './pages/traitements/TraitementDetailPage';

import SuiviPage from './pages/suivi/SuiviPage';
import NewConsultationPage, { NewEvenementPage } from './pages/suivi/NewConsultationPage';
import ConsultationDetailPage from './pages/suivi/ConsultationDetailPage';

import RCPPage from './pages/rcp/RCPDashboard';
import NewRCPPage, { NewDossierRCPPage } from './pages/rcp/NewRCPPage';
import RCPDetailPage from './pages/rcp/RCPSallePage';

import CartographiePage from './pages/cartographie/CartographiePage';

import StatistiquesPage from './pages/statistiques/StatistiquesPage';
import StatsPage from './pages/stats/StatsPage';
import AdminPage from './pages/admin/AdminPage';
import AdminCustomFieldsPage from './pages/admin/AdminCustomFieldsPage';

import { AppLayout } from './components/layout/Sidebar';
import AccessDenied, { RequirePermission } from './components/auth/AccessDenied';
import useAuthStore from './hooks/useAuth';
import './styles/globals.css';


// ─────────────────────────────────────────
// Route protégée : authentification
// ─────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}


// ─────────────────────────────────────────
// Route protégée : permission spécifique
// ─────────────────────────────────────────
function PermRoute({ permission, message, children }) {
  return (
    <ProtectedRoute>
      <RequirePermission permission={permission} message={message}>
        {children}
      </RequirePermission>
    </ProtectedRoute>
  );
}


// ─────────────────────────────────────────
// Page "à venir"
// ─────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <AppLayout title={title}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🚧</div>
          <div style={{
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 8,
            fontFamily: 'var(--font-display)'
          }}>
            {title}
          </div>
          <div style={{ fontSize: 13 }}>Module en cours de développement</div>
        </div>
      </div>
    </AppLayout>
  );
}


// ─────────────────────────────────────────
// APP
// ─────────────────────────────────────────
function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
          },
        }}
      />

      <Routes>

        {/* ───────── Auth publique ───────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ───────── Dashboard ───────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />

        {/* ───────── Patients ───────── */}
        <Route path="/patients" element={
          <PermRoute permission="readPatient">
            <PatientsPage />
          </PermRoute>
        } />

        <Route path="/patients/nouveau" element={
          <PermRoute permission="writePatient">
            <NewPatientPage />
          </PermRoute>
        } />

        <Route path="/patients/doublons" element={
          <PermRoute permission="writePatient">
            <DoublonsPage />
          </PermRoute>
        } />

        <Route path="/patients/:id" element={
          <PermRoute permission="readPatient">
            <PatientDossierPage />
          </PermRoute>
        } />

        {/* ───────── Diagnostics ───────── */}
        <Route path="/diagnostics" element={
          <PermRoute permission="readDiagnostic">
            <DiagnosticsPage />
          </PermRoute>
        } />

        <Route path="/diagnostics/nouveau" element={
          <PermRoute permission="writeDiagnostic">
            <NewDiagnosticPage />
          </PermRoute>
        } />

        <Route path="/diagnostics/:id" element={
          <PermRoute permission="readDiagnostic">
            <DiagnosticDetailPage />
          </PermRoute>
        } />

        {/* ───────── Traitements ───────── */}
        <Route path="/traitements" element={
          <PermRoute permission="readTreatment">
            <TraitementsPage />
          </PermRoute>
        } />

        <Route path="/traitements/nouveau" element={
          <PermRoute permission="writeTreatment">
            <NewTraitementPage />
          </PermRoute>
        } />

        <Route path="/traitements/:type/:id" element={
          <PermRoute permission="readTreatment">
            <TraitementDetailPage />
          </PermRoute>
        } />

        {/* ───────── Suivi ───────── */}
        <Route path="/suivi" element={
          <PermRoute permission="readTreatment">
            <SuiviPage />
          </PermRoute>
        } />

        <Route path="/suivi/consultations/nouveau" element={
          <PermRoute permission="writeTreatment">
            <NewConsultationPage />
          </PermRoute>
        } />

        <Route path="/suivi/consultations/:id" element={
          <PermRoute permission="readTreatment">
            <ConsultationDetailPage />
          </PermRoute>
        } />

        <Route path="/suivi/evenements/nouveau" element={
          <PermRoute permission="writeTreatment">
            <NewEvenementPage />
          </PermRoute>
        } />

        {/* ───────── Statistiques ───────── */}
        <Route path="/stats" element={
          <PermRoute permission="viewStatistics">
            <StatsPage />
          </PermRoute>
        } />

        {/* ───────── Statistiques (legacy) ───────── */}
        <Route path="/statistiques" element={
          <PermRoute permission="viewStatistics">
            <StatistiquesPage />
          </PermRoute>
        } />

        {/* ───────── Carte SIG ───────── */}
        <Route path="/carte" element={
          <PermRoute permission="viewMap">
            <CartographiePage />
          </PermRoute>
        } />

        {/* ───────── RCP ───────── */}
        <Route path="/rcp" element={
          <PermRoute permission="viewRcp">
            <RCPPage />
          </PermRoute>
        } />

        <Route path="/rcp/nouveau" element={
          <PermRoute permission="viewRcp">
            <NewRCPPage />
          </PermRoute>
        } />

        <Route path="/rcp/:id" element={
          <PermRoute permission="viewRcp">
            <RCPDetailPage />
          </PermRoute>
        } />

        <Route path="/rcp/dossier/nouveau" element={
          <PermRoute permission="viewRcp">
            <NewDossierRCPPage />
          </PermRoute>
        } />

        {/* ───────── Administration ───────── */}
        <Route path="/admin" element={
          <PermRoute permission="manageUsers">
            <AdminPage />
          </PermRoute>
        } />
        <Route path="/admin/champs-personnalises" element={
          <PermRoute permission="manageUsers">
            <AdminCustomFieldsPage />
          </PermRoute>
        } />

        {/* ───────── Accès refusé ───────── */}
        <Route path="/acces-refuse" element={
          <ProtectedRoute>
            <AccessDenied />
          </ProtectedRoute>
        } />
       

        {/* ───────── Redirects ───────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;