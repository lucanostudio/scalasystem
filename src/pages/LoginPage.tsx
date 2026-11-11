import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [useTwoFactor, setUseTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (useTwoFactor && !twoFactorCode) {
      setError('Por favor, informe o código do autenticador (2FA).');
      setLoading(false);
      return;
    }

    const res = await login(email, senha);
    if (!res.success) {
      setError(res.error || 'Erro ao realizar login.');
    }
    setLoading(false);
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setSenha(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#eef5fe] flex flex-col justify-center items-center px-4 relative overflow-hidden font-['Montserrat']">
      {/* Background Decorativo Suave com as Cores Secundárias dos Scalabrinianos */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#03889c]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#910113]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#f49c0e]/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#2f6746]/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-md z-10 my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl mb-4 border border-[#013375]/15 hover:shadow-2xl transition duration-300">
            <img src="/logo.png" alt="Logo Scalasystem" className="h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#013375]">
            Scalasystem
          </h1>
          <p className="text-xs font-bold text-[#03889c] uppercase tracking-wider mt-0.5">
            Acervo Digital da RNSMM
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Rede Scalabriniana de Missões com Migrantes
          </p>
        </div>

        {/* Quadro de Login em #013375 com Alto Contraste */}
        <div className="bg-[#013375] border-2 border-[#57a0ff]/40 rounded-3xl p-8 shadow-2xl text-white relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-[#910113] border border-[#681726] text-white text-xs font-medium flex items-start gap-2 shadow-md">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#f49c0e]" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#eef5fe] uppercase tracking-wider mb-2">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57a0ff]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@antigravity.io"
                  required
                  className="w-full bg-[#00224f] border border-[#57a0ff]/40 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f49c0e] focus:border-transparent text-xs font-medium transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-[#eef5fe] uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Entre em contato com o Administrador do Scalasystem para redefinição de credenciais.');
                  }}
                  className="text-xs text-[#57a0ff] hover:text-[#f49c0e] transition font-semibold"
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57a0ff]" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 9 caracteres"
                  required
                  className="w-full bg-[#00224f] border border-[#57a0ff]/40 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f49c0e] focus:border-transparent text-xs font-medium transition"
                />
              </div>
            </div>

            {/* Opção 2FA */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useTwoFactor}
                  onChange={(e) => setUseTwoFactor(e.target.checked)}
                  className="rounded bg-[#00224f] border-[#57a0ff] text-[#f49c0e] focus:ring-[#f49c0e] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-[#eef5fe] flex items-center gap-1.5 font-semibold">
                  <KeyRound className="w-3.5 h-3.5 text-[#f49c0e]" /> Autenticação em dois fatores (2FA)
                </span>
              </label>

              {useTwoFactor && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Código 2FA de 6 dígitos"
                    maxLength={6}
                    className="w-full bg-[#00224f] border border-[#f49c0e] rounded-xl px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f49c0e] text-xs tracking-widest text-center font-bold"
                  />
                </div>
              )}
            </div>

            {/* Botão de Entrar com Acento Laranja (#ff8b00 / #f49c0e) para Destaque */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#ff8b00] hover:bg-[#f49c0e] text-[#010101] font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-xl shadow-black/30 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#010101] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Scalasystem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Barra de Acessos Rápidos com Cores Secundárias */}
          <div className="mt-6 pt-5 border-t border-[#57a0ff]/30 text-xs">
            <p className="font-bold text-[#eef5fe] mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#57a0ff]" /> Acessos Rápidos de Demonstração (RBAC):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@antigravity.io', 'Admin@2026')}
                className="py-2 px-2 bg-[#910113] hover:bg-[#681726] text-white border border-white/20 rounded-xl transition text-center font-bold text-[11px] shadow-sm cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('carlos.editor@antigravity.io', 'Editor@2026')}
                className="py-2 px-2 bg-[#03889c] hover:bg-[#026c7c] text-white border border-white/20 rounded-xl transition text-center font-bold text-[11px] shadow-sm cursor-pointer"
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('mariana.leitor@antigravity.io', 'Leitor@2026')}
                className="py-2 px-2 bg-[#2f6746] hover:bg-[#245037] text-white border border-white/20 rounded-xl transition text-center font-bold text-[11px] shadow-sm cursor-pointer"
              >
                Leitor
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé de Segurança */}
        <p className="text-center text-xs text-slate-500 font-semibold mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#013375]" /> Governança segura com PostgreSQL RLS e Neon
        </p>
      </div>
    </div>
  );
};
