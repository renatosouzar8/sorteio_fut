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

// Aloca jogadores nas posições priorizando escassez e posições secundárias.
// Ordem: posição mais difícil de preencher primeiro; no empate de score,
// prefere o jogador com menos alternativas válidas em outras posições.
function montarFormacao(time: Jogador[]): FormacaoTime {
  const goleiros = time.filter(j => j.posicaoPrimaria === 'goleiro')
  const result: FormacaoTime = { goleiro: goleiros, zagueiro: [], meia: [], atacante: [] }
  let unallocated = time.filter(j => j.posicaoPrimaria !== 'goleiro')

  while (unallocated.length > 0) {
    const openPos = ALL_FIELD.filter(p => result[p].length < POS_SLOTS[p])
    if (openPos.length === 0) break

    // Ordena posições abertas pela escassez (menos elegíveis por slot = mais urgente)
    openPos.sort((a, b) => {
      const ratioA = unallocated.filter(j => scoreFor(j, a) <= 1).length / (POS_SLOTS[a] - result[a].length)
      const ratioB = unallocated.filter(j => scoreFor(j, b) <= 1).length / (POS_SLOTS[b] - result[b].length)
      return ratioA - ratioB
    })

    const pos = openPos[0]
    const otherOpen = openPos.slice(1)

    // Ordena candidatos: melhor score para esta posição primeiro;
    // no empate, prefere quem tem menos opções válidas em outras posições
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

// Time de 5 jogadores é sempre válido — goleiro não é obrigatório
function validarDistribuicao(times: Jogador[][]): boolean {
  return times.every(t => t.length === 5)
}

const PLACEHOLDER = { nivel: 5, isJogadorProblema: false } as Jogador

function forcaComPadding(time: Jogador[]): number {
  if (time.length === 5) return calcularForcaTime(time)
  return calcularForcaTime([...time, ...Array(5 - time.length).fill(PLACEHOLDER)])
}

// Estratégia 1: Compensação — fraco vai com os melhores
function distribuicaoCompensacao(confirmados: Jogador[], n: number): Jogador[][] | null {
  const times: Jogador[][] = Array.from({ length: n }, () => [])

  // Distribui goleiros 1 por time quando disponíveis (mas não é obrigatório)
  const goleiros = [
    ...confirmados.filter(j => j.isGoleiroDestaque),
    ...confirmados.filter(j => j.posicaoPrimaria === 'goleiro' && !j.isGoleiroDestaque),
  ]
  goleiros.forEach((g, i) => { if (i < n) times[i].push(g) })

  const problema = confirmados.filter(j => j.isJogadorProblema)
  const restantes = confirmados
    .filter(j => !goleiros.includes(j))
    .sort((a, b) => b.nivel - a.nivel)

  problema.forEach((p, i) => { if (!times[i % n].includes(p)) times[i % n].push(p) })

  restantes
    .filter(j => !problema.includes(j))
    .forEach(j => {
      const forcas = times.map(forcaComPadding)
      const idx = forcas.indexOf(Math.min(...forcas))
      if (times[idx].length < 5) times[idx].push(j)
      else { const i = times.findIndex(t => t.length < 5); if (i >= 0) times[i].push(j) }
    })

  return validarDistribuicao(times) ? times : null
}

// Estratégia 2: Snake Draft
function distribuicaoSnake(confirmados: Jogador[], n: number): Jogador[][] | null {
  const times: Jogador[][] = Array.from({ length: n }, () => [])
  const ord = [...confirmados].sort((a, b) => b.nivel - a.nivel)
  let rodada = 0, pos = 0
  ord.forEach(j => {
    const idx = rodada % 2 === 0 ? pos : n - 1 - pos
    if (times[idx].length < 5) times[idx].push(j)
    if (++pos >= n) { pos = 0; rodada++ }
  })
  return validarDistribuicao(times) ? times : null
}

// Estratégia 3: Sorteio Controlado — menor variância entre 500 tentativas
function distribuicaoSorteio(confirmados: Jogador[], n: number): Jogador[][] | null {
  let melhor: Jogador[][] | null = null
  let menorVar = Infinity
  for (let i = 0; i < 500; i++) {
    const emb = [...confirmados].sort(() => Math.random() - 0.5)
    const times: Jogador[][] = Array.from({ length: n }, () => [])
    emb.forEach((j, idx) => { if (times[idx % n].length < 5) times[idx % n].push(j) })
    if (!validarDistribuicao(times)) continue
    const forcas = times.map(calcularForcaTime)
    const media = forcas.reduce((a, b) => a + b, 0) / n
    const variancia = forcas.reduce((acc, f) => acc + Math.pow(f - media, 2), 0) / n
    if (variancia < menorVar) { menorVar = variancia; melhor = times }
  }
  return melhor
}

// Estratégia 4: Otimização gulosa — sempre coloca no time mais fraco
function distribuicaoOtimizada(confirmados: Jogador[], n: number): Jogador[][] | null {
  const times: Jogador[][] = Array.from({ length: n }, () => [])
  const ord = [...confirmados].sort((a, b) => b.nivel - a.nivel)
  ord.forEach(j => {
    const ranked = times.map((t, idx) => ({ idx, f: forcaComPadding(t) })).sort((a, b) => a.f - b.f)
    const idx = ranked[0].idx
    if (times[idx].length < 5) times[idx].push(j)
    else { const i = times.findIndex(t => t.length < 5); if (i >= 0) times[i].push(j) }
  })
  return validarDistribuicao(times) ? times : null
}

export function gerarDivisoes(jogadores: Jogador[]): Divisao[] {
  const confirmados = jogadores.filter(j => j.confirmado)
  const n = Math.floor(confirmados.length / 5)
  if (n < 2) return []

  const algoritmos = [
    { nome: 'Compensação Automática', fn: distribuicaoCompensacao },
    { nome: 'Snake Draft', fn: distribuicaoSnake },
    { nome: 'Sorteio Controlado', fn: distribuicaoSorteio },
    { nome: 'Otimização Matemática', fn: distribuicaoOtimizada },
  ]

  return algoritmos
    .map(({ nome, fn }) => {
      const raw = fn(confirmados, n)
      if (!raw) return null
      const forcas = raw.map(calcularForcaTime)
      const media = forcas.reduce((a, b) => a + b, 0) / n
      const variancia = forcas.reduce((acc, f) => acc + Math.pow(f - media, 2), 0) / n
      const desvioPadrao = Math.sqrt(variancia)
      const diff = Math.max(...forcas) - Math.min(...forcas)
      const pct = media > 0 ? (diff / media) * 100 : 0
      return {
        algoritmo: nome,
        times: raw.map((t, i) => buildTime(t, forcas[i])),
        forcas,
        equilibrio: 100 - pct,
        diferencaMaxima: diff,
        desvioPadrao,
      } as Divisao
    })
    .filter((d): d is Divisao => d !== null)
    .sort((a, b) => b.equilibrio - a.equilibrio)
}
