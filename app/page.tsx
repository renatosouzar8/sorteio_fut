import { prisma } from '@/lib/prisma'
import App from '@/components/App'
import { Jogador } from '@/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const jogadores = await prisma.jogador.findMany({ orderBy: { createdAt: 'asc' } }) as unknown as Jogador[]
  return <App initialJogadores={jogadores} />
}
