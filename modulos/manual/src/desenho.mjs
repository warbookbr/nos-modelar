/* desenho.mjs — `npm run manual -- --desenho <peça>`: o desenho técnico de uma peça, três vistas com linha visível e escondida e as
   cotas que a receita declara em `COTAS`. Executa a receita (malha neutra), projeta, valida as cotas e grava `desenho.svg` e `desenho.png`. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { REPO, resolverCaminhoReceita } from '../../../tools/modelar/resolver-caminho-receita.mjs';
import { validarCotas } from './cotas.js';
import { LARGURA_DA_PAGINA, paginaDoDesenho } from './desenho-svg.js';
import { LIMIAR_PADRAO_GRAUS, comprimentoDosSegmentos, prepararMalha, projetarVista } from './projecao.js';

export const AJUDA_DO_DESENHO = `uso: npm run manual -- --desenho <peça> [opções]

Desenha a peça em três vistas ortográficas (terceiro diedro: cima sobre a frente, lado direito à direita), com a aresta visível
cheia e a escondida tracejada, e as cotas que a receita declara no export opcional COTAS. O programa não escolhe cotas: receita
sem COTAS sai sem cotas. Cota mal declarada é recusada com a mensagem do que falta.

opções (com =):
  --saida=<pasta>   pasta de saída, dentro do repositório (padrão: tools/bancadas/out/desenho-<peça>/)
  --limiar=<graus>  ângulo entre faces acima do qual a aresta é viva e desenhada, de 5 a 89 (padrão: ${LIMIAR_PADRAO_GRAUS})
  --ajuda           este texto

saída: desenho.svg, desenho.png e desenho.json (contagem e comprimento dos trechos por vista).

COTAS, na receita: [{ vista: 'frente', de: [x,y,z], ate: [x,y,z], lado: 'baixo', texto?, afastamentoMm? },
                    { tipo: 'diametro', vista: 'cima', centro: [x,y,z], diametro: 5.2, lado?: 'cima', texto? }]
Pontos em mm nos eixos da receita, ou o nome de um ponto de PONTOS. Lados: cima, baixo, esquerda, direita.`;

export function opcoesDoDesenho(argv) {
  const opcoes = { peca: null, saida: null, limiar: LIMIAR_PADRAO_GRAUS, ajuda: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ajuda' || arg === '-h') opcoes.ajuda = true;
    else if (arg === '--desenho') { if (argv[i + 1] && !argv[i + 1].startsWith('--')) { opcoes.peca = argv[i + 1]; i += 1; } }
    else if (arg.startsWith('--desenho=')) opcoes.peca = arg.slice(10);
    else if (arg.startsWith('--saida=')) opcoes.saida = arg.slice(8);
    else if (arg.startsWith('--limiar=')) opcoes.limiar = Number(arg.slice(9));
    else if (!arg.startsWith('--') && !opcoes.peca) opcoes.peca = arg;
    else throw new Error(`opção '${arg}' não vale com --desenho. Esperado: --saida=, --limiar= ou --ajuda. Rode 'npm run manual -- --desenho --ajuda'.`);
  }
  if (!opcoes.ajuda && (!opcoes.peca || opcoes.peca.startsWith('--'))) throw new Error("--desenho pede a peça. Esperado: npm run manual -- --desenho kukri");
  if (!Number.isFinite(opcoes.limiar) || opcoes.limiar < 5 || opcoes.limiar > 89) throw new Error('--limiar recebeu um valor fora de 5 a 89. Esperado: graus, por exemplo --limiar=30.');
  return opcoes;
}

/** Desenha uma receita já carregada. Devolve o SVG, as projeções, as cotas validadas e os tempos. */
export function desenharReceita(receita, { titulo, limiarGraus = LIMIAR_PADRAO_GRAUS } = {}) {
  const t0 = performance.now();
  const { neutro } = executarReceita(receita);
  const tReceita = performance.now();
  const malha = prepararMalha(neutro);
  const cotas = validarCotas(receita.COTAS, { caixa: malha.caixa, pontos: receita.PONTOS ?? [] });
  const dims = [0, 1, 2].map((k) => malha.caixa.max[k] - malha.caixa.min[k]);
  const escalaDaPagina = (LARGURA_DA_PAGINA - 400) / Math.max(dims[0] + dims[2], 1e-6);
  const projecoes = {};
  for (const vista of ['frente', 'cima', 'lado']) projecoes[vista] = projetarVista(malha, vista, { limiarGraus, escala: Math.min(escalaDaPagina, 12) });
  const svg = paginaDoDesenho({ titulo: titulo ?? receita.meta?.nome ?? 'peça', projecoes, cotas, limiarGraus });
  const fim = performance.now();
  return { svg, projecoes, cotas, caixaMm: malha.caixa, tempos: { receitaMs: Math.round(tReceita - t0), projecaoMs: Math.round(fim - tReceita), totalMs: Math.round(fim - t0) } };
}

