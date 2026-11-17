import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardView } from '@/components/DashboardView';
import { AcervoView } from '@/components/AcervoView';
import { LixeiraView } from '@/components/LixeiraView';
import { ColaboradorView } from '@/components/ColaboradorView';
import { ComunicadosView } from '@/components/ComunicadosView';
import { FolderTree, Trash2, ShieldAlert, Lock } from 'lucide-react';

const getInitialTab = () => {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (['colaborador', 'comunicados', 'acervo', 'usuarios', 'lixeira', 'categorias', 'auditoria'].includes(path)) {
    return path;
  }
  return 'dashboard';
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTabState] = useState(getInitialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab);
    const nextPath = tab === 'dashboard' ? '/' : `/${tab}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

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
          onNavigateToColaborador={() => setCurrentTab('colaborador')}
          onNavigateToComunicados={() => setCurrentTab('comunicados')}
        />
      )}

      {currentTab === 'acervo' && <AcervoView />}

      {(currentTab === 'colaborador' || currentTab === 'comunicados') && user.role === 'leitor' && (
        <div className="bg-white border border-red-200 rounded-3xl p-10 text-center shadow-xs">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-red-700">403 Forbidden — Acesso Negado</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
            Seu perfil ({user.role}) não possui permissão para acessar esta área.
          </p>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#013375] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Voltar ao Dashboard
          </button>
        </div>
      )}

      {currentTab === 'colaborador' && user.role !== 'leitor' && (
        <ColaboradorView onNavigateToComunicados={() => setCurrentTab('comunicados')} />
      )}

      {currentTab === 'comunicados' && user.role !== 'leitor' && <ComunicadosView />}

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
