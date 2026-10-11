import {
  ErroArticulacao,
  lerArticulacao,
  UNIDADES_DO_CURSO,
} from '../../procedural/extensoes/articulacao/declaracao.js';
import {
  TOLERANCIA_CONTATO_SOLIDO,
  auditarParDeSolidos,
  exigirToleranciaDeContato,
  prepararSolido,
  profundidadeDeInterpenetracao,
} from './contato-de-solidos.js';
import { interfaceNoMundo } from './posicao-por-porta.js';

/* conferir-articulacao — o curso de uma articulação declarada, conferido contra
   as malhas de uma montagem resolvida. Serviço neutro, sem Three.js.

   A articulação (`procedural/extensoes/articulacao/`) é relação, não geometria.
   Aqui ela vira medida: o eixo sai da porta da peça que fica, a porta da peça
   que se move tem de estar sobre ele, e o curso declarado é amostrado em
   `passos + 1` posições. Em cada posição as peças que se movem são levadas à
   pose do passo e medidas contra as que ficam pela MESMA régua da auditoria de
   interseções (`contato-de-solidos.js`), sem segunda implementação do contato.

   O QUE SE RECUSA. Par que se invade acima da folga declarada, com a posição,
   o par e a penetração. Encostar não é colidir, e penetração até a folga é
   tolerada e aparece no relatório. Penetração indeterminada (o par se cruza só
   por arestas, sem ponto amostrado dentro) recusa sempre: tratá-la como zero
   seria dar garantia que a medida não tem. Sólido de malha aberta devolve
   `inconclusivo` e também recusa, como na auditoria de interseções.

   O QUE ESTÁ FORA. Só as posições amostradas são medidas; entre uma posição
   livre e a seguinte, colidida, a bisseção devolve o último valor livre
   (`livreAte`), mas colisão que começa e termina entre duas amostras não é
   vista, e o número de passos é decisão do autor. Nada de dinâmica, e as
   demais peças da montagem ficam paradas: cadeia de articulações é conferida
   uma articulação por vez. */

export const FORMATO_CONFERENCIA_ARTICULACAO = 'mecanifica.conferencia-articulacao';
export const VERSAO_CONFERENCIA_ARTICULACAO = 1;
/* A porta móvel está "sobre o eixo" quando o seno do ângulo entre os eixos e a
   distância do centro à reta ficam dentro destes valores; a distância é a
   mesma tolerância com que a porta é conferida contra a forma da peça. */
export const TOLERANCIA_PARALELISMO = 1e-6;
export const TOLERANCIA_DE_EIXO = 1e-4;
const ITERACOES_DA_BISSECAO = 30;

const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, n) => [a[0] * n, a[1] * n, a[2] * n];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const aplicar = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
const multiplicar = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
const limpo = (n) => (Object.is(n, -0) ? 0 : n);
const compararTexto = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const mesmoCaminho = (a, b) => a.length === b.length && a.every((item, i) => item === b[i]);
const comecaCom = (caminho, prefixo) => prefixo.length <= caminho.length && prefixo.every((item, i) => item === caminho[i]);
const chave = (caminho) => JSON.stringify(caminho);

function compararCaminho(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const ordem = compararTexto(a[i], b[i]);
    if (ordem) return ordem;
  }
  return a.length - b.length;
}

function falhar(codigo, caminho, mensagem) { throw new ErroArticulacao(codigo, caminho, mensagem); }

function rotacaoEmTorno(k, angulo) {
  const c = Math.cos(angulo); const s = Math.sin(angulo); const t = 1 - c;
  return [
    [t * k[0] * k[0] + c, t * k[0] * k[1] - s * k[2], t * k[0] * k[2] + s * k[1]],
    [t * k[0] * k[1] + s * k[2], t * k[1] * k[1] + c, t * k[1] * k[2] - s * k[0]],
    [t * k[0] * k[2] - s * k[1], t * k[1] * k[2] + s * k[0], t * k[2] * k[2] + c],
  ];
}

function folhasDaMontagem(montagem, saida = []) {
  for (const instancia of montagem.instancias) {
    if (instancia.alvo?.tipo === 'montagem') folhasDaMontagem(instancia.montagem, saida);
    else saida.push(instancia);
  }
  return saida.sort((a, b) => compararCaminho(a.caminho, b.caminho));
}

