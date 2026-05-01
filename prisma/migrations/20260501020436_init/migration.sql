-- CreateTable
CREATE TABLE "Jogador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 5,
    "posicaoPrimaria" TEXT NOT NULL DEFAULT 'meia',
    "posicaoSecundaria" TEXT,
    "isGoleiroDestaque" BOOLEAN NOT NULL DEFAULT false,
    "isJogadorProblema" BOOLEAN NOT NULL DEFAULT false,
    "confirmado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);
