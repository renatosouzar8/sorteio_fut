'use client'

import { Divisao, Jogador } from '@/types'

interface Props {
  divisoes: Divisao[]
  isAdmin: boolean
  onFechar: () => void
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

function CardTime({ time, idx, forca, isAdmin }: { time: Divisao['times'][0]; idx: number; forca: number; isAdmin: boolean }) {
  const secoes = [
    { label: '⚽ Atacante', key: 'atacante' as const, cor: 'border-green-500/30 bg-green-900/20' },
    { label: '🎯 Meias', key: 'meia' as const, cor: 'border-blue-500/30 bg-blue-900/20' },
    { label: '🛡️ Zagueiros', key: 'zagueiro' as const, cor: 'border-purple-500/30 bg-purple-900/20' },
    { label: '🧤 Goleiro', key: 'goleiro' as const, cor: 'border-yellow-500/30 bg-yellow-900/20' },
  ]

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-600">
        <span className="font-bold text-white text-base">Time {idx + 1}</span>
        {isAdmin && <span className="text-sm font-semibold text-yellow-400">⚡ {forca.toFixed(1)}</span>}
      </div>
      <div className="p-3 space-y-2">
        {secoes.map(({ label, key, cor }) => {
          const jogadores = time.formacao[key]
          if (!jogadores?.length) return null
          return (
            <div key={key} className={`rounded-lg border p-2 ${cor}`}>
              <div className="text-xs font-semibold text-slate-400 mb-1.5">{label}</div>
              {jogadores.map((j: Jogador) => (
                <div key={j.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-200 flex items-center gap-1">
                    {j.nome}
                    {j.isGoleiroDestaque && <span className="text-yellow-400 text-xs">⭐</span>}
                    {isAdmin && j.isJogadorProblema && <span className="text-red-400 text-xs">⚠️</span>}
                    {j.posicaoPrimaria !== key && (
                      <span className="text-slate-500 text-xs">(A)</span>
                    )}
                  </span>
                  {isAdmin && <NivelBadge nivel={j.nivel} />}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResultadoSorteio({ divisoes, isAdmin, onFechar }: Props) {
  if (!divisoes.length) return null
  const div = divisoes[0]

  function handleShare() {
    let text = '🏆 SORTEIO DE TIMES 🏆\n\n'

    div.times.forEach((time, idx) => {
      text += `Time ${idx + 1}:\n`
      const nomes = [
        ...time.formacao.atacante,
        ...time.formacao.meia,
        ...time.formacao.zagueiro,
        ...time.formacao.goleiro
      ]

      nomes.forEach(j => {
        let n = j.nome
        if (j.isGoleiroDestaque) n += ' ⭐'
        text += `${n}\n`
      })
      text += '\n'
    })

    if (div.sobras && div.sobras.length > 0) {
      text += `Sobraram:\n`
      div.sobras.forEach(j => {
        text += `${j.nome}\n`
      })
      text += '\n'
    }

    text += `⚖️ Equilíbrio: ${div.equilibrio.toFixed(0)}%`

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">Times Sorteados</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
            <span>
              Equilíbrio:{' '}
              <span className={`font-semibold ${div.equilibrio >= 90 ? 'text-emerald-400' : div.equilibrio >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                {div.equilibrio.toFixed(0)}%
              </span>
            </span>
            {isAdmin && (
              <span>
                Dif. máx:{' '}
                <span className="text-slate-300 font-medium">{div.diferencaMaxima.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-500 text-sm font-semibold px-3 py-2 min-h-[40px] rounded-lg transition-colors touch-manipulation"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            WhatsApp
          </button>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-white text-sm border border-slate-600 px-3 py-2 min-h-[40px] rounded-lg transition-colors touch-manipulation"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {div.times.map((time, tIdx) => (
          <CardTime key={tIdx} time={time} idx={tIdx} forca={div.forcas[tIdx]} isAdmin={isAdmin} />
        ))}
      </div>

      {div.sobras && div.sobras.length > 0 && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <span>⏳</span> Ficaram de fora neste sorteio:
          </h3>
          <div className="flex flex-wrap gap-2">
            {div.sobras.map(j => (
              <div key={j.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <span className="text-sm text-slate-300 font-medium">{j.nome}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  {j.posicaoPrimaria}
                </span>
                {isAdmin && <NivelBadge nivel={j.nivel} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