function poseBase(instancia) {
  const pose = instancia.poseMundo;
  return { rotacao: pose?.rotacao ?? IDENTIDADE, deslocamento: pose?.deslocamento ?? [0, 0, 0] };
}

function folhaDoCaminho(folhas, caminho, onde) {
  const folha = folhas.find((item) => mesmoCaminho(item.caminho, caminho));
  if (!folha) {
    const disponiveis = folhas.map((item) => chave(item.caminho)).join(', ') || '(nenhum)';
    falhar('instancia-ausente', onde, `a montagem não tem a peça ${chave(caminho)}. Caminhos disponíveis: ${disponiveis}.`);
  }
  return folha;
}

/* O eixo da porta no mundo. Só cilindro, anel e trilho têm eixo; plano e
   padrão de furos têm normal, que não define uma articulação. */
function eixoDaPorta(folha, nomeDaPorta, onde) {
  const portas = folha.definicao?.neutro?.portas;
  if (!(portas instanceof Map) || !portas.has(nomeDaPorta)) {
    const disponiveis = portas instanceof Map ? [...portas.keys()].sort(compararTexto).join(', ') || '(nenhuma)' : '(nenhuma)';
    falhar('porta-ausente', onde, `a peça ${chave(folha.caminho)} não publica a porta '${nomeDaPorta}'. Portas publicadas: ${disponiveis}.`);
  }
  const interfaceLocal = portas.get(nomeDaPorta).interface;
  if (!interfaceLocal || !Array.isArray(interfaceLocal.eixo) || !(norma(interfaceLocal.eixo) > 0)) {
    falhar('porta-sem-eixo', onde, `a porta '${nomeDaPorta}' (${interfaceLocal?.forma ?? 'sem interface'}) não tem eixo; a articulação pede cilindro, anel ou trilho.`);
  }
  const mundo = interfaceNoMundo(interfaceLocal, poseBase(folha));
  const comprimento = norma(mundo.eixo);
  return { eixo: mult(mundo.eixo, 1 / comprimento), centro: mundo.centro, forma: interfaceLocal.forma, curso: interfaceLocal.curso };
}

function mm(metros) { return `${Number((metros * 1000).toFixed(3))} mm`; }

/**
 * Confere a articulação declarada contra uma montagem resolvida.
 *
 * Lança `ErroArticulacao` quando a declaração é inválida ou não se prende às
 * portas das peças (instância ou porta ausente, porta sem eixo, porta móvel
 * fora do eixo da fixa, curso maior que o do trilho). Colisão no curso não
 * lança: volta em `ok: false`, com `colisoes` e `recusa`, e quem quiser a
 * exceção usa `exigirArticulacaoLivre`.
 */
