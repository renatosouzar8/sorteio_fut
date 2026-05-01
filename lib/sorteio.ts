import { Jogador, FormacaoTime, TimeGerado, Divisao } from '@/types'

function calcularPesoReal(nivel: number, isJogadorProblema: boolean): number {
  if (isJogadorProblema) return 0.3
  return Math.pow(nivel / 10, 1.8) * 10
}

function calcularForcaTime(time: Jogador[]): number {
  let forca = 0
  let temProblema = false
  let temDestaque = false
  time.forEach(j => {
    forca += calcularPesoReal(j.nivel, j.isJogadorProblema)
    if (j.isJogadorProblema) temProblema = true
    if (j.isGoleiroDestaque) temDestaque = true
  })
  if (temDestaque) forca += 1.5
  if (temProblema) forca -= 1.0
  return forca
}

type FieldPos = 'zagueiro' | 'meia' | 'atacante'
const POS_SLOTS: Record<FieldPos, number> = { zagueiro: 2, meia: 2, atacante: 1 }
const ALL_FIELD: FieldPos[] = ['zagueiro', 'meia', 'atacante']

function scoreFor(j: Jogador, pos: FieldPos): number {
  if (j.posicaoPrimaria === pos) return 0
  if (j.posicaoSecundaria === pos) return 1
  return 2
}

function montarFormacao(time: Jogador[]): FormacaoTime {
  const goleiros = time.filter(j => j.posicaoPrimaria === 'goleiro')
  const result: FormacaoTime = { goleiro: goleiros, zagueiro: [], meia: [], atacante: [] }
  let unallocated = time.filter(j => j.posicaoPrimaria !== 'goleiro')

  while (unallocated.length > 0) {
    const openPos = ALL_FIELD.filter(p => result[p].length < POS_SLOTS[p])
    if (openPos.length === 0) break

    openPos.sort((a, b) => {
      const ratioA = unallocated.filter(j => scoreFor(j, a) <= 1).length / (POS_SLOTS[a] - result[a].length)
      const ratioB = unallocated.filter(j => scoreFor(j, b) <= 1).length / (POS_SLOTS[b] - result[b].length)
      return ratioA - ratioB
    })

    const pos = openPos[0]
    const otherOpen = openPos.slice(1)

    const candidates = [...unallocated].sort((a, b) => {
      const sa = scoreFor(a, pos), sb = scoreFor(b, pos)
      if (sa !== sb) return sa - sb
      const altA = otherOpen.filter(p => scoreFor(a, p) <= 1).length
      const altB = otherOpen.filter(p => scoreFor(b, p) <= 1).length
      return altA - altB
    })

    const pick = candidates[0]
    result[pos].push(pick)
    unallocated = unallocated.filter(j => j !== pick)
  }

  return result
}

function buildTime(time: Jogador[], forca: number): TimeGerado {
  return { jogadores: time, forca, formacao: montarFormacao(time) }
}

// Cada time precisa de exatamente 5 jogadores de campo (goleiro é bônus, não conta)
function fieldCount(time: Jogador[]): number {
  return time.filter(j => j.posicaoPrimaria !== 'goleiro').length
}

function validarDistribuicao(times: Jogador[][]): boolean {
  return times.every(t => fieldCount(t) === 5)
}

const PLACEHOLDER = { nivel: 5, isJogadorProblema: false } as Jogador

function forcaComPadding(time: Jogador[]): number {
  const fc = fieldCount(time)
  if (fc >= 5) return calcularForcaTime(time)
  return calcularForcaTime([...time, ...Array(5 - fc).fill(PLACEHOLDER)])
}

// Penalidade por jogadores fora de posição: secundária +1, improvisado +5
function penalidadeFormacao(time: Jogador[]): number {
  const form = montarFormacao(time)
  let pen = 0
  for (const pos of ALL_FIELD) {
    for (const j of form[pos]) {
      const s = scoreFor(j, pos)
      if (s === 1) pen += 1
      else if (s === 2) pen += 5
    }
  }
  return pen
}

// Distribui jogadores por posição, processando as mais escassas primeiro.
// pickFn recebe os índices de times elegíveis e escolhe qual recebe o próximo jogador.
type PickFn = (eligibleIdxs: number[], times: Jogador[][]) => number

