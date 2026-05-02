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

// Penalidade para evitar times repetidos
function penSimilaridade(candidato: Jogador[][], anterior?: Jogador[][]): number {
  if (!anterior) return 0
  let penalty = 0
  
  const prevTeamMap = new Map<number, number>()
  anterior.forEach((time, tIdx) => {
    time.forEach(j => prevTeamMap.set(j.id, tIdx))
  })

  for (const time of candidato) {
    const counts = new Map<number, number>()
    for (const j of time) {
      const prevIdx = prevTeamMap.get(j.id)
      if (prevIdx !== undefined) {
        counts.set(prevIdx, (counts.get(prevIdx) || 0) + 1)
      }
    }
    for (const count of counts.values()) {
      if (count > 2) {
        penalty += (count - 2) * 15 // 3 players = 15, 4 players = 30
      }
    }
  }
  return penalty
}

// Sorteio Controlado — 500 tentativas, seleciona aleatoriamente dentro de uma margem de tolerância
// para garantir equilíbrio, diversidade e dar chance às sobras.
function distribuicaoSorteio(confirmados: Jogador[], n: number, anterior?: Jogador[][]): Jogador[][] | null {
  const candidates: Array<{ result: Jogador[][], score: number }> = []

  const goleiros = confirmados.filter(j => j.posicaoPrimaria === 'goleiro')
  const linha = confirmados.filter(j => j.posicaoPrimaria !== 'goleiro')

  for (let trial = 0; trial < 500; trial++) {
    // Embaralha as linhas e pega apenas a quantidade exata (n * 5)
    // Assim, se sobrarem jogadores, diferentes sobras ficam de fora a cada tentativa
    const shuffledLinha = [...linha].sort(() => Math.random() - 0.5)
    const participantesLinha = shuffledLinha.slice(0, n * 5)
    const participantes = [...participantesLinha, ...goleiros]

    const result = distribuirPorPosicao(
      participantes,
      n,
      (eligible) => eligible[Math.floor(Math.random() * eligible.length)]
    )
    if (!result) continue

    const forcas = result.map(calcularForcaTime)
    const media = forcas.reduce((a, b) => a + b, 0) / n
    const variancia = forcas.reduce((s, f) => s + (f - media) ** 2, 0) / n
    const penalty = result.reduce((s, t) => s + penalidadeFormacao(t), 0)
    const simPenalty = penSimilaridade(result, anterior)
    
    candidates.push({ result, score: variancia + penalty * 5 + simPenalty })
  }

  if (!candidates.length) return null

  // Ordena por score e usa janela de tolerância de 40% em relação ao melhor
  candidates.sort((a, b) => a.score - b.score)
  const bestScore = candidates[0].score
  const limitScore = (bestScore + 2) * 1.40
  
  const topPool = candidates.filter(c => c.score <= limitScore)
  return topPool[Math.floor(Math.random() * topPool.length)].result
}

export function gerarDivisoes(jogadores: Jogador[], anterior?: Divisao[]): Divisao[] {
  const confirmados = jogadores.filter(j => j.confirmado)
  // Times são formados pelos jogadores de campo; goleiros entram como bônus depois
  const campoCount = confirmados.filter(j => j.posicaoPrimaria !== 'goleiro').length
  const n = Math.floor(campoCount / 5)
  if (n < 2) return []

  const prevTimes = anterior?.[0]?.times.map(t => t.jogadores)
  const raw = distribuicaoSorteio(confirmados, n, prevTimes)
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