export function conferirArticulacao(montagemResolvida, declaracao, opcoes = {}) {
  if (!montagemResolvida || !Array.isArray(montagemResolvida.instancias)) throw new TypeError('conferir articulação: montagem resolvida inválida.');
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) throw new TypeError('conferir articulação: opções inválidas.');
  const extras = Object.keys(opcoes).filter((c) => c !== 'toleranciaNumerica');
  if (extras.length) throw new Error(`conferir articulação: opção desconhecida '${extras[0]}'.`);
  const tolerancia = exigirToleranciaDeContato(opcoes.toleranciaNumerica
    ?? montagemResolvida.auditoriaIntersecoes?.toleranciaNumerica
    ?? TOLERANCIA_CONTATO_SOLIDO, 'conferir articulação');
  const { articulacao, si } = lerArticulacao(declaracao);
  const onde = `articulacao.${articulacao.id}`;
  const folhas = folhasDaMontagem(montagemResolvida);

  const folhaFixa = folhaDoCaminho(folhas, articulacao.fixo.caminho, `${onde}.fixo`);
  const folhaMovel = folhaDoCaminho(folhas, articulacao.movel.caminho, `${onde}.movel`);
  const prefixosMoveis = [articulacao.movel.caminho, ...articulacao.acompanham];
  for (const [i, caminho] of articulacao.acompanham.entries()) {
    if (!folhas.some((folha) => comecaCom(folha.caminho, caminho))) {
      falhar('instancia-ausente', `${onde}.acompanham[${i}]`, `a montagem não tem a instância ${chave(caminho)}.`);
    }
  }
  const moveis = folhas.filter((folha) => prefixosMoveis.some((prefixo) => comecaCom(folha.caminho, prefixo)));
  const fixos = folhas.filter((folha) => !moveis.includes(folha));
  if (moveis.includes(folhaFixa)) falhar('fixo-move-junto', `${onde}.fixo`, `a peça fixa ${chave(folhaFixa.caminho)} está entre as que se movem (móvel ou acompanham).`);

  const portaFixa = eixoDaPorta(folhaFixa, articulacao.fixo.porta, `${onde}.fixo.porta`);
  const portaMovel = eixoDaPorta(folhaMovel, articulacao.movel.porta, `${onde}.movel.porta`);
  const direcao = portaFixa.eixo;
  const seno = norma(cross(direcao, portaMovel.eixo));
  const distancia = norma(cross(sub(portaMovel.centro, portaFixa.centro), direcao));
  if (seno > TOLERANCIA_PARALELISMO || distancia > TOLERANCIA_DE_EIXO) {
    falhar('eixos-nao-coincidem', `${onde}.movel.porta`,
      `a porta '${articulacao.movel.porta}' não está sobre o eixo da porta '${articulacao.fixo.porta}': seno do ângulo ${Number(seno.toExponential(3))}, distância do centro ao eixo ${mm(distancia)} (tolerâncias ${TOLERANCIA_PARALELISMO} e ${mm(TOLERANCIA_DE_EIXO)}).`);
  }
  if (articulacao.tipo === 'prismatica') {
    const extensao = si.curso.maximo - si.curso.minimo;
    for (const [lado, porta] of [['fixo', portaFixa], ['movel', portaMovel]]) {
      if (porta.forma === 'trilho' && Number.isFinite(porta.curso) && extensao > porta.curso + tolerancia) {
        falhar('curso-maior-que-o-trilho', `${onde}.curso`, `o curso declarado (${mm(extensao)}) passa do curso do trilho '${articulacao[lado].porta}' (${mm(porta.curso)}).`);
      }
    }
  }
  for (const [i, permitido] of articulacao.permitidos.entries()) {
    const quem = `${onde}.permitidos[${i}]`;
    if (!moveis.some((folha) => mesmoCaminho(folha.caminho, permitido.movel))) falhar('permitido-invalido', `${quem}.movel`, `${chave(permitido.movel)} não é peça que se move nesta articulação.`);
    if (!fixos.some((folha) => mesmoCaminho(folha.caminho, permitido.fixo))) falhar('permitido-invalido', `${quem}.fixo`, `${chave(permitido.fixo)} não é peça que fica nesta articulação.`);
  }

  const fator = UNIDADES_DO_CURSO[articulacao.tipo][articulacao.unidade];
  const noDeclarado = (valorSI) => limpo(Number((valorSI / fator).toPrecision(12)));
  const valores = Array.from({ length: articulacao.passos + 1 }, (_, i) => (
    i === articulacao.passos ? si.curso.maximo : si.curso.minimo + ((si.curso.maximo - si.curso.minimo) * i) / articulacao.passos));
  const centroDoEixo = portaFixa.centro;

  function poseNoValor(folha, valor) {
    const base = poseBase(folha);
    if (articulacao.tipo === 'prismatica') {
      return { escala: 1, rotacao: base.rotacao, deslocamento: soma(base.deslocamento, mult(direcao, valor)) };
    }
    const giro = rotacaoEmTorno(direcao, valor);
    return {
      escala: 1,
      rotacao: multiplicar(giro, base.rotacao),
      deslocamento: soma(aplicar(giro, sub(base.deslocamento, centroDoEixo)), centroDoEixo),
    };
  }

  const solidosFixos = fixos.map((folha) => prepararSolido(folha.definicao?.neutro, poseBase(folha), folha.caminho));
  const memoriaMoveis = new Map();
  function solidoMovel(indice, valor) {
    const k = `${indice}|${valor}`;
    if (!memoriaMoveis.has(k)) memoriaMoveis.set(k, prepararSolido(moveis[indice].definicao?.neutro, poseNoValor(moveis[indice], valor), moveis[indice].caminho));
    return memoriaMoveis.get(k);
  }

  const permitidoDoPar = (movel, fixo) => articulacao.permitidos.find((item) => mesmoCaminho(item.movel, movel) && mesmoCaminho(item.fixo, fixo));
  function medir(indiceMovel, indiceFixo, valor) {
    const movel = solidoMovel(indiceMovel, valor);
    const fixo = solidosFixos[indiceFixo];
    const resultado = auditarParDeSolidos(movel, fixo, tolerancia);
    if (resultado.estado === 'inconclusivo') return { estado: 'inconclusivo', diagnosticos: resultado.diagnosticos, colide: false };
    if (resultado.estado !== 'interpenetram') return { estado: resultado.estado, colide: false };
    const penetracao = profundidadeDeInterpenetracao(movel, fixo, tolerancia);
    return {
      estado: 'interpenetram', metodo: resultado.metodo, penetracao,
      colide: penetracao === null || penetracao > si.folga,
    };
  }

  const pares = [];
  for (let m = 0; m < moveis.length; m += 1) for (let f = 0; f < fixos.length; f += 1) {
    pares.push({ m, f, movel: moveis[m].caminho, fixo: fixos[f].caminho, permitido: permitidoDoPar(moveis[m].caminho, fixos[f].caminho) });
  }
  pares.sort((a, b) => compararCaminho(a.movel, b.movel) || compararCaminho(a.fixo, b.fixo));

  const colisoes = [];
  const inconclusivos = [];
  const resumoDosPares = [];
  const primeirasColisoes = [];
  const posicoes = valores.map((valor, indice) => ({ indice, valor: noDeclarado(valor), livre: true }));
  for (const par of pares) {
    let pior = 'separadas'; let penetracaoMaxima = null; let nColisoes = 0; let anteriorLivre = null; let primeira = null;
    let inconclusivo = false;
    const gravidade = { separadas: 0, encostam: 1, interpenetram: 2 };
    for (let i = 0; i < valores.length; i += 1) {
      const medida = medir(par.m, par.f, valores[i]);
      if (medida.estado === 'inconclusivo') {
        inconclusivo = true;
        inconclusivos.push({ movel: par.movel, fixo: par.fixo, diagnosticos: medida.diagnosticos });
        break;
      }
      if (gravidade[medida.estado] > gravidade[pior]) pior = medida.estado;
      if (medida.penetracao !== undefined && medida.penetracao !== null && (penetracaoMaxima === null || medida.penetracao > penetracaoMaxima)) penetracaoMaxima = medida.penetracao;
      if (medida.colide && !par.permitido) {
        nColisoes += 1;
        posicoes[i].livre = false;
        colisoes.push({
          posicao: { indice: i, valor: posicoes[i].valor, unidade: articulacao.unidade },
          movel: par.movel, fixo: par.fixo, estado: medida.estado, metodo: medida.metodo,
          penetracao: medida.penetracao === null ? null : limpo(medida.penetracao),
        });
        if (primeira === null) primeira = { indice: i, anterior: anteriorLivre };
      } else if (primeira === null) anteriorLivre = i;
    }
    if (primeira !== null) {
      let livreAte = null;
      if (primeira.anterior !== null && primeira.anterior === primeira.indice - 1) {
        let baixo = valores[primeira.anterior]; let alto = valores[primeira.indice];
        for (let it = 0; it < ITERACOES_DA_BISSECAO; it += 1) {
          const meio = (baixo + alto) / 2;
          if (medir(par.m, par.f, meio).colide) alto = meio; else baixo = meio;
        }
        livreAte = noDeclarado(baixo);
      }
      primeirasColisoes.push({
        movel: par.movel, fixo: par.fixo,
        primeiraPosicao: { indice: primeira.indice, valor: posicoes[primeira.indice].valor },
        livreAte,
      });
    }
    if (pior !== 'separadas' || inconclusivo) {
      resumoDosPares.push({
        movel: par.movel, fixo: par.fixo, permitido: par.permitido !== undefined,
        estadoMaisGrave: inconclusivo ? 'inconclusivo' : pior,
        penetracaoMaxima: penetracaoMaxima === null ? null : limpo(penetracaoMaxima),
        colisoes: nColisoes,
      });
    }
  }
  colisoes.sort((a, b) => a.posicao.indice - b.posicao.indice || compararCaminho(a.movel, b.movel) || compararCaminho(a.fixo, b.fixo));

  const recusa = [];
  const unidadeDoCurso = articulacao.unidade;
  for (const c of colisoes) {
    const livre = primeirasColisoes.find((p) => mesmoCaminho(p.movel, c.movel) && mesmoCaminho(p.fixo, c.fixo) && p.primeiraPosicao.indice === c.posicao.indice);
    recusa.push(`articulação '${articulacao.id}': na posição ${c.posicao.indice} de ${articulacao.passos} (${c.posicao.valor} ${unidadeDoCurso}) ${chave(c.movel)} ${c.penetracao === null ? 'cruza' : `penetra ${mm(c.penetracao)}`} ${chave(c.fixo)}${c.penetracao === null ? ' (penetração indeterminada)' : ''}, acima da folga de ${mm(si.folga)}${livre && livre.livreAte !== null ? `; livre até ${livre.livreAte} ${unidadeDoCurso}` : ''}.`);
  }
  for (const i of inconclusivos) {
    recusa.push(`articulação '${articulacao.id}': o par ${chave(i.movel)} e ${chave(i.fixo)} é inconclusivo (${i.diagnosticos.join(', ')}); malha aberta não recebe veredito de curso livre.`);
  }

  return {
    formato: FORMATO_CONFERENCIA_ARTICULACAO,
    versao: VERSAO_CONFERENCIA_ARTICULACAO,
    articulacao: articulacao.id,
    tipo: articulacao.tipo,
    ok: colisoes.length === 0 && inconclusivos.length === 0,
    eixo: { centro: centroDoEixo.map(limpo), direcao: direcao.map(limpo) },
    curso: { minimo: articulacao.curso.minimo, maximo: articulacao.curso.maximo, unidade: unidadeDoCurso },
    passos: articulacao.passos,
    folga: limpo(si.folga),
    toleranciaNumerica: tolerancia,
    moveis: moveis.map((folha) => folha.caminho),
    fixos: fixos.map((folha) => folha.caminho),
    paresConferidos: pares.length,
    posicoes,
    colisoes,
    primeirasColisoes,
    inconclusivos,
    pares: resumoDosPares,
    permitidos: articulacao.permitidos.map((item) => ({
      movel: item.movel, fixo: item.fixo, motivo: item.motivo,
      contatoObservado: resumoDosPares.some((par) => mesmoCaminho(par.movel, item.movel) && mesmoCaminho(par.fixo, item.fixo) && par.estadoMaisGrave !== 'separadas'),
    })),
    recusa,
  };
}

