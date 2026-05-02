'use client'

import { useState, useTransition } from 'react'
import { Jogador } from '@/types'
import { gerarDivisoes } from '@/lib/sorteio'
import ModalJogador from './ModalJogador'
import ModalAdmin from './ModalAdmin'
import ResultadoSorteio from './ResultadoSorteio'
import type { Divisao } from '@/types'

const POSICAO_COR: Record<string, string> = {
  goleiro: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  zagueiro: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  meia: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  atacante: 'bg-green-500/20 text-green-300 border-green-500/30',
}

const POSICAO_LABEL: Record<string, string> = {
  goleiro: 'Goleiro', zagueiro: 'Zagueiro', meia: 'Meia', atacante: 'Atacante',
}

function NivelBar({ nivel }: { nivel: number }) {
  const pct = (nivel / 10) * 100
  const cor = nivel >= 8 ? 'bg-emerald-500' : nivel >= 6 ? 'bg-blue-500' : nivel >= 4 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300 w-4 text-right">{nivel}</span>
    </div>
  )
}

function Avatar({ nome, nivel }: { nome: string; nivel: number }) {
  const inicial = nome.charAt(0).toUpperCase() || '?'
  const cor = nivel >= 8 ? 'from-emerald-600 to-emerald-400' : nivel >= 6 ? 'from-blue-600 to-blue-400' : nivel >= 4 ? 'from-yellow-600 to-yellow-400' : 'from-red-700 to-red-500'
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {inicial}
    </div>
  )
}

interface Props {
  initialJogadores: Jogador[]
}

export default function App({ initialJogadores }: Props) {
  const [jogadores, setJogadores] = useState<Jogador[]>(initialJogadores)
  const [modal, setModal] = useState<Partial<Jogador> | null>(null)
  const [modalAdminOpen, setModalAdminOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [divisoes, setDivisoes] = useState<Divisao[]>([])
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const confirmados = jogadores.filter(j => j.confirmado)
  const campo = confirmados.filter(j => j.posicaoPrimaria !== 'goleiro')
  const nTimes = Math.floor(campo.length / 5)
  const sobram = campo.length % 5

  async function salvarJogador(data: Partial<Jogador>) {
    setErro(null)
    try {
      if (data.id) {
        const res = await fetch(`/api/jogadores/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const updated = await res.json()
        setJogadores(prev => prev.map(j => j.id === updated.id ? updated : j))
      } else {
        const res = await fetch('/api/jogadores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const novo = await res.json()
        setJogadores(prev => [...prev, novo])
      }
      setModal(null)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    }
  }

  async function excluirJogador(id: number) {
    setErro(null)
    try {
      await fetch(`/api/jogadores/${id}`, { method: 'DELETE' })
      setJogadores(prev => prev.filter(j => j.id !== id))
    } catch {
      setErro('Erro ao excluir.')
    }
  }

  async function toggleConfirmado(jogador: Jogador) {
    const updated = { ...jogador, confirmado: !jogador.confirmado }
    setJogadores(prev => prev.map(j => j.id === jogador.id ? updated : j))
    try {
      await fetch(`/api/jogadores/${jogador.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      setJogadores(prev => prev.map(j => j.id === jogador.id ? jogador : j))
    }
  }

  function sortear() {
    setErro(null)
    startTransition(() => {
      const resultado = gerarDivisoes(jogadores)
      setDivisoes(resultado)
      if (resultado.length > 0) {
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
      } else {
        setErro('Não foi possível montar times. Verifique se há pelo menos 10 jogadores confirmados.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Sorteio de Times</h1>
              <p className="text-xs text-slate-500 leading-tight">
                {confirmados.length} confirmados · {nTimes >= 2 ? `${nTimes} times possíveis` : 'mínimo 10 para sortear'}
                {sobram > 0 && ` · ${sobram} sobram`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <button
                onClick={() => setIsAdmin(false)}
                className="px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm font-semibold transition-colors touch-manipulation flex items-center gap-1"
                title="Sair do modo Admin"
              >
                <span>✅</span> Admin
              </button>
            ) : (
              <button
                onClick={() => setModalAdminOpen(true)}
                className="px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors touch-manipulation flex items-center gap-1"
              >
                <span>🔐</span> Admin
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setModal({})}
                className="px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors touch-manipulation"
              >
                + Jogador
              </button>
            )}
            <button
              onClick={sortear}
              disabled={nTimes < 2 || isPending}
              className="px-4 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
            >
              {isPending ? 'Sorteando…' : '🎲 Sortear'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {erro && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-500/30 text-red-300 text-sm">
            {erro}
          </div>
        )}

        {/* Resultado aparece no topo, acima da lista de jogadores */}
        {divisoes.length > 0 && (
          <div className="mb-6">
            <ResultadoSorteio divisoes={divisoes} isAdmin={isAdmin} onFechar={() => setDivisoes([])} />
          </div>
        )}

        {jogadores.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">⚽</div>
            <p className="text-slate-400 text-lg mb-2">Nenhum jogador cadastrado</p>
            <p className="text-slate-600 text-sm mb-6">Adicione jogadores para começar</p>
            {isAdmin && (
              <button
                onClick={() => setModal({})}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
              >
                + Adicionar primeiro jogador
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {jogadores.map(j => (
              <div
                key={j.id}
                className={`rounded-xl border p-4 transition-all ${
                  j.confirmado
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-800/40 border-slate-800 opacity-50'
                }`}
              >
                {/* Topo do card */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar nome={j.nome} nivel={j.nivel} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate leading-tight">{j.nome}</div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${POSICAO_COR[j.posicaoPrimaria]}`}>
                        {POSICAO_LABEL[j.posicaoPrimaria]}
                      </span>
                      {j.posicaoSecundaria && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full border border-slate-600 text-slate-400">
                          {POSICAO_LABEL[j.posicaoSecundaria]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nível */}
                {isAdmin && <NivelBar nivel={j.nivel} />}

                {/* Badges especiais */}
                {(j.isGoleiroDestaque || (isAdmin && j.isJogadorProblema)) && (
                  <div className="flex gap-1 mt-2">
                    {j.isGoleiroDestaque && (
                      <span className="text-xs bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full">
                        ⭐ Destaque
                      </span>
                    )}
                    {isAdmin && j.isJogadorProblema && (
                      <span className="text-xs bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-0.5 rounded-full">
                        ⚠️ Fraco
                      </span>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => toggleConfirmado(j)}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${
                      j.confirmado
                        ? 'bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/50'
                        : 'bg-slate-700 border border-slate-600 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {j.confirmado ? '✓ Confirmado' : 'Confirmar'}
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setModal(j)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => excluirJogador(j.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 border border-red-800/30 text-red-400 hover:bg-red-900/60 transition-colors"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Botão adicionar inline */}
            {isAdmin && (
              <button
                onClick={() => setModal({})}
                className="rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-600 text-slate-600 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2 p-4 min-h-[140px]"
              >
                <span className="text-2xl">+</span>
                <span className="text-sm font-medium">Novo jogador</span>
              </button>
            )}
          </div>
        )}

      </main>

      {/* Modal de Jogador */}
      {modal !== null && (
        <ModalJogador
          jogador={modal}
          onSave={salvarJogador}
          onClose={() => setModal(null)}
        />
      )}

      {/* Modal Admin */}
      {modalAdminOpen && (
        <ModalAdmin
          onLogin={() => {
            setIsAdmin(true)
            setModalAdminOpen(false)
          }}
          onClose={() => setModalAdminOpen(false)}
        />
      )}
    </div>
  )
}
