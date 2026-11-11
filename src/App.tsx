import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardView } from '@/components/DashboardView';
import { AcervoView } from '@/components/AcervoView';
import { LixeiraView } from '@/components/LixeiraView';
import { FolderTree, Trash2, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef5fe] flex items-center justify-center text-[#013375] font-['Montserrat']">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#013375] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold">Carregando Scalasystem...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <DashboardLayout 
      currentTab={currentTab} 
      setCurrentTab={setCurrentTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      {currentTab === 'dashboard' && (
        <DashboardView 
          onNavigateToAcervo={() => setCurrentTab('acervo')} 
        />
      )}

      {currentTab === 'acervo' && <AcervoView />}

      {currentTab === 'usuarios' && <UsersManagementPage />}

      {currentTab === 'lixeira' && <LixeiraView />}

      {currentTab === 'categorias' && (
        <div className="bg-white border border-[#013375]/10 rounded-3xl p-10 text-center shadow-xs">
          <div className="w-16 h-16 bg-[#03889c]/10 text-[#03889c] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderTree className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#013375]">Pastas & Categorias</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
            Organização taxonômica e segmentação do acervo da congregação.
          </p>
        </div>
      )}

      {currentTab === 'auditoria' && (
        <div className="bg-white border border-[#013375]/10 rounded-3xl p-10 text-center shadow-xs">
          <div className="w-16 h-16 bg-[#2f6746]/10 text-[#2f6746] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#013375]">Auditoria & Rastreabilidade de Logs</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
            Relatórios e métricas de todos os acessos, downloads e alterações por usuário e IP.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
