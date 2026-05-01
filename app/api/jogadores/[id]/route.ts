import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const jogador = await prisma.jogador.update({
      where: { id },
      data: {
        nome: body.nome,
        nivel: body.nivel,
        posicaoPrimaria: body.posicaoPrimaria,
        posicaoSecundaria: body.posicaoSecundaria ?? null,
        isGoleiroDestaque: body.isGoleiroDestaque,
        isJogadorProblema: body.isJogadorProblema,
        confirmado: body.confirmado,
      },
    })
    return NextResponse.json(jogador)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar jogador' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.jogador.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar jogador' }, { status: 500 })
  }
}
