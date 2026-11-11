import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  FolderArchive, 
  Users, 
  ShieldAlert, 
  Trash2, 
  LogOut, 
  FolderTree,
  UserCheck,
  Search,
  Bell
} from 'lucide-react';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ 
  currentTab, 
  setCurrentTab, 
  searchQuery = '', 
  setSearchQuery, 
  children 
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'acervo', label: 'Acervo Digital', icon: FolderArchive },
    { id: 'categorias', label: 'Categorias / Pastas', icon: FolderTree },
    { id: 'lixeira', label: 'Lixeira', icon: Trash2 },
    ...(user?.role === 'admin'
      ? [
          { id: 'usuarios', label: 'Usuários & Perfis', icon: Users },
          { id: 'auditoria', label: 'Auditoria & Relatórios', icon: ShieldAlert },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#eef5fe] text-[#010101] flex flex-col md:flex-row font-['Montserrat']">
      {/* Sidebar Fixa */}
      <aside className="w-full md:w-72 bg-[#013375] text-white flex flex-col justify-between shrink-0 shadow-2xl z-20">
        <div>
          {/* Logo & Marca Scalasystem */}
          <div className="p-5 border-b border-white/10 flex flex-col items-center text-center bg-[#002557]">
            <div className="p-3 bg-white rounded-xl shadow-md mb-2 max-w-[200px] flex items-center justify-center">
              <img src="/logo.png" alt="Logo Scalasystem" className="h-12 object-contain" />
            </div>
            <h2 className="text-sm font-extrabold text-white tracking-wide mt-1">
              Scalasystem
            </h2>
            <span className="text-[11px] font-semibold text-[#57a0ff] tracking-wide">
              Acervo Digital da RNSMM
            </span>
          </div>

          {/* Links de Navegação */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                    isActive
                      ? 'bg-[#57a0ff] text-[#013375] shadow-lg font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#013375]' : 'text-[#57a0ff]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Usuário & Logout */}
        <div className="p-4 border-t border-white/10 bg-[#002557]">
          <div className="bg-[#013375] border border-white/15 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#57a0ff] text-[#013375] flex items-center justify-center font-extrabold text-xs shrink-0 shadow">
                {user?.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.nome}</p>
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#f49c0e]" />
                  <span className="text-[10px] uppercase font-bold text-[#57a0ff]">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Encerrar Sessão"
              className="p-1.5 text-white/70 hover:text-white hover:bg-[#910113] rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal + Cabeçalho Superior */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-[#013375]/10 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
          {/* Barra de busca rápida */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              placeholder="Pesquisar arquivos, tags, departamento..."
              className="w-full bg-[#eef5fe] border border-[#013375]/20 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-[#010101] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013375]"
            />
          </div>

          {/* Badges e Identificação do Usuário */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  user?.role === 'admin'
                    ? 'bg-[#910113] text-white'
                    : user?.role === 'editor'
                    ? 'bg-[#03889c] text-white'
                    : 'bg-[#2f6746] text-white'
                }`}
              >
                Perfil: {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#910113] hover:text-[#681726] bg-[#910113]/10 hover:bg-[#910113]/20 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