function distribuirPorPosicao(confirmados: Jogador[], n: number, pickFn: PickFn): Jogador[][] | null {
  const times: Jogador[][] = Array.from({ length: n }, () => [])
  const used = new Set<Jogador>()

  // Goleiros são reservados agora mas adicionados DEPOIS da distribuição de campo
  // para que cada time sempre receba 5 jogadores de campo (2Z+2M+1A)
  const gks = [
    ...confirmados.filter(j => j.isGoleiroDestaque),
    ...confirmados.filter(j => j.posicaoPrimaria === 'goleiro' && !j.isGoleiroDestaque),
  ]
  gks.forEach(g => used.add(g))

  // Pool = apenas jogadores de campo ainda não alocados
  const getPool = () => confirmados.filter(j => !used.has(j))

  // Ordem de posições por escassez: menos candidatos elegíveis por vaga = mais urgente
  const initialPool = getPool()
  const posOrder = [...ALL_FIELD].sort((a, b) => {
    const rA = initialPool.filter(j => scoreFor(j, a) <= 1).length / (n * POS_SLOTS[a])
    const rB = initialPool.filter(j => scoreFor(j, b) <= 1).length / (n * POS_SLOTS[b])
    return rA - rB
  })

  // Para cada posição, preenche as vagas de todos os times (capacidade = 5 jogadores de campo)
  for (const pos of posOrder) {
    const assignedForPos = Array(n).fill(0)

    while (true) {
      const pool = getPool()
      if (!pool.length) break

      const eligible = times
        .map((_, i) => i)
        .filter(i => assignedForPos[i] < POS_SLOTS[pos] && fieldCount(times[i]) < 5)
      if (!eligible.length) break

      const pick = [...pool].sort((a, b) => {
        const s = scoreFor(a, pos) - scoreFor(b, pos)
        return s !== 0 ? s : b.nivel - a.nivel
      })[0]

      const teamIdx = pickFn(eligible, times)
      times[teamIdx].push(pick)
      used.add(pick)
      assignedForPos[teamIdx]++
    }
  }

  // Sobras de campo vão para times que ainda não têm 5 jogadores de campo
  for (const j of getPool()) {
    const i = times.findIndex(t => fieldCount(t) < 5)
    if (i < 0) break
    times[i].push(j)
    used.add(j)
  }

  // Goleiros são adicionados como bônus (6º jogador) após os 5 de campo
  gks.slice(0, n).forEach((g, i) => times[i].push(g))

  return validarDistribuicao(times) ? times : null
}

// Sorteio Controlado — 500 tentativas, seleciona aleatoriamente entre o top 30% de soluções
// para garantir equilíbrio sem que o jogador mais forte caia sempre no mesmo time.
function distribuicaoSorteio(confirmados: Jogador[], n: number): Jogador[][] | null {
  const candidates: Array<{ result: Jogador[][], score: number }> = []

  for (let trial = 0; trial < 500; trial++) {
    const shuffled = [...confirmados].sort(() => Math.random() - 0.5)
    const result = distribuirPorPosicao(
      shuffled,
      n,
      (eligible) => eligible[Math.floor(Math.random() * eligible.length)]
    )
    if (!result) continue

    const forcas = result.map(calcularForcaTime)
    const media = forcas.reduce((a, b) => a + b, 0) / n
    const variancia = forcas.reduce((s, f) => s + (f - media) ** 2, 0) / n
    const penalty = result.reduce((s, t) => s + penalidadeFormacao(t), 0)
    candidates.push({ result, score: variancia + penalty * 5 })
  }

  if (!candidates.length) return null

  // Ordena por score e escolhe aleatoriamente entre o top 30%
  // Assim qualquer resultado equilibrado tem chance, não só o "ótimo" fixo
  candidates.sort((a, b) => a.score - b.score)
  const topPool = candidates.slice(0, Math.max(1, Math.floor(candidates.length * 0.3)))
  return topPool[Math.floor(Math.random() * topPool.length)].result
}

export function gerarDivisoes(jogadores: Jogador[]): Divisao[] {
  const confirmados = jogadores.filter(j => j.confirmado)
  // Times são formados pelos jogadores de campo; goleiros entram como bônus depois
  const campoCount = confirmados.filter(j => j.posicaoPrimaria !== 'goleiro').length
  const n = Math.floor(campoCount / 5)
  if (n < 2) return []

  const raw = distribuicaoSorteio(confirmados, n)
  if (!raw) return []

  const forcas = raw.map(calcularForcaTime)
  const media = forcas.reduce((a, b) => a + b, 0) / n
  const variancia = forcas.reduce((acc, f) => acc + Math.pow(f - media, 2), 0) / n
  const desvioPadrao = Math.sqrt(variancia)
  const diff = Math.max(...forcas) - Math.min(...forcas)
  const pct = media > 0 ? (diff / media) * 100 : 0

  return [{
    algoritmo: 'Sorteio Controlado',
    times: raw.map((t, i) => buildTime(t, forcas[i])),
    forcas,
    equilibrio: 100 - pct,
    diferencaMaxima: diff,
    desvioPadrao,
  }]
}
