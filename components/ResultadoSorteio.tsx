'use client'

import { Divisao, Jogador } from '@/types'

interface Props {
  divisoes: Divisao[]
  onFechar: () => void
}

const POS_LABEL: Record<string, string> = {
  goleiro: '🧤',
  zagueiro: '🛡️',
  meia: '🎯',
  atacante: '⚽',
}

function NivelBadge({ nivel }: { nivel: number }) {
  const cor =
    nivel >= 8 ? 'bg-emerald-500' :
    nivel >= 6 ? 'bg-blue-500' :
    nivel >= 4 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <span className={`${cor} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>{nivel}</span>
  )
}

function CardTime({ time, idx, forca }: { time: Divisao['times'][0]; idx: number; forca: number }) {
  const secoes = [
    { label: '⚽ Atacante', key: 'atacante' as const, cor: 'border-green-500/30 bg-green-900/20' },
    { label: '🎯 Meias', key: 'meia' as const, cor: 'border-blue-500/30 bg-blue-900/20' },
    { label: '🛡️ Zagueiros', key: 'zagueiro' as const, cor: 'border-purple-500/30 bg-purple-900/20' },
    { label: '🧤 Goleiro', key: 'goleiro' as const, cor: 'border-yellow-500/30 bg-yellow-900/20' },
  ]

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-600">
        <span className="font-bold text-white">Time {idx + 1}</span>
        <span className="text-sm font-semibold text-yellow-400">⚡ {forca.toFixed(1)}</span>
      </div>
      <div className="p-3 space-y-2">
        {secoes.map(({ label, key, cor }) => {
          const jogadores = time.formacao[key]
          if (!jogadores?.length) return null
          return (
            <div key={key} className={`rounded-lg border p-2 ${cor}`}>
              <div className="text-xs font-semibold text-slate-400 mb-1.5">{label}</div>
              {jogadores.map((j: Jogador) => (
                <div key={j.id} className="flex items-center justify-between py-0.5">
                  <span className="text-sm text-slate-200 flex items-center gap-1">
                    {j.nome}
                    {j.isGoleiroDestaque && <span className="text-yellow-400 text-xs">⭐</span>}
                    {j.isJogadorProblema && <span className="text-red-400 text-xs">⚠️</span>}
                    {j.posicaoPrimaria !== key && (
                      <span className="text-slate-500 text-xs">(A)</span>
                    )}
                  </span>
                  <NivelBadge nivel={j.nivel} />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResultadoSorteio({ divisoes, onFechar }: Props) {
  if (!divisoes.length) return null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Resultado do Sorteio</h2>
        <button
          onClick={onFechar}
          className="text-slate-400 hover:text-white text-sm border border-slate-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          Fechar
        </button>
      </div>

      <div className="space-y-6">
        {divisoes.map((div, dIdx) => (
          <div key={dIdx} className="rounded-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-700">
              <div>
                <div className="font-bold text-white">{div.algoritmo}</div>
                <div className="text-xs text-slate-400">{div.times.length} times · melhor = primeiro</div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <div className={`text-xl font-bold ${div.equilibrio >= 90 ? 'text-emerald-400' : div.equilibrio >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {div.equilibrio.toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-500">Equilíbrio</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-300">{div.diferencaMaxima.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">Dif. máx</div>
                </div>
              </div>
            </div>

            {/* Times */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-900/50">
              {div.times.map((time, tIdx) => (
                <CardTime key={tIdx} time={time} idx={tIdx} forca={div.forcas[tIdx]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
