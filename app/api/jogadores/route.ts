import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const jogadores = await prisma.jogador.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json(jogadores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar jogadores' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const jogador = await prisma.jogador.create({
      data: {
        nome: body.nome,
        nivel: body.nivel ?? 5,
        posicaoPrimaria: body.posicaoPrimaria ?? 'meia',
        posicaoSecundaria: body.posicaoSecundaria ?? null,
        isGoleiroDestaque: body.isGoleiroDestaque ?? false,
        isJogadorProblema: body.isJogadorProblema ?? false,
        confirmado: body.confirmado ?? true,
      },
    })
    return NextResponse.json(jogador, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar jogador' }, { status: 500 })
  }
}
