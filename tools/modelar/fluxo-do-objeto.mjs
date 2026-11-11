#!/usr/bin/env node
/* fluxo-do-objeto.mjs — em que passo um objeto está, da referência à etapa fixa, e o comando exato que vem agora.
 *
 * POR QUE ELE EXISTE. Na empilhadeira (2026-11-09) quem conduzia encadeava à mão `rodada-de-modelagem --acao`, `vistas:critica` e
 * `etapas` para cada uma das dezenove peças, e o estado do objeto vivia na conversa. O plano do núcleo para qualquer mecanismo
 * (fatia 1) pede um comando que leia a pasta do objeto e diga o passo e o que falta, peça por peça. Ele não decide nada novo: a ação de
 * cada peça é a de `acaoDaReceita` (a mesma de `--acao`) e a próxima etapa é a de `proximaEtapa` (a mesma de `npm run etapas`).
 *
 * OS SEIS PASSOS, na ordem em que o objeto é produzido, cada um pelo que deixa na pasta:
 *   1. alinhamento: `ALINHAMENTO.md` com a tabela de medidas e a seção das partes;
 *   2. referências: `referencias/` (ou a pasta que `referencias.json` aponta) com imagem, contorno ou prancha;
 *   3. rascunho: `referencias/*.esboco.mjs` ou `.esboco.json`, e a conferência dele em `*.conferir.json` (`npm run conferir:vistas`);
 *   4. receitas: `partes/<peça>/receita.js` ou `receita.js`, com a ação de cada peça;
 *   5. montagem: `montagem.json`, com as etapas abertas e fixas pelo registro `montagem.etapas.json`;
 *   6. fechamento: todas as etapas fixas; ficam a auditoria e o custo por peça.
 * O objeto que já tem receita está no passo 4 ou adiante, e o que faltar dos passos 1 a 3 sai como falta, sem prender o passo.
 *
 * A AÇÃO BARATA. Medir cada peça (`descrever`, guardas, pontos) leva segundos por peça. Por padrão a ação sai das rodadas gravadas e da
 * impressão do texto da receita: com o texto igual ao da última rodada, vale a medição que ela gravou; com o texto mudado, a medição é
 * presumida aprovada e a ação diz que não mediu. `--medir` mede cada peça de verdade, pela `acaoDaPeca` de `--acao`.
 *
 * Uso: npm run fluxo:objeto -- <pasta do objeto ou nome> [--json] [--medir]
 * Sai 2 em argumento ruim ou pasta que não existe. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acaoDaReceita, defeitosAbertos } from '../../src/autoria/laco-de-modelagem.js';
import { proximaEtapa } from '../../src/autoria/etapas-de-construcao.js';
import { acaoDaPeca, lerRodadas, limiteDaPeca } from './rodada-de-modelagem.mjs';
import { pastaDasReferencias } from './objeto.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

export const PASSOS = Object.freeze(['alinhamento', 'referencias', 'rascunho', 'receitas', 'montagem', 'fechamento']);
const IMAGEM = /\.(png|jpe?g|webp|svg)$/i;
const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();
const lerJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const ordenados = (pasta) => (ehPasta(pasta) ? readdirSync(pasta).sort() : []);
const sha = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;

/** O alinhamento: o arquivo, a tabela de medidas e a seção das partes. */
export function lerAlinhamento(pasta) {
  const arquivo = join(pasta, 'ALINHAMENTO.md');
  if (!existsSync(arquivo)) return { feito: false, falta: ['ALINHAMENTO.md'] };
  const texto = readFileSync(arquivo, 'utf8');
  const falta = [];
  const tabela = /^\s*\|.*\|\s*$/m.test(texto) && /^#+.*\b(medidas|escala|tabela|cotas)\b/im.test(texto);
  if (!tabela) falta.push('a tabela de medidas (seção de medidas ou escala com tabela)');
  if (!/^#+.*\bpartes\b/im.test(texto)) falta.push('a seção das partes');
  return { feito: falta.length === 0, falta };
}

/** As referências: imagens, contornos e prancha na pasta delas. */
export function lerReferencias(pasta) {
  const refs = pastaDasReferencias(pasta);
  const nomes = ordenados(refs);
  const imagens = nomes.filter((n) => IMAGEM.test(n));
  const contornos = nomes.filter((n) => /\.contornos\.json$/.test(n));
  const pranchas = nomes.filter((n) => /prancha/i.test(n));
  const feito = imagens.length + contornos.length + pranchas.length > 0;
  return { feito, pasta: relative(pasta, refs) || '.', imagens: imagens.length, contornos: contornos.length, pranchas: pranchas.length, falta: feito ? [] : ['imagem, contorno ou prancha em referencias/'] };
}

/** O rascunho e a conferência de cada um: `X.esboco.mjs|json` com `X.conferir.json` ao lado. */
export function lerRascunho(pasta) {
  const refs = pastaDasReferencias(pasta);
  const nomes = ordenados(refs);
  const esbocos = nomes.filter((n) => /\.esboco\.(mjs|json)$/.test(n));
  const conferencias = new Set(nomes.filter((n) => /\.conferir\.json$/.test(n)).map((n) => n.replace(/\.conferir\.json$/, '')));
  const semConferencia = esbocos.filter((n) => !conferencias.has(n.replace(/\.esboco\.(mjs|json)$/, '')));
  const falta = [];
  if (esbocos.length === 0) falta.push('o rascunho (referencias/<nome>.esboco.mjs ou .esboco.json)');
  else if (conferencias.size === 0) falta.push('a conferência do rascunho (referencias/<nome>.conferir.json, para npm run conferir:vistas)');
  return { feito: falta.length === 0, esbocos, conferencias: [...conferencias], semConferencia, falta };
}

/** As peças do objeto: `partes/<peça>/receita.js`, as que a montagem cita sem receita, ou a receita única da pasta. */
export function pecasDoObjeto(pasta, montagem = null) {
  const objeto = basename(pasta);
  const pecas = new Map();
  for (const nome of ordenados(join(pasta, 'partes'))) {
    const dir = join(pasta, 'partes', nome);
    if (!ehPasta(dir)) continue;
    pecas.set(nome, { nome, ref: `${objeto}/${nome}`, dir, receita: existsSync(join(dir, 'receita.js')) ? join(dir, 'receita.js') : null });
  }
  for (const i of montagem?.instancias ?? []) {
    if (i?.alvo?.tipo !== 'peca' || typeof i.alvo.ref !== 'string') continue;
    const nome = i.alvo.ref.split('/').pop();
    if (!pecas.has(nome) && i.alvo.ref.startsWith(`${objeto}/`)) pecas.set(nome, { nome, ref: i.alvo.ref, dir: join(pasta, 'partes', nome), receita: null });
  }
  if (pecas.size === 0 && existsSync(join(pasta, 'receita.js'))) {
    pecas.set(objeto, { nome: objeto, ref: objeto, dir: pasta, receita: join(pasta, 'receita.js') });
  }
  return [...pecas.values()];
}

/**
 * A ação da peça sem medir: a de `acaoDaReceita` sobre as rodadas gravadas, com a medição da última rodada quando o texto da receita é
 * o mesmo que ela julgou, e presumida aprovada quando o texto mudou (`medida: false` diz isso). A mesma forma com texto novo não é
 * reconhecida aqui (pede executar a receita), e sai como `revisar`.
 */
export function acaoSemMedir(rodadas, textoDaReceita, { limite } = {}) {
  const sha256 = sha(textoDaReceita);
  const ultima = rodadas.at(-1);
  const mesmoTexto = Boolean(ultima?.receita?.sha256) && ultima.receita.sha256 === sha256;
  const medicao = mesmoTexto ? { passou: ultima.medidas.passou, relatorio: ultima.medidas.relatorio } : { passou: true, relatorio: 'presumida' };
  return { ...acaoDaReceita(rodadas, { sha256, medicao }, { limite }), medida: mesmoTexto, mesmoTexto };
}

/** As etapas da montagem, na ordem dela, com o estado do registro (`aberta` quando o registro não a tem) e a próxima, por `proximaEtapa`. */
export function lerEtapas(pasta) {
  const arquivo = join(pasta, 'montagem.json');
  const montagem = lerJson(arquivo);
  if (!montagem) return null;
  const registro = lerJson(join(pasta, 'montagem.etapas.json'));
  const estado = new Map((registro?.etapas ?? []).map((e) => [e.instancia, e.estado]));
  const etapas = (Array.isArray(montagem.etapas) ? montagem.etapas : []).map((instancia) => ({ instancia, estado: estado.get(instancia) ?? 'aberta' }));
  const proxima = proximaEtapa({ etapas });
  return {
    arquivo, montagem, etapas, proxima: proxima?.instancia ?? null,
    fixas: etapas.filter((e) => e.estado === 'fixa').map((e) => e.instancia),
    abertas: etapas.filter((e) => e.estado !== 'fixa').map((e) => e.instancia),
    registro: Boolean(registro),
  };
}

const rel = (p) => relative(REPO, p) || '.';
const comandoRegistrar = (ref) => `node tools/modelar/rodada-de-modelagem.mjs ${ref} --registrar --modelador <arquivo do modelador> --critico <arquivo do crítico>`;

/* O próximo comando de uma peça, pela ação dela e pelo estado das etapas dela. */
function proximoDaPeca(p, etapas) {
  const montagemRel = etapas ? rel(etapas.arquivo) : null;
  if (p.estado === 'fixa') return null;
  if (!p.receita) return `despachar o modelador (skill criar-peca) para ${p.ref}, com o PLANO do ALINHAMENTO.md`;
  if (p.acao === 'modelar') {
    const defeitos = p.defeitos.length ? `com os defeitos em aberto: ${p.defeitos.join('; ')}` : 'com o motivo acima';
    return `despachar o modelador (skill criar-peca) para ${p.ref}, ${defeitos}; depois registrar sem crítico: node tools/modelar/rodada-de-modelagem.mjs ${p.ref} --registrar --modelador <arquivo>`;
  }
  if (p.acao === 'revisar') return `npm run vistas:critica -- ${p.ref}, despachar o crítico com o pedido.md e registrar: ${comandoRegistrar(p.ref)}`;
  const instancias = p.instancias.filter((i) => etapas?.abertas.includes(i));
  if (!etapas || instancias.length === 0) {
    const fora = etapas && p.instancias.length === 0 ? `; a montagem ${montagemRel} não cita a peça` : '';
    if (p.acao === 'parar-fechou') return fora ? `pôr a peça em ${montagemRel}, nas instâncias e nas etapas${fora}` : null;
    return `decisão da pessoa (${p.acao}): estender o limite em rodadas/limite.json ou aceitar a peça como está${fora}`;
  }
  const fixar = `npm run etapas -- ${montagemRel} --fixar ${instancias[0]} --por "<quem aceitou, data>"`;
  const ordem = etapas.proxima && etapas.proxima !== instancias[0] ? ` (em ordem: antes, a etapa ${etapas.proxima})` : '';
  if (p.acao === 'parar-fechou') return `fixar: ${fixar}${ordem}`;
  return `decisão da pessoa (${p.acao}): fixar com ${fixar} --aceite-humano${ordem}, ou estender o limite em rodadas/limite.json`;
}

/**
 * O fluxo do objeto: o estado de cada passo, as peças com a ação e o próximo comando, as etapas e o passo em que o objeto está.
 * `medir(ref)` mede uma peça de verdade (a `acaoDaPeca` de `--acao`); sem ele a ação sai de `acaoSemMedir`.
 */
export async function fluxoDoObjeto(pastaDoObjeto, { medir = null } = {}) {
  const pasta = resolve(pastaDoObjeto);
  if (!ehPasta(pasta)) throw new Error(`${pastaDoObjeto}: não é pasta de objeto.`);
  const objeto = basename(pasta);
  const alinhamento = lerAlinhamento(pasta);
  const referencias = lerReferencias(pasta);
  const rascunho = lerRascunho(pasta);
  const etapas = lerEtapas(pasta);
  const estadoDaInstancia = new Map((etapas?.etapas ?? []).map((e) => [e.instancia, e.estado]));
  const pecas = [];
  for (const p of pecasDoObjeto(pasta, etapas?.montagem)) {
    const instancias = (etapas?.montagem.instancias ?? []).filter((i) => i?.alvo?.ref === p.ref || i?.alvo?.ref?.split('/').pop() === p.nome).map((i) => i.id)
      .filter((id) => estadoDaInstancia.has(id));
    const fixa = instancias.length > 0 && instancias.every((i) => estadoDaInstancia.get(i) === 'fixa');
    const pastaRodadas = join(p.dir, 'rodadas');
    const rodadas = lerRodadas(p.ref, { pasta: pastaRodadas });
    const linha = { peca: p.nome, ref: p.ref, receita: p.receita ? rel(p.receita) : null, rodadas: rodadas.length, instancias };
    if (fixa) Object.assign(linha, { estado: 'fixa', acao: null, motivo: 'todas as etapas da peça estão fixas.', defeitos: [] });
    else if (!p.receita) Object.assign(linha, { estado: 'sem receita', acao: 'modelar', motivo: 'a peça não tem receita.', defeitos: [] });
    else {
      const limite = limiteDaPeca(p.ref, { pasta: pastaRodadas });
      const d = medir ? { ...(await medir(p.ref, { rodadas, limite, pasta: pastaRodadas })), medida: true }
        : acaoSemMedir(rodadas, readFileSync(p.receita, 'utf8'), { limite });
      const abertos = defeitosAbertos(rodadas).map((x) => `${x.parte}: ${x.tipo} ${x.sentido} em ${x.onde}`);
      Object.assign(linha, { estado: 'em aberto', acao: d.acao, motivo: d.motivo, medida: d.medida, defeitos: d.acao === 'modelar' ? abertos : [] });
    }
    linha.proximo = proximoDaPeca({ ...p, ...linha }, etapas);
    pecas.push(linha);
  }
  const comReceita = pecas.some((p) => p.receita);
  const noLaco = pecas.filter((p) => p.acao === 'modelar' || p.acao === 'revisar');
  const receitasFeitas = comReceita && noLaco.length === 0;
  const montagemFeita = etapas ? etapas.etapas.length > 0 && etapas.abertas.length === 0 : pecas.length === 1;
  const pendentes = pecas.filter((p) => p.proximo !== null);
  const passos = [
    { nome: 'alinhamento', ...alinhamento },
    { nome: 'referencias', ...referencias },
    { nome: 'rascunho', ...rascunho },
    {
      nome: 'receitas', feito: receitasFeitas,
      falta: comReceita ? noLaco.map((p) => `${p.peca} (${p.receita ? p.acao : 'sem receita'})`) : ['as receitas (partes/<peça>/receita.js ou receita.js)'],
    },
    {
      nome: 'montagem', feito: montagemFeita,
      falta: etapas ? etapas.abertas.map((i) => `a etapa ${i} (${estadoDaInstancia.get(i)})`) : pecas.length > 1 ? ['montagem.json'] : [],
      ...(etapas ? { arquivo: rel(etapas.arquivo), fixas: etapas.fixas.length, abertas: etapas.abertas, proxima: etapas.proxima }
        : { arquivo: null, nota: pecas.length === 1 ? 'peça única, sem montagem' : null }),
    },
  ];
  const fechado = receitasFeitas && montagemFeita && pendentes.length === 0;
  passos.push({ nome: 'fechamento', feito: fechado, falta: pendentes.map((p) => `${p.peca} (${p.acao ?? p.estado})`) });
  /* com receita, os passos 1 a 3 não prendem: o que falta deles sai como falta */
  const inicio = comReceita ? 3 : 0;
  const indice = fechado ? 5 : passos.findIndex((s, i) => i >= inicio && !s.feito);
  const atual = indice < 0 ? 5 : indice;
  const comandos = comandosDoPasso(atual, { pasta, rascunho, etapas, pecas });
  return {
    formato: 'modelar.fluxo-do-objeto', versao: 1, objeto, pasta: rel(pasta),
    passo: { numero: atual + 1, nome: PASSOS[atual] },
    passos: passos.map((s, i) => ({ numero: i + 1, ...s })),
    pecas,
    comandos,
  };
}

function comandosDoPasso(atual, { pasta, rascunho, etapas, pecas }) {
  const p = rel(pasta);
  switch (PASSOS[atual]) {
    case 'alinhamento': return ['conduzir o alinhamento com a pessoa (skill alinhar-modelagem) e escrever ALINHAMENTO.md com a tabela de medidas e as partes'];
    case 'referencias': return [`pôr as imagens em ${p}/referencias/ e tirar os contornos (skill contorno-da-imagem; npm run contorno)`];
    case 'rascunho': return rascunho.esbocos.length
      ? rascunho.semConferencia.map((e) => `npm run conferir:vistas -- ${p}/referencias/${e} --config=${p}/referencias/${e.replace(/\.esboco\.(mjs|json)$/, '')}.conferir.json --saida=<pasta>`)
      : ['escrever o rascunho em referencias/<nome>.esboco.mjs (skill esbocar-opcoes) e a config de conferência em <nome>.conferir.json'];
    case 'receitas': case 'montagem': {
      const daPeca = pecas.filter((x) => x.proximo).map((x) => x.proximo);
      if (daPeca.length) return daPeca;
      if (pecas.length === 0) return [`despachar o modelador (skill criar-peca) com o PLANO do ALINHAMENTO.md, para ${p}/partes/<peça>/receita.js`];
      if (!etapas) return [`escrever ${p}/montagem.json com as instâncias e as etapas (skill auditar-montagem)`];
      return [`npm run etapas -- ${rel(etapas.arquivo)}`];
    }
    default: return [
      ...pecas.filter((x) => x.proximo).map((x) => x.proximo),
      ...(etapas ? [`npm run etapas -- ${rel(etapas.arquivo)} --auditar`] : []),
      ...(pecas.some((x) => x.rodadas > 0) ? [`npm run custo:peca -- ${p}`] : []),
    ];
  }
}

/** O fluxo em texto curto: o passo, o que falta, as peças em aberto com o próximo comando, e os comandos do passo. */
export function emTexto(f) {
  const linhas = [`objeto ${f.objeto} (${f.pasta}): passo ${f.passo.numero} de 6, ${f.passo.nome}`];
  for (const s of f.passos) {
    const extra = s.nome === 'montagem' && s.arquivo ? ` (${s.fixas} fixa(s), ${s.abertas.length} aberta(s)${s.proxima ? `, próxima ${s.proxima}` : ''})`
      : s.nota ? ` (${s.nota})` : '';
    linhas.push(`  ${s.numero}. ${s.nome}: ${s.feito ? 'feito' : `falta ${s.falta.join('; ') || '—'}`}${extra}`);
  }
  const abertas = f.pecas.filter((p) => p.estado !== 'fixa');
  const fixas = f.pecas.length - abertas.length;
  linhas.push(`peças: ${f.pecas.length}, ${fixas} fixa(s)${abertas.length ? `, ${abertas.length} em aberto:` : ''}`);
  for (const p of abertas) {
    linhas.push(`  ${p.peca}: ${p.acao ?? p.estado}${p.medida === false ? ' (sem medir; confirme com --acao)' : ''} — ${p.motivo}`);
    if (p.proximo) linhas.push(`    próximo: ${p.proximo}`);
  }
  linhas.push(f.comandos.length ? `agora:\n${f.comandos.map((c) => `  ${c}`).join('\n')}` : 'agora: nada a rodar.');
  return linhas.join('\n');
}

/** A linha de comando: devolve `{ codigo, texto }` sem sair do processo. */
export async function rodar(args) {
  const posicionais = args.filter((a) => !a.startsWith('--'));
  const opcoes = args.filter((a) => a.startsWith('--'));
  const desconhecida = opcoes.find((o) => o !== '--json' && o !== '--medir');
  if (posicionais.length !== 1 || desconhecida) {
    return { codigo: 2, texto: `uso: fluxo-do-objeto.mjs <pasta do objeto ou nome> [--json] [--medir]${desconhecida ? ` (opção desconhecida: ${desconhecida})` : ''}` };
  }
  const alvo = posicionais[0];
  const pasta = ehPasta(alvo) ? alvo : ehPasta(join(ACERVO, alvo)) ? join(ACERVO, alvo) : alvo;
  const medir = opcoes.includes('--medir') ? (ref, opcoesDaPeca) => acaoDaPeca(ref, opcoesDaPeca) : null;
  let fluxo;
  try { fluxo = await fluxoDoObjeto(pasta, { medir }); } catch (erro) { return { codigo: 2, texto: `fluxo-do-objeto: ${erro.message}` }; }
  return { codigo: 0, texto: opcoes.includes('--json') ? JSON.stringify(fluxo, null, 2) : emTexto(fluxo) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { codigo, texto } = await rodar(process.argv.slice(2));
  (codigo === 0 ? console.log : console.error)(texto);
  process.exitCode = codigo;
}