/** A mesma conferência como exceção: quem não quer olhar o relatório recebe a recusa pronta. */
export function exigirArticulacaoLivre(resultado) {
  if (resultado.ok) return resultado;
  throw new ErroArticulacao('colisao-no-curso', `articulacao.${resultado.articulacao}`, resultado.recusa.join(' '));
}

/** Várias articulações da mesma montagem, uma por vez, na ordem de `id`. */
export function conferirArticulacoes(montagemResolvida, declaracoes, opcoes = {}) {
  if (!Array.isArray(declaracoes)) throw new TypeError('conferir articulações: precisa ser lista.');
  const ids = new Set();
  const resultados = [...declaracoes]
    .map((declaracao) => {
      if (ids.has(declaracao?.id)) falhar('articulacao-duplicada', `articulacao.${declaracao.id}`, `ID '${declaracao.id}' duplicado.`);
      ids.add(declaracao?.id);
      return conferirArticulacao(montagemResolvida, declaracao, opcoes);
    })
    .sort((a, b) => compararTexto(a.articulacao, b.articulacao));
  return { ok: resultados.every((r) => r.ok), resultados };
}

export const FORMATO_CONFERENCIA_SIMULTANEA = 'mecanifica.conferencia-aberturas-simultaneas';
export const VERSAO_CONFERENCIA_SIMULTANEA = 1;

