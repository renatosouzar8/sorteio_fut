import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, RefreshCw, Save, Upload, Trophy, Zap } from 'lucide-react';

const BalanceadorTimes = () => {
  const [jogadores, setJogadores] = useState([
    { id: 1, nome: 'Jogador 1', nivel: 8, posicaoPrimaria: 'goleiro', posicaoSecundaria: null, isGoleiroDestaque: true, confirmado: true },
    { id: 2, nome: 'Jogador 2', nivel: 5, posicaoPrimaria: 'goleiro', posicaoSecundaria: null, isGoleiroDestaque: false, confirmado: true },
    { id: 3, nome: 'Jogador 3', nivel: 7, posicaoPrimaria: 'zagueiro', posicaoSecundaria: 'meia', isGoleiroDestaque: false, confirmado: true },
    { id: 4, nome: 'Jogador 4', nivel: 6, posicaoPrimaria: 'zagueiro', posicaoSecundaria: null, isGoleiroDestaque: false, confirmado: true },
    { id: 5, nome: 'Jogador 5', nivel: 7, posicaoPrimaria: 'meia', posicaoSecundaria: 'zagueiro', isGoleiroDestaque: false, confirmado: true },
    { id: 6, nome: 'Jogador 6', nivel: 6, posicaoPrimaria: 'meia', posicaoSecundaria: 'atacante', isGoleiroDestaque: false, confirmado: true },
    { id: 7, nome: 'Jogador 7', nivel: 8, posicaoPrimaria: 'meia', posicaoSecundaria: 'atacante', isGoleiroDestaque: false, confirmado: true },
    { id: 8, nome: 'Jogador 8', nivel: 5, posicaoPrimaria: 'meia', posicaoSecundaria: 'zagueiro', isGoleiroDestaque: false, confirmado: true },
    { id: 9, nome: 'Jogador Fraco', nivel: 1, posicaoPrimaria: 'atacante', posicaoSecundaria: null, isJogadorProblema: true, confirmado: true },
    { id: 10, nome: 'Jogador 10', nivel: 6, posicaoPrimaria: 'atacante', posicaoSecundaria: 'meia', isGoleiroDestaque: false, confirmado: true },
  ]);

  const [divisoes, setDivisoes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  
  // Calcula quantos times podem ser formados
  const jogadoresConfirmados = jogadores.filter(j => j.confirmado !== false);
  const numTimes = Math.floor(jogadoresConfirmados.length / 5);
  const jogadoresSobrando = jogadoresConfirmados.length % 5;

  // Função de peso não-linear - jogador nota 1 vale MUITO menos
  const calcularPesoReal = (nivel, isJogadorProblema) => {
    if (isJogadorProblema) {
      // Jogador problema vale apenas 0.3 (representa jogar com um a menos)
      return 0.3;
    }
    // Escala exponencial para outros jogadores
    return Math.pow(nivel / 10, 1.8) * 10;
  };

  // Valida formação tática do time (1 goleiro, 2 zagueiros, 2 meias, 1 atacante)
  const validarFormacao = (time) => {
    const goleiros = time.filter(j => j.posicaoPrimaria === 'goleiro');
    if (goleiros.length !== 1) return { valido: false, motivo: 'Precisa de 1 goleiro' };

    // Aloca jogadores nas posições (primária primeiro, secundária depois)
    let jogadoresLinha = time.filter(j => j.posicaoPrimaria !== 'goleiro');
    let formacao = {
      zagueiro: [],
      meia: [],
      atacante: []
    };

    // Primeira passada: posições primárias
    jogadoresLinha.forEach(j => {
      if (formacao[j.posicaoPrimaria] && formacao[j.posicaoPrimaria].length < getMaxPorPosicao(j.posicaoPrimaria)) {
        formacao[j.posicaoPrimaria].push(j);
      }
    });

    // Segunda passada: usa posições secundárias para completar
    jogadoresLinha.forEach(j => {
      if (!formacao.zagueiro.includes(j) && !formacao.meia.includes(j) && !formacao.atacante.includes(j)) {
        // Jogador ainda não alocado, tenta posição secundária
        if (j.posicaoSecundaria && formacao[j.posicaoSecundaria] && formacao[j.posicaoSecundaria].length < getMaxPorPosicao(j.posicaoSecundaria)) {
          formacao[j.posicaoSecundaria].push(j);
        } else {
          // Não tem posição secundária, aloca onde falta
          if (formacao.zagueiro.length < 2) formacao.zagueiro.push(j);
          else if (formacao.meia.length < 2) formacao.meia.push(j);
          else if (formacao.atacante.length < 1) formacao.atacante.push(j);
        }
      }
    });

    const temFormacaoCorreta = formacao.zagueiro.length === 2 && 
                               formacao.meia.length === 2 && 
                               formacao.atacante.length === 1;

    return { 
      valido: temFormacaoCorreta, 
      formacao,
      motivo: temFormacaoCorreta ? 'OK' : `Zag:${formacao.zagueiro.length} Mei:${formacao.meia.length} Ata:${formacao.atacante.length}`
    };
  };

  const getMaxPorPosicao = (posicao) => {
    if (posicao === 'zagueiro') return 2;
    if (posicao === 'meia') return 2;
    if (posicao === 'atacante') return 1;
    return 0;
  };

  // Calcula penalidade por jogadores fora de posição
  const calcularPenalidadePosicional = (time) => {
    const validacao = validarFormacao(time);
    if (!validacao.valido) return 999; // Formação inválida = penalidade máxima

    let penalidade = 0;
    const formacao = validacao.formacao;

    // Verifica quantos estão fora da posição primária
    Object.keys(formacao).forEach(posicao => {
      formacao[posicao].forEach(j => {
        if (j.posicaoPrimaria !== posicao) {
          // Está jogando na secundária ou improvisado
          if (j.posicaoSecundaria === posicao) {
            penalidade += 0.5; // Penalidade leve para posição secundária
          } else {
            penalidade += 1.5; // Penalidade maior para improvisação
          }
        }
      });
    });

    return penalidade;
  };

  // Calcula força real do time considerando pesos não-lineares
  const calcularForcaTime = (time) => {
    let forcaTotal = 0;
    let temJogadorProblema = false;
    let temGoleiroDestaque = false;
    
    time.forEach(j => {
      forcaTotal += calcularPesoReal(j.nivel, j.isJogadorProblema);
      if (j.isJogadorProblema) temJogadorProblema = true;
      if (j.isGoleiroDestaque) temGoleiroDestaque = true;
    });

    // Bônus se tem goleiro destaque
    if (temGoleiroDestaque) {
      forcaTotal += 1.5;
    }

    // Penalidade se tem jogador problema (além do peso já reduzido)
    if (temJogadorProblema) {
      forcaTotal -= 1.0;
    }

    // NOVO: Penalidade posicional
    const penalidadePosicional = calcularPenalidadePosicional(time);
    forcaTotal -= penalidadePosicional;

    return forcaTotal;
  };

  // NOVO: Algoritmo principal que distribui em N times de 5 jogadores
  const distribuirEmMultiplosTimes = (algoritmo) => {
    const confirmados = jogadores.filter(j => j.confirmado !== false);
    const nTimes = Math.floor(confirmados.length / 5);
    
    if (nTimes < 2) {
      return null; // Precisa de pelo menos 10 jogadores
    }

    // Estratégias diferentes de distribuição
    switch(algoritmo) {
      case 'compensacao':
        return distribuicaoCompensacao(confirmados, nTimes);
      case 'snake':
        return distribuicaoSnakeDraft(confirmados, nTimes);
      case 'sorteio':
        return distribuicaoSorteioControlado(confirmados, nTimes);
      case 'otimizado':
        return distribuicaoOtimizada(confirmados, nTimes);
      default:
        return null;
    }
  };

  // Estratégia 1: Compensação (jogadores fracos com times fortes)
  const distribuicaoCompensacao = (confirmados, nTimes) => {
    const times = Array.from({ length: nTimes }, () => []);
    
    // Identifica jogadores especiais
    const jogadoresProblema = confirmados.filter(j => j.isJogadorProblema);
    const goleirosDestaque = confirmados.filter(j => j.isGoleiroDestaque);
    const goleirosNormais = confirmados.filter(j => j.posicaoPrimaria === 'goleiro' && !j.isGoleiroDestaque);
    
    // Distribui goleiros (1 por time)
    const todosGoleiros = [...goleirosDestaque, ...goleirosNormais];
    todosGoleiros.forEach((goleiro, idx) => {
      if (idx < nTimes) {
        times[idx].push(goleiro);
      }
    });

    // Ordena jogadores por nível (descendente)
    const jogadoresRestantes = confirmados
      .filter(j => !todosGoleiros.includes(j))
      .sort((a, b) => b.nivel - a.nivel);

    // Distribui jogadores problema primeiro, nos times mais fracos
    jogadoresProblema.forEach((problema, idx) => {
      if (!times[idx % nTimes].includes(problema)) {
        times[idx % nTimes].push(problema);
      }
    });

    // Remove jogadores já alocados
    const restantes = jogadoresRestantes.filter(j => 
      !jogadoresProblema.includes(j)
    );

    // Distribuição compensatória: melhores para times com jogadores fracos
    let timeIndex = 0;
    restantes.forEach(jogador => {
      // Encontra o time mais fraco
      const forcasTimes = times.map(t => calcularForcaTime(t.length === 5 ? t : [...t, ...Array(5 - t.length).fill({nivel: 5})]));
      const timeMaisFraco = forcasTimes.indexOf(Math.min(...forcasTimes));
      
      if (times[timeMaisFraco].length < 5) {
        times[timeMaisFraco].push(jogador);
      } else {
        // Se todos estão completos, coloca no próximo disponível
        const timeDisponivel = times.findIndex(t => t.length < 5);
        if (timeDisponivel >= 0) {
          times[timeDisponivel].push(jogador);
        }
      }
    });

    // Valida e retorna
    return validarDistribuicao(times) ? times : null;
  };

  // Estratégia 2: Snake Draft
  const distribuicaoSnakeDraft = (confirmados, nTimes) => {
    const times = Array.from({ length: nTimes }, () => []);
    const ordenados = [...confirmados].sort((a, b) => b.nivel - a.nivel);
    
    let rodada = 0;
    let posicao = 0;
    
    ordenados.forEach((jogador) => {
      const timeAtual = rodada % 2 === 0 ? posicao : (nTimes - 1 - posicao);
      
      if (times[timeAtual].length < 5) {
        times[timeAtual].push(jogador);
      }
      
      posicao++;
      if (posicao >= nTimes) {
        posicao = 0;
        rodada++;
      }
    });

    return validarDistribuicao(times) ? times : null;
  };

  // Estratégia 3: Sorteio Controlado
  const distribuicaoSorteioControlado = (confirmados, nTimes) => {
    const tentativasMax = 500;
    let melhorDistribuicao = null;
    let menorVariancia = Infinity;

    for (let i = 0; i < tentativasMax; i++) {
      const embaralhado = [...confirmados].sort(() => Math.random() - 0.5);
      const times = Array.from({ length: nTimes }, () => []);
      
      // Distribui em round-robin
      embaralhado.forEach((jogador, idx) => {
        const timeIdx = idx % nTimes;
        if (times[timeIdx].length < 5) {
          times[timeIdx].push(jogador);
        }
      });

      // Valida formações
      if (!validarDistribuicao(times)) continue;

      // Calcula variância entre forças dos times
      const forcas = times.map(t => calcularForcaTime(t));
      const media = forcas.reduce((a, b) => a + b, 0) / forcas.length;
      const variancia = forcas.reduce((acc, f) => acc + Math.pow(f - media, 2), 0) / forcas.length;

      if (variancia < menorVariancia) {
        menorVariancia = variancia;
        melhorDistribuicao = times;
      }
    }

    return melhorDistribuicao;
  };

  // Estratégia 4: Otimização (tenta minimizar diferença máxima)
  const distribuicaoOtimizada = (confirmados, nTimes) => {
    // Para muitos times, usa heurística gulosa
    const times = Array.from({ length: nTimes }, () => []);
    const disponivel = [...confirmados].sort((a, b) => b.nivel - a.nivel);

    // Distribui goleiros primeiro
    const goleiros = disponivel.filter(j => j.posicaoPrimaria === 'goleiro');
    goleiros.forEach((g, idx) => {
      if (idx < nTimes) times[idx].push(g);
    });

    // Remove goleiros da lista
    const semGoleiros = disponivel.filter(j => j.posicaoPrimaria !== 'goleiro');

    // Distribuição gulosa: sempre adiciona ao time mais fraco
    semGoleiros.forEach(jogador => {
      const forcas = times.map((t, idx) => ({
        forca: calcularForcaTime(t.length === 5 ? t : [...t, ...Array(5 - t.length).fill({nivel: 5})]),
        idx
      }));
      
      forcas.sort((a, b) => a.forca - b.forca);
      
      const timeMaisFraco = forcas[0].idx;
      if (times[timeMaisFraco].length < 5) {
        times[timeMaisFraco].push(jogador);
      } else {
        const timeDisponivel = times.findIndex(t => t.length < 5);
        if (timeDisponivel >= 0) times[timeDisponivel].push(jogador);
      }
    });

    return validarDistribuicao(times) ? times : null;
  };

  // Valida se todos os times têm formação válida
  const validarDistribuicao = (times) => {
    return times.every(time => {
      if (time.length !== 5) return false;
      const validacao = validarFormacao(time);
      return validacao.valido;
    });
  };
  // MANTIDO: Algoritmos legados para 2 times (compatibilidade)
  const algoritmoCompensacaoAutomatica = () => {
    const jogadorProblema = jogadores.find(j => j.isJogadorProblema);
    const goleiroDestaque = jogadores.find(j => j.isGoleiroDestaque);
    const goleiros = jogadores.filter(j => j.posicaoPrimaria === 'goleiro');
    const outroGoleiro = goleiros.find(g => !g.isGoleiroDestaque);
    
    let timeA = [jogadorProblema]; // Time A SEMPRE leva o jogador fraco
    let timeB = [goleiroDestaque || goleiros[0]]; // Time B leva o goleiro destaque
    
    // Se time B levou o goleiro destaque, time A leva o outro goleiro
    if (timeB[0]?.isGoleiroDestaque && outroGoleiro) {
      timeA.push(outroGoleiro);
    } else if (!timeA.some(j => j.posicaoPrimaria === 'goleiro')) {
      timeA.push(goleiros.find(g => !timeB.includes(g)));
    }

    // Jogadores restantes ordenados por nível
    const restantes = jogadores
      .filter(j => !timeA.includes(j) && !timeB.includes(j))
      .sort((a, b) => b.nivel - a.nivel);

    // Distribuir tentando manter formação tática
    const distribuir = () => {
      for (let tentativa = 0; tentativa < 1000; tentativa++) {
        let tentativaA = [...timeA];
        let tentativaB = [...timeB];
        let restantesTemp = [...restantes];

        // Distribuição priorizando melhores para time A (compensação)
        while (restantesTemp.length > 0 && (tentativaA.length < 5 || tentativaB.length < 5)) {
          const jogador = restantesTemp.shift();
          
          if (tentativaA.length < 5) {
            tentativaA.push(jogador);
          } else if (tentativaB.length < 5) {
            tentativaB.push(jogador);
          }
        }

        // Verifica se ambos os times têm formação válida
        const validacaoA = validarFormacao(tentativaA);
        const validacaoB = validarFormacao(tentativaB);

        if (validacaoA.valido && validacaoB.valido) {
          return { timeA: tentativaA, timeB: tentativaB };
        }

        // Se não funcionou, embaralha restantes e tenta de novo
        restantes.sort(() => Math.random() - 0.5);
      }

      // Se não conseguiu formação válida, retorna melhor esforço
      return { 
        timeA: [...timeA, ...restantes.slice(0, 5 - timeA.length)],
        timeB: [...timeB, ...restantes.slice(5 - timeA.length, 10 - timeA.length)]
      };
    };

    const resultado = distribuir();
    return { ...resultado, algoritmo: 'Compensação Automática' };
  };

  // Algoritmo 2: Snake Draft (escolha alternada, melhor primeiro)
  const algoritmoSnakeDraft = () => {
    const jogadoresOrdenados = [...jogadores].sort((a, b) => b.nivel - a.nivel);
    let timeA = [];
    let timeB = [];
    
    jogadoresOrdenados.forEach((jogador, idx) => {
      // Padrão snake: A, B, B, A, A, B, B, A, A, B
      const rodada = Math.floor(idx / 2);
      const isParRodada = rodada % 2 === 0;
      const isPrimeiroNaRodada = idx % 2 === 0;
      
      if ((isParRodada && isPrimeiroNaRodada) || (!isParRodada && !isPrimeiroNaRodada)) {
        if (timeA.length < 5) timeA.push(jogador);
        else if (timeB.length < 5) timeB.push(jogador);
      } else {
        if (timeB.length < 5) timeB.push(jogador);
        else if (timeA.length < 5) timeA.push(jogador);
      }
    });

    return { timeA: timeA.slice(0, 5), timeB: timeB.slice(0, 5), algoritmo: 'Snake Draft' };
  };

  // Algoritmo 3: Sorteio Controlado (evita combinações ruins)
  const algoritmoSorteioControlado = () => {
    const tentativas = 2000; // Aumentado para encontrar formações válidas
    let melhorDivisao = null;
    let menorDiferenca = Infinity;

    for (let i = 0; i < tentativas; i++) {
      const embaralhado = [...jogadores].sort(() => Math.random() - 0.5);
      let timeA = embaralhado.slice(0, 5);
      let timeB = embaralhado.slice(5, 10);

      // Valida formações
      const validacaoA = validarFormacao(timeA);
      const validacaoB = validarFormacao(timeB);
      
      if (!validacaoA.valido || !validacaoB.valido) {
        continue; // Pula divisões com formação inválida
      }

      // Rejeita se jogador problema e goleiro fraco estão no mesmo time contra goleiro destaque
      const timeATemProblema = timeA.some(j => j.isJogadorProblema);
      const timeATemGoleiroFraco = timeA.some(j => j.posicaoPrimaria === 'goleiro' && !j.isGoleiroDestaque);
      const timeBTemGoleiroDestaque = timeB.some(j => j.isGoleiroDestaque);
      
      if (timeATemProblema && timeATemGoleiroFraco && timeBTemGoleiroDestaque) {
        continue; // Pula essa combinação ruim
      }

      const forcaA = calcularForcaTime(timeA);
      const forcaB = calcularForcaTime(timeB);
      const diferenca = Math.abs(forcaA - forcaB);

      if (diferenca < menorDiferenca) {
        menorDiferenca = diferenca;
        melhorDivisao = { timeA, timeB };
      }
    }

    // Se não encontrou nenhuma divisão válida, retorna uma básica
    if (!melhorDivisao) {
      return algoritmoCompensacaoAutomatica();
    }

    return { 
      timeA: melhorDivisao.timeA, 
      timeB: melhorDivisao.timeB, 
      algoritmo: 'Sorteio Controlado' 
    };
  };

  // Algoritmo 4: Otimização por força bruta (testa combinações)
  const algoritmoOtimizacao = () => {
    const goleiros = jogadores.filter(j => j.posicaoPrimaria === 'goleiro');
    const jogadoresLinha = jogadores.filter(j => j.posicaoPrimaria !== 'goleiro');
    
    let melhorDivisao = null;
    let menorDiferenca = Infinity;

    // Para cada combinação de goleiros
    goleiros.forEach(g1 => {
      const g2 = goleiros.find(g => g.id !== g1.id);
      if (!g2) return;
      
      // Testa diferentes combinações de jogadores de linha
      const combinacoes = getCombinacoes(jogadoresLinha, 4);
      
      combinacoes.slice(0, 700).forEach(combo => { // Aumentado para melhor busca
        const timeA = [g1, ...combo];
        const timeB = [g2, ...jogadoresLinha.filter(j => !combo.includes(j))];
        
        // Valida formações táticas
        const validacaoA = validarFormacao(timeA);
        const validacaoB = validarFormacao(timeB);
        
        if (!validacaoA.valido || !validacaoB.valido) {
          return; // Pula formações inválidas
        }

        const forcaA = calcularForcaTime(timeA);
        const forcaB = calcularForcaTime(timeB);
        const diferenca = Math.abs(forcaA - forcaB);

        if (diferenca < menorDiferenca) {
          menorDiferenca = diferenca;
          melhorDivisao = { timeA, timeB };
        }
      });
    });

    // Se não encontrou nenhuma divisão válida, usa compensação automática
    if (!melhorDivisao) {
      return algoritmoCompensacaoAutomatica();
    }

    return { 
      timeA: melhorDivisao.timeA, 
      timeB: melhorDivisao.timeB, 
      algoritmo: 'Otimização Matemática' 
    };
  };

  // Função auxiliar para gerar combinações
  const getCombinacoes = (arr, k) => {
    if (k === 1) return arr.map(el => [el]);
    if (k === arr.length) return [arr];
    
    const result = [];
    const combinar = (start, combo) => {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        combinar(i + 1, combo);
        combo.pop();
      }
    };
    combinar(0, []);
    return result;
  };

  // Verifica se divisão é repetida em relação ao histórico
  const calcularSimilaridade = (divisao) => {
    if (historico.length === 0) return 0;
    
    let maxSimilaridade = 0;
    historico.forEach(hist => {
      const pares1 = new Set();
      divisao.timeA.forEach(j1 => {
        divisao.timeA.forEach(j2 => {
          if (j1.id < j2.id) pares1.add(`${j1.id}-${j2.id}`);
        });
      });

      const pares2 = new Set();
      hist.timeA.forEach(j1 => {
        hist.timeA.forEach(j2 => {
          if (j1.id < j2.id) pares2.add(`${j1.id}-${j2.id}`);
        });
      });

      const interseccao = [...pares1].filter(p => pares2.has(p)).length;
      const similaridade = interseccao / pares1.size;
      maxSimilaridade = Math.max(maxSimilaridade, similaridade);
    });

    return maxSimilaridade;
  };

  const gerarDivisoes = () => {
    if (numTimes < 2) {
      alert(`Precisa de pelo menos 10 jogadores confirmados. Atualmente: ${jogadoresConfirmados.length}`);
      return;
    }

    const algoritmos = ['compensacao', 'snake', 'sorteio', 'otimizado'];
    const nomes = {
      'compensacao': 'Compensação Automática',
      'snake': 'Snake Draft',
      'sorteio': 'Sorteio Controlado',
      'otimizado': 'Otimização Matemática'
    };

    const novasDivisoes = algoritmos.map(alg => {
      const times = distribuirEmMultiplosTimes(alg);
      if (!times) return null;

      // Calcula métricas
      const forcas = times.map(t => calcularForcaTime(t));
      const media = forcas.reduce((a, b) => a + b, 0) / forcas.length;
      const variancia = forcas.reduce((acc, f) => acc + Math.pow(f - media, 2), 0) / forcas.length;
      const desvioPadrao = Math.sqrt(variancia);
      const diferencaMaxima = Math.max(...forcas) - Math.min(...forcas);
      const diferencaPercentual = (diferencaMaxima / media) * 100;
      const similaridade = calcularSimilaridadeMultipla(times);

      return {
        algoritmo: nomes[alg],
        times,
        forcas,
        media,
        desvioPadrao,
        diferencaMaxima,
        diferencaPercentual,
        equilibrio: 100 - diferencaPercentual,
        novidade: 100 - (similaridade * 100),
        variancia
      };
    }).filter(Boolean);

    // Ordena por equilíbrio e novidade
    novasDivisoes.sort((a, b) => {
      const scoreA = a.equilibrio * 0.7 + a.novidade * 0.3;
      const scoreB = b.equilibrio * 0.7 + b.novidade * 0.3;
      return scoreB - scoreA;
    });

    setDivisoes(novasDivisoes);
  };

  // Calcula similaridade com histórico (para múltiplos times)
  const calcularSimilaridadeMultipla = (times) => {
    if (historico.length === 0) return 0;
    
    let maxSimilaridade = 0;
    historico.forEach(hist => {
      if (!hist.times) return;
      
      let totalPares = 0;
      let paresRepetidos = 0;
      
      times.forEach(time => {
        const paresTime = [];
        time.forEach((j1, i) => {
          time.forEach((j2, k) => {
            if (i < k) {
              paresTime.push(`${j1.id}-${j2.id}`);
              totalPares++;
            }
          });
        });

        hist.times.forEach(histTime => {
          const paresHist = [];
          histTime.forEach((j1, i) => {
            histTime.forEach((j2, k) => {
              if (i < k) paresHist.push(`${j1.id}-${j2.id}`);
            });
          });

          paresTime.forEach(par => {
            if (paresHist.includes(par)) paresRepetidos++;
          });
        });
      });

      const similaridade = totalPares > 0 ? paresRepetidos / totalPares : 0;
      maxSimilaridade = Math.max(maxSimilaridade, similaridade);
    });

    return maxSimilaridade;
  };

  const salvarNoHistorico = (divisao) => {
    setHistorico(prev => [...prev, { ...divisao, data: new Date() }]);
    alert('Divisão salva no histórico!');
  };

  const exportarJogadores = () => {
    const dados = {
      versao: '2.0',
      dataExportacao: new Date().toISOString(),
      jogadores: jogadores
    };
    
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jogadores_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importarJogadores = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const conteudo = JSON.parse(event.target.result);
        
        // Verifica se é formato novo (com wrapper) ou antigo (array direto)
        let dadosImportados;
        if (Array.isArray(conteudo)) {
          // Formato antigo (array direto)
          dadosImportados = conteudo;
        } else if (conteudo.jogadores && Array.isArray(conteudo.jogadores)) {
          // Formato novo (com wrapper)
          dadosImportados = conteudo.jogadores;
        } else {
          throw new Error('Formato inválido');
        }

        // Valida e normaliza dados
        const jogadoresNormalizados = dadosImportados.map((j, idx) => ({
          id: j.id || (idx + 1),
          nome: j.nome || `Jogador ${idx + 1}`,
          nivel: Math.max(1, Math.min(10, j.nivel || 5)),
          posicaoPrimaria: ['goleiro', 'zagueiro', 'meia', 'atacante'].includes(j.posicaoPrimaria) 
            ? j.posicaoPrimaria 
            : 'meia',
          posicaoSecundaria: ['goleiro', 'zagueiro', 'meia', 'atacante'].includes(j.posicaoSecundaria)
            ? j.posicaoSecundaria
            : null,
          isGoleiroDestaque: j.isGoleiroDestaque || false,
          isJogadorProblema: j.isJogadorProblema || false,
          confirmado: j.confirmado !== false, // Default true
        }));

        setJogadores(jogadoresNormalizados);
        alert(`✅ ${jogadoresNormalizados.length} jogadores importados com sucesso!`);
      } catch (err) {
        alert('❌ Erro ao importar arquivo. Verifique se o formato está correto.\n\n' + err.message);
      }
    };
    reader.readAsText(file);
    
    // Limpa o input para permitir reimportar o mesmo arquivo
    e.target.value = '';
  };

  const baixarTemplate = () => {
    const template = {
      versao: '2.0',
      dataExportacao: new Date().toISOString(),
      jogadores: [
        {
          id: 1,
          nome: 'João Silva',
          nivel: 8,
          posicaoPrimaria: 'goleiro',
          posicaoSecundaria: null,
          isGoleiroDestaque: true,
          isJogadorProblema: false,
          confirmado: true
        },
        {
          id: 2,
          nome: 'Pedro Santos',
          nivel: 7,
          posicaoPrimaria: 'zagueiro',
          posicaoSecundaria: 'meia',
          isGoleiroDestaque: false,
          isJogadorProblema: false,
          confirmado: true
        },
        {
          id: 3,
          nome: 'Carlos Oliveira',
          nivel: 6,
          posicaoPrimaria: 'meia',
          posicaoSecundaria: 'atacante',
          isGoleiroDestaque: false,
          isJogadorProblema: false,
          confirmado: true
        },
        {
          id: 4,
          nome: 'Marcos Lima',
          nivel: 1,
          posicaoPrimaria: 'atacante',
          posicaoSecundaria: null,
          isGoleiroDestaque: false,
          isJogadorProblema: true,
          confirmado: true
        }
      ]
    };

    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_jogadores.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-10 h-10 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Balanceador de Times</h1>
                <p className="text-gray-600">Sistema inteligente com compensação automática</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showConfig ? 'Ver Divisões' : 'Configurar Jogadores'}
            </button>
          </div>
        </div>

        {showConfig ? (
          /* Painel de Configuração */
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Configurar Jogadores</h2>
              <div className="flex gap-2">
                <button
                  onClick={baixarTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  title="Baixar arquivo de exemplo"
                >
                  <Save className="w-4 h-4" />
                  Template
                </button>
                <button
                  onClick={exportarJogadores}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  Exportar
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Importar
                  <input type="file" accept=".json" onChange={importarJogadores} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {jogadores.map((jogador, idx) => (
                <div key={jogador.id} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg ${
                  jogador.confirmado === false ? 'bg-gray-200 opacity-60' : 'bg-gray-50'
                }`}>
                  <label className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={jogador.confirmado !== false}
                      onChange={(e) => {
                        const novos = [...jogadores];
                        novos[idx].confirmado = e.target.checked;
                        setJogadores(novos);
                      }}
                      className="w-5 h-5"
                      title="Confirmado"
                    />
                  </label>

                  <input
                    type="text"
                    value={jogador.nome}
                    onChange={(e) => {
                      const novos = [...jogadores];
                      novos[idx].nome = e.target.value;
                      setJogadores(novos);
                    }}
                    className="col-span-2 px-3 py-2 border rounded-lg text-sm"
                    placeholder="Nome"
                    disabled={jogador.confirmado === false}
                  />
                  
                  <select
                    value={jogador.posicaoPrimaria}
                    onChange={(e) => {
                      const novos = [...jogadores];
                      novos[idx].posicaoPrimaria = e.target.value;
                      // Reseta secundária se escolher goleiro
                      if (e.target.value === 'goleiro') {
                        novos[idx].posicaoSecundaria = null;
                      }
                      setJogadores(novos);
                    }}
                    className="col-span-2 px-3 py-2 border rounded-lg text-sm"
                    disabled={jogador.confirmado === false}
                  >
                    <option value="goleiro">Goleiro</option>
                    <option value="zagueiro">Zagueiro</option>
                    <option value="meia">Meia</option>
                    <option value="atacante">Atacante</option>
                  </select>

                  <select
                    value={jogador.posicaoSecundaria || ''}
                    onChange={(e) => {
                      const novos = [...jogadores];
                      novos[idx].posicaoSecundaria = e.target.value || null;
                      setJogadores(novos);
                    }}
                    className="col-span-1 px-3 py-2 border rounded-lg text-sm bg-blue-50"
                    disabled={jogador.posicaoPrimaria === 'goleiro' || jogador.confirmado === false}
                  >
                    <option value="">-</option>
                    {jogador.posicaoPrimaria !== 'zagueiro' && <option value="zagueiro">Zag</option>}
                    {jogador.posicaoPrimaria !== 'meia' && <option value="meia">Mei</option>}
                    {jogador.posicaoPrimaria !== 'atacante' && <option value="atacante">Ata</option>}
                  </select>

                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={jogador.nivel}
                      onChange={(e) => {
                        const novos = [...jogadores];
                        novos[idx].nivel = parseInt(e.target.value);
                        setJogadores(novos);
                      }}
                      className="w-full"
                      disabled={jogador.confirmado === false}
                    />
                    <span className="font-bold w-6 text-center text-sm">{jogador.nivel}</span>
                  </div>

                  <label className="col-span-1 flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={jogador.isJogadorProblema || false}
                      onChange={(e) => {
                        const novos = [...jogadores];
                        novos[idx].isJogadorProblema = e.target.checked;
                        setJogadores(novos);
                      }}
                      className="w-4 h-4"
                      disabled={jogador.confirmado === false}
                    />
                    <span>Fraco</span>
                  </label>

                  <label className="col-span-1 flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={jogador.isGoleiroDestaque || false}
                      onChange={(e) => {
                        const novos = [...jogadores];
                        novos[idx].isGoleiroDestaque = e.target.checked;
                        setJogadores(novos);
                      }}
                      className="w-4 h-4"
                      disabled={jogador.posicaoPrimaria !== 'goleiro' || jogador.confirmado === false}
                    />
                    <span>⭐</span>
                  </label>

                  <button
                    onClick={() => setJogadores(jogadores.filter(j => j.id !== jogador.id))}
                    className="col-span-1 px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-green-800">
                    ✅ {jogadoresConfirmados.length} confirmados = {numTimes} time{numTimes !== 1 ? 's' : ''} de 5
                  </p>
                  {jogadoresSobrando > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ {jogadoresSobrando} jogador{jogadoresSobrando !== 1 ? 'es' : ''} sobrando (selecionar manualmente depois)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    Marque o ✓ para confirmar presença
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Posição Primária é onde o jogador joga melhor. 
                Posição Secundária (opcional) permite adaptação tática quando necessário.
              </p>
            </div>

            <button
              onClick={() => {
                const novoId = Math.max(...jogadores.map(j => j.id), 0) + 1;
                setJogadores([...jogadores, {
                  id: novoId,
                  nome: `Jogador ${novoId}`,
                  nivel: 5,
                  posicaoPrimaria: 'meia',
                  posicaoSecundaria: null,
                  confirmado: true,
                }]);
              }}
              className="mt-4 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              + Adicionar Jogador
            </button>
          </div>
        ) : (
          <>
            {/* Botão Gerar */}
            <div className="text-center mb-6">
              <button
                onClick={gerarDivisoes}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 shadow-lg text-lg font-bold transform hover:scale-105 transition-all"
              >
                <RefreshCw className="w-6 h-6" />
                Gerar Divisões Balanceadas
              </button>
            </div>

            {/* Alertas */}
            {divisoes.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Sistema de Compensação + Validação Tática</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      O time que ficar com o jogador mais fraco recebe automaticamente os melhores jogadores
                      disponíveis. Todos os times respeitam a formação 2-2-1 (2 zagueiros, 2 meias, 1 atacante),
                      priorizando posições primárias. Jogadores fora de posição são marcados como "(Adapt)".
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Divisões Geradas */}
            <div className="space-y-6">
              {divisoes.map((divisao, divIdx) => (
                <div key={divIdx} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Header da Divisão */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{divisao.algoritmo}</h3>
                        <p className="text-sm text-blue-100">{divisao.times.length} times de 5 jogadores</p>
                      </div>
                      <button
                        onClick={() => {
                          setHistorico(prev => [...prev, { ...divisao, data: new Date() }]);
                          alert('Divisão salva no histórico!');
                        }}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-semibold"
                      >
                        Usar Esta
                      </button>
                    </div>
                  </div>

                  {/* Métricas Globais */}
                  <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {divisao.equilibrio.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Equilíbrio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {divisao.novidade.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Novidade</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {divisao.diferencaMaxima.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Dif. Máx</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {divisao.desvioPadrao.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Desvio</div>
                    </div>
                  </div>

                  {/* Grid de Times */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-100">
                    {divisao.times.map((time, timeIdx) => (
                      <div key={timeIdx} className="bg-white rounded-lg shadow overflow-hidden">
                        {/* Header do Time */}
                        <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-white">Time {timeIdx + 1}</h4>
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm font-semibold text-white">
                                {divisao.forcas[timeIdx].toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Formação Tática */}
                        {(() => {
                          const validacao = validarFormacao(time);
                          if (!validacao.valido) {
                            return (
                              <div className="p-3 bg-red-100 text-red-700 text-xs">
                                ⚠️ {validacao.motivo}
                              </div>
                            );
                          }
                          
                          const { formacao } = validacao;
                          return (
                            <div className="p-3 space-y-2">
                              {/* Atacante */}
                              <div className="bg-green-50 p-2 rounded border border-green-200">
                                <div className="text-xs font-semibold text-green-700 mb-1">⚽ Atacante</div>
                                {formacao.atacante.map(j => (
                                  <div key={j.id} className={`text-xs p-1 rounded flex items-center justify-between ${
                                    j.posicaoPrimaria !== 'atacante' ? 'bg-yellow-100' : ''
                                  }`}>
                                    <span>
                                      {j.nome} 
                                      {j.posicaoPrimaria !== 'atacante' && ' (A)'}
                                      {j.isJogadorProblema && ' ⚠️'}
                                    </span>
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-bold">{j.nivel}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Meias */}
                              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <div className="text-xs font-semibold text-blue-700 mb-1">🎯 Meias</div>
                                {formacao.meia.map(j => (
                                  <div key={j.id} className={`text-xs p-1 rounded flex items-center justify-between ${
                                    j.posicaoPrimaria !== 'meia' ? 'bg-yellow-100' : ''
                                  }`}>
                                    <span>
                                      {j.nome}
                                      {j.posicaoPrimaria !== 'meia' && ' (A)'}
                                    </span>
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-bold">{j.nivel}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Zagueiros */}
                              <div className="bg-purple-50 p-2 rounded border border-purple-200">
                                <div className="text-xs font-semibold text-purple-700 mb-1">🛡️ Zagueiros</div>
                                {formacao.zagueiro.map(j => (
                                  <div key={j.id} className={`text-xs p-1 rounded flex items-center justify-between ${
                                    j.posicaoPrimaria !== 'zagueiro' ? 'bg-yellow-100' : ''
                                  }`}>
                                    <span>
                                      {j.nome}
                                      {j.posicaoPrimaria !== 'zagueiro' && ' (A)'}
                                    </span>
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-bold">{j.nivel}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Goleiro */}
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                <div className="text-xs font-semibold text-yellow-700 mb-1">🧤 Goleiro</div>
                                {time.filter(j => j.posicaoPrimaria === 'goleiro').map(j => (
                                  <div key={j.id} className="text-xs p-1 flex items-center justify-between">
                                    <span>
                                      {j.nome} {j.isGoleiroDestaque && '⭐'}
                                    </span>
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-bold">{j.nivel}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Jogadores Sobrando */}
                  {jogadoresSobrando > 0 && (
                    <div className="p-4 bg-orange-50 border-t-2 border-orange-300">
                      <h4 className="text-sm font-bold text-orange-800 mb-2">
                        ⚠️ Jogadores Sobrando ({jogadoresSobrando})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {jogadoresConfirmados.slice(numTimes * 5).map(j => (
                          <div key={j.id} className="px-3 py-1 bg-white rounded-lg border border-orange-300 text-sm">
                            {j.nome} <span className="text-xs text-gray-600">({j.posicaoPrimaria} - {j.nivel})</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-orange-700 mt-2">
                        Selecione manualmente onde alocar estes jogadores após formar os times principais
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Histórico */}
            {historico.length > 0 && (
              <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Histórico ({historico.length} jogos)
                </h3>
                <div className="text-sm text-gray-600">
                  Use este histórico para evitar repetições nas próximas divisões
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BalanceadorTimes;
