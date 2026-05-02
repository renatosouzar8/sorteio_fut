export type Posicao = 'goleiro' | 'zagueiro' | 'meia' | 'atacante'

export interface Jogador {
  id: number
  nome: string
  nivel: number
  posicaoPrimaria: Posicao
  posicaoSecundaria: Posicao | null
  isGoleiroDestaque: boolean
  isJogadorProblema: boolean
  confirmado: boolean
}

export interface FormacaoTime {
  goleiro: Jogador[]
  zagueiro: Jogador[]
  meia: Jogador[]
  atacante: Jogador[]
}

export interface TimeGerado {
  jogadores: Jogador[]
  forca: number
  formacao: FormacaoTime
}

export interface Divisao {
  algoritmo: string
  times: TimeGerado[]
  forcas: number[]
  equilibrio: number
  diferencaMaxima: number
  desvioPadrao: number
  sobras: Jogador[]
}
