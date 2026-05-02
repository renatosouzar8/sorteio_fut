import { useState } from 'react'

interface Props {
  onLogin: () => void
  onClose: () => void
}

export default function ModalAdmin({ onLogin, onClose }: Props) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (senha === 'Abap2026') {
      onLogin()
    } else {
      setErro(true)
      setSenha('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 shadow-2xl border border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🔐</span> Acesso Admin
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 mb-2">SENHA DE ACESSO</label>
            <input
              type="password"
              value={senha}
              onChange={e => {
                setSenha(e.target.value)
                setErro(false)
              }}
              autoFocus
              className={`w-full rounded-lg bg-slate-900 border px-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors ${
                erro ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'
              }`}
              placeholder="Digite a senha..."
            />
            {erro && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <span>⚠️</span> Senha incorreta
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!senha}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