/**
 * Várias articulações abertas ao mesmo tempo. `conferirArticulacao` leva uma articulação por vez ao longo do curso com as
 * demais peças paradas; aqui cada articulação vai ao meio do curso e ao fim dele, e para cada par de articulações e cada
 * combinação dessas posições as peças que uma move são medidas contra as que a outra move, pela mesma régua do contato de
 * sólidos. Uma porta aberta junto de uma gaveta aberta, ou duas portas vizinhas abertas, entram aqui; o par de uma
 * articulação com as peças que nenhuma move já está na conferência de cada uma. Lança `ErroArticulacao` quando uma
 * declaração é inválida ou não se prende às portas das peças, ou quando duas articulações movem a mesma peça. A colisão não
 * lança: volta em `ok: false`, com `colisoes` e `recusa`.
 */
export function conferirAberturasSimultaneas(montagemResolvida, declaracoes, opcoes = {}) {
  if (!montagemResolvida || !Array.isArray(montagemResolvida.instancias)) throw new TypeError('conferir aberturas simultâneas: montagem resolvida inválida.');
  if (!Array.isArray(declaracoes)) throw new TypeError('conferir aberturas simultâneas: as declarações precisam ser uma lista.');
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) throw new TypeError('conferir aberturas simultâneas: opções inválidas.');
  const extras = Object.keys(opcoes).filter((c) => c !== 'toleranciaNumerica');
  if (extras.length) throw new Error(`conferir aberturas simultâneas: opção desconhecida '${extras[0]}'.`);
  const tolerancia = exigirToleranciaDeContato(opcoes.toleranciaNumerica
    ?? montagemResolvida.auditoriaIntersecoes?.toleranciaNumerica
    ?? TOLERANCIA_CONTATO_SOLIDO, 'conferir aberturas simultâneas');
  const folhas = folhasDaMontagem(montagemResolvida);

  const preparadas = declaracoes.map((declaracao) => {
    const { articulacao, si } = lerArticulacao(declaracao);
    const onde = `articulacao.${articulacao.id}`;
    const folhaFixa = folhaDoCaminho(folhas, articulacao.fixo.caminho, `${onde}.fixo`);
    folhaDoCaminho(folhas, articulacao.movel.caminho, `${onde}.movel`);
    const prefixosMoveis = [articulacao.movel.caminho, ...articulacao.acompanham];
    const moveis = folhas.filter((folha) => prefixosMoveis.some((prefixo) => comecaCom(folha.caminho, prefixo)));
    const portaFixa = eixoDaPorta(folhaFixa, articulacao.fixo.porta, `${onde}.fixo.porta`);
    const fator = UNIDADES_DO_CURSO[articulacao.tipo][articulacao.unidade];
    const meio = si.curso.minimo + (si.curso.maximo - si.curso.minimo) / 2;
    return {
      articulacao, si, moveis, direcao: portaFixa.eixo, centro: portaFixa.centro,
      posicoes: [meio, si.curso.maximo].map((valor) => ({ valor, declarado: limpo(Number((valor / fator).toPrecision(12))) })),
    };
  });
  const ids = new Set();
  for (const { articulacao } of preparadas) {
    if (ids.has(articulacao.id)) falhar('articulacao-duplicada', `articulacao.${articulacao.id}`, `ID '${articulacao.id}' duplicado.`);
    ids.add(articulacao.id);
  }
  const caminhosDeCada = preparadas.map(({ moveis }) => new Set(moveis.map((folha) => chave(folha.caminho))));
  for (let i = 0; i < preparadas.length; i += 1) for (let j = i + 1; j < preparadas.length; j += 1) {
    const comum = [...caminhosDeCada[i]].find((c) => caminhosDeCada[j].has(c));
    if (comum) falhar('peca-movida-por-duas', `articulacao.${preparadas[j].articulacao.id}`, `a peça ${comum} é movida por '${preparadas[i].articulacao.id}' e por '${preparadas[j].articulacao.id}'; a conferência simultânea pede articulações que movem peças diferentes.`);
  }

  const memoria = new Map();
  function solidoNoValor(indice, folha, valor) {
    const k = `${indice}|${chave(folha.caminho)}|${valor}`;
    if (!memoria.has(k)) {
      const { articulacao, direcao, centro } = preparadas[indice];
      const base = poseBase(folha);
      let pose;
      if (articulacao.tipo === 'prismatica') pose = { escala: 1, rotacao: base.rotacao, deslocamento: soma(base.deslocamento, mult(direcao, valor)) };
      else {
        const giro = rotacaoEmTorno(direcao, valor);
        pose = { escala: 1, rotacao: multiplicar(giro, base.rotacao), deslocamento: soma(aplicar(giro, sub(base.deslocamento, centro)), centro) };
      }
      memoria.set(k, prepararSolido(folha.definicao?.neutro, pose, folha.caminho));
    }
    return memoria.get(k);
  }

  const colisoes = [];
  const inconclusivos = [];
  const resumoDosPares = [];
  let combinacoes = 0;
  let paresDeSolidos = 0;
  for (let i = 0; i < preparadas.length; i += 1) for (let j = i + 1; j < preparadas.length; j += 1) {
    const a = preparadas[i]; const b = preparadas[j];
    const folga = Math.max(a.si.folga, b.si.folga);
    let pior = 'separadas'; let nColisoes = 0;
    for (const pa of a.posicoes) for (const pb of b.posicoes) {
      combinacoes += 1;
      for (const fa of a.moveis) for (const fb of b.moveis) {
        paresDeSolidos += 1;
        const sa = solidoNoValor(i, fa, pa.valor);
        const sb = solidoNoValor(j, fb, pb.valor);
        const resultado = auditarParDeSolidos(sa, sb, tolerancia);
        if (resultado.estado === 'inconclusivo') {
          inconclusivos.push({ a: a.articulacao.id, b: b.articulacao.id, pecaA: fa.caminho, pecaB: fb.caminho, diagnosticos: resultado.diagnosticos });
          pior = 'inconclusivo';
          continue;
        }
        if (resultado.estado === 'interpenetram') {
          if (pior !== 'inconclusivo') pior = 'interpenetram';
          const penetracao = profundidadeDeInterpenetracao(sa, sb, tolerancia);
          if (penetracao === null || penetracao > folga) {
            nColisoes += 1;
            colisoes.push({
              a: a.articulacao.id, valorA: pa.declarado, b: b.articulacao.id, valorB: pb.declarado, pecaA: fa.caminho, pecaB: fb.caminho,
              penetracao: penetracao === null ? null : limpo(penetracao),
            });
          }
        } else if (resultado.estado === 'encostam' && pior === 'separadas') pior = 'encostam';
      }
    }
    if (pior !== 'separadas') resumoDosPares.push({ a: a.articulacao.id, b: b.articulacao.id, estadoMaisGrave: pior, colisoes: nColisoes });
  }

  const unidadeDe = (id) => preparadas.find((x) => x.articulacao.id === id).articulacao.unidade;
  const recusa = colisoes.map((c) => `articulações '${c.a}' (${c.valorA} ${unidadeDe(c.a)}) e '${c.b}' (${c.valorB} ${unidadeDe(c.b)}) abertas ao mesmo tempo: ${chave(c.pecaA)} ${c.penetracao === null ? 'cruza' : `penetra ${mm(c.penetracao)}`} ${chave(c.pecaB)}.`);
  for (const inc of inconclusivos) recusa.push(`articulações '${inc.a}' e '${inc.b}': o par ${chave(inc.pecaA)} e ${chave(inc.pecaB)} é inconclusivo (${inc.diagnosticos.join(', ')}); malha aberta não recebe veredito.`);
  return {
    formato: FORMATO_CONFERENCIA_SIMULTANEA,
    versao: VERSAO_CONFERENCIA_SIMULTANEA,
    ok: colisoes.length === 0 && inconclusivos.length === 0,
    articulacoes: preparadas.map(({ articulacao, posicoes }) => ({ id: articulacao.id, unidade: articulacao.unidade, posicoes: posicoes.map((p) => p.declarado) })),
    toleranciaNumerica: tolerancia,
    paresDeArticulacoes: (preparadas.length * (preparadas.length - 1)) / 2,
    combinacoes,
    paresDeSolidos,
    colisoes,
    inconclusivos,
    pares: resumoDosPares,
    recusa,
  };
}