function pastaDeSaida(pedida, nome) {
  if (!pedida) return join(REPO, 'tools/bancadas/out', `desenho-${nome.replace(/[^a-z0-9-]/gi, '-')}`);
  const pasta = resolve(pedida);
  const dentro = relative(REPO, pasta);
  if (dentro.startsWith('..') || isAbsolute(dentro)) throw new Error(`a pasta de saída '${pedida}' fica fora do repositório. Esperado: uma pasta dentro de ${REPO}, por exemplo --saida=tools/bancadas/out/desenho-teste.`);
  return pasta;
}

export async function gerarDesenho(peca, { saida = null, limiar = LIMIAR_PADRAO_GRAUS } = {}) {
  const caminho = resolverCaminhoReceita(peca, { raiz: REPO });
  const receita = (await import(pathToFileURL(caminho).href)).default;
  const resultado = desenharReceita(receita, { titulo: receita.meta?.nome ?? peca, limiarGraus: limiar });
  const pasta = pastaDeSaida(saida, peca);
  mkdirSync(pasta, { recursive: true });
  const sharp = (await import('sharp')).default;
  const t0 = performance.now();
  const png = await sharp(Buffer.from(resultado.svg), { density: 96 }).flatten({ background: '#ffffff' }).png().toBuffer();
  resultado.tempos.pngMs = Math.round(performance.now() - t0);
  const resumo = {
    formato: 'mecanifica.desenho', versao: 1, peca, limiarGraus: limiar, cotas: resultado.cotas.length,
    vistas: Object.fromEntries(Object.entries(resultado.projecoes).map(([nome, p]) => [nome, {
      visiveis: p.visiveis.length, escondidos: p.escondidos.length,
      comprimentoVisivelMm: Math.round(comprimentoDosSegmentos(p.visiveis) * 10) / 10, comprimentoEscondidoMm: Math.round(comprimentoDosSegmentos(p.escondidos) * 10) / 10,
    }])),
  };
  writeFileSync(join(pasta, 'desenho.svg'), resultado.svg);
  writeFileSync(join(pasta, 'desenho.png'), png);
  writeFileSync(join(pasta, 'desenho.json'), `${JSON.stringify(resumo, null, 2)}\n`);
  return { pasta, svg: join(pasta, 'desenho.svg'), png: join(pasta, 'desenho.png'), resumo, tempos: resultado.tempos };
}

export async function comoCLIDoDesenho(argv) {
  const opcoes = opcoesDoDesenho(argv);
  if (opcoes.ajuda) return { codigo: 0, texto: AJUDA_DO_DESENHO };
  const r = await gerarDesenho(opcoes.peca, { saida: opcoes.saida, limiar: opcoes.limiar });
  const { tempos } = r;
  return {
    codigo: 0,
    texto: `desenho de '${opcoes.peca}': ${r.resumo.cotas} cota(s); receita ${tempos.receitaMs} ms, projeção ${tempos.projecaoMs} ms, PNG ${tempos.pngMs} ms; total ${tempos.totalMs + tempos.pngMs} ms.\n`
      + Object.entries(r.resumo.vistas).map(([n, v]) => `  ${n}: ${v.comprimentoVisivelMm} mm visíveis, ${v.comprimentoEscondidoMm} mm escondidos`).join('\n')
      + `\n${r.svg}\n${r.png}`,
  };
}
