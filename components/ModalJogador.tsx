'use client'

import { useState, useEffect } from 'react'
import { Jogador, Posicao } from '@/types'

interface Props {
  jogador: Partial<Jogador> | null
  onSave: (data: Partial<Jogador>) => void
  onClose: () => void
}

const POSICOES: Posicao[] = ['goleiro', 'zagueiro', 'meia', 'atacante']

const LABELS: Record<Posicao, string> = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  meia: 'Meia',
  atacante: 'Atacante',
}

export default function ModalJogador({ jogador, onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<Jogador>>({
    nome: '',
    nivel: 5,
    posicaoPrimaria: 'meia',
    posicaoSecundaria: null,
    isGoleiroDestaque: false,
    isJogadorProblema: false,
    confirmado: true,
  })

  useEffect(() => {
    if (jogador) setForm({ ...form, ...jogador })
  }, [jogador]) // eslint-disable-line

  const set = <K extends keyof Jogador>(k: K, v: Jogador[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const posSecOptions = POSICOES.filter(p => p !== form.posicaoPrimaria && p !== 'goleiro')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {jogador?.id ? 'Editar Jogador' : 'Novo Jogador'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">NOME</label>
            <input
              type="text"
              value={form.nome ?? ''}
              onChange={e => set('nome', e.target.value)}
              placeholder="Nome do jogador"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Posições */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">POSIÇÃO PRIMÁRIA</label>
              <select
                value={form.posicaoPrimaria}
                onChange={e => {
                  set('posicaoPrimaria', e.target.value as Posicao)
                  if (e.target.value === 'goleiro') set('posicaoSecundaria', null)
                }}
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {POSICOES.map(p => <option key={p} value={p}>{LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">POSIÇÃO SECUNDÁRIA</label>
              <select
                value={form.posicaoSecundaria ?? ''}
                disabled={form.posicaoPrimaria === 'goleiro'}
                onChange={e => set('posicaoSecundaria', (e.target.value as Posicao) || null)}
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-40"
              >
                <option value="">Nenhuma</option>
                {posSecOptions.map(p => <option key={p} value={p}>{LABELS[p]}</option>)}
              </select>
            </div>
          </div>

          {/* Nível */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-400">NÍVEL</label>
              <span className="text-lg font-bold text-emerald-400">{form.nivel}</span>
            </div>
            <input
              type="range" min={1} max={10}
              value={form.nivel ?? 5}
              onChange={e => set('nivel', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-0.5">
              <span>1 - Fraco</span><span>10 - Craque</span>
            </div>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.confirmado ?? true}
                onChange={e => set('confirmado', e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">Confirmado</span>
            </label>
            <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer select-none ${
              form.posicaoPrimaria !== 'goleiro' ? 'opacity-40 pointer-events-none' : 'bg-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={form.isGoleiroDestaque ?? false}
                disabled={form.posicaoPrimaria !== 'goleiro'}
                onChange={e => set('isGoleiroDestaque', e.target.checked)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className="text-sm text-slate-300">⭐ Destaque</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isJogadorProblema ?? false}
                onChange={e => set('isJogadorProblema', e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-slate-300">⚠️ Fraco</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.nome?.trim()}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
