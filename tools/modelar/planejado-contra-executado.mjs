#!/usr/bin/env node
/* planejado-contra-executado.mjs — a régua que cruza o andaime N2 com a montagem v5 executada.
 *
 * O andaime (`mecanifica.andaime-global@2`) é o planejado: um volume por parte e, se declaradas, as portas das juntas. A montagem v5
 * com etapas é o executado: cada instância resolvida, com a posição que as portas deram. Esta régua compara os dois no quadro do
 * conjunto, sem conhecer objeto algum:
 *
 *   - a caixa executada de cada parte contra a caixa do volume que ela refina, nos dois sentidos. `parte-maior-que-o-volume` é a parte
 *     que passa do volume em algum lado (o que a conferência por receita já acusa); `parte-menor-que-o-volume` é a parte que fica
 *     aquém dele em algum lado (o que aquela conferência não acusa, porque o envelope é só um limite superior);
 *   - cada porta do andaime contra a posição e a direção que a peça executada publica no conjunto (`porta-fora-do-lugar`);
 *   - o volume que nenhuma parte da montagem refina (`volume-sem-parte`, a parte esquecida) e a peça ou parte executada que nenhum
 *     volume cobre (`parte-sem-volume`).
 *
 * O volume cuja instância ainda não tem receita executável (nenhum passo, ou etapa depois da primeira sem passo) fica `pendente` e
 * não reprova: a montagem se constrói uma parte por vez, e a régua roda a cada rodada.
 *
 * QUAL VOLUME É DE QUAL INSTÂNCIA. Primeiro o `mapa` explícito (`volumes`: `"instancia"` ou `"instancia.parte"` para o id do volume;
 * `portas`: id da porta do andaime para `"instancia.porta"`). Depois, a receita que declara `REFINA.partes` (parte para volume, e as
 * partes de `REFINA.novas` ficam fora). Por último o nome: a instância `proximalIndicador` refina o volume `proximal-indicador`, e uma
 * porta que só uma instância publica com o mesmo id é a dela.
 *
 * A caixa executada é a dos vértices da parte (ou da instância inteira, sem `REFINA`) levados ao conjunto pela pose de mundo; o
 * volume tem a caixa alinhada aos eixos da malha que a blocagem compilaria para ele, a mesma que `refinamento-global` usa. A porta
 * confere só o centro e a direção (eixo ou normal); o curso e as medidas da forma são da `articulacao` e do `refinamento-global`.
 *
 * Uso:
 *   node tools/modelar/planejado-contra-executado.mjs --montagem=<montagem.json> [--andaime=<andaime.json>] [--mapa=<mapa.json>]
 *     [--tolerancia=2] [--tolerancia-porta=0.5] [--json]
 *
 * Sem `--andaime`, o `andaime.json` da pasta da montagem. Sai com 1 se algum volume ou porta reprova; pendente não reprova. */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { envelopesDosVolumes, normalizarAndaimeGlobal } from '../../src/autoria/forma-global.js';
import { normalizarRefinamentoGlobal } from '../../src/autoria/refinamento-global.js';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { interfaceNoMundo } from '../../src/autoria/posicao-por-porta.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';
import { montagemAteAGeometria, receitasDaMontagem } from './etapas-da-montagem.mjs';

export const TOLERANCIA_DA_CAIXA_MM = 2;
export const TOLERANCIA_DA_PORTA_MM = 0.5;
/* A direção é comparada como vetor unitário, como em `refinamento-global`: 1e-3 é cerca de 0,06 grau. */
export const TOLERANCIA_DE_DIRECAO = 1e-3;
const LIMITE_DA_TOLERANCIA_MM = 50;
const EIXOS = ['x', 'y', 'z'];
const MM = 1000;

const num = (v) => Number(v.toFixed(3));
const vetor = (v) => `[${v.map(num).join(', ')}]`;
const emKebab = (id) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export class ErroDaReguaPlanejadoExecutado extends Error {
  constructor(recebido, esperado, comando) {
    super(`recebi ${recebido}; esperava ${esperado}.\n  conserte com: ${comando}`);
    this.name = 'ErroDaReguaPlanejadoExecutado';
  }
}

function posicaoDoMapa(mapa) {
  if (mapa === undefined || mapa === null) return { volumes: {}, portas: {} };
  const exemplo = '{"volumes": {"proximalIndicador": "proximal-indicador"}, "portas": {"ombro-flexao": "ombro.flexao"}}';
  if (typeof mapa !== 'object' || Array.isArray(mapa)) {
    throw new ErroDaReguaPlanejadoExecutado(`o mapa ${JSON.stringify(mapa)}`, 'um objeto com "volumes" e "portas"', `escreva o mapa como ${exemplo}`);
  }
  const extras = Object.keys(mapa).filter((k) => k !== 'volumes' && k !== 'portas');
  if (extras.length) throw new ErroDaReguaPlanejadoExecutado(`a chave '${extras[0]}' no mapa`, 'só "volumes" e "portas"', `escreva o mapa como ${exemplo}`);
  for (const campo of ['volumes', 'portas']) {
    const v = mapa[campo] ?? {};
    if (typeof v !== 'object' || Array.isArray(v) || Object.values(v).some((x) => typeof x !== 'string')) {
      throw new ErroDaReguaPlanejadoExecutado(`mapa.${campo} = ${JSON.stringify(v)}`, 'objeto de texto para texto', `escreva o mapa como ${exemplo}`);
    }
  }
  return { volumes: mapa.volumes ?? {}, portas: mapa.portas ?? {} };
}

function tolerancia(valor, nome, padrao) {
  const v = valor ?? padrao;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > LIMITE_DA_TOLERANCIA_MM) {
    throw new ErroDaReguaPlanejadoExecutado(`${nome}=${JSON.stringify(valor)}`, `número de 0 a ${LIMITE_DA_TOLERANCIA_MM} mm`, `passe --${nome}=${padrao}`);
  }
  return v;
}

function aplicar(pose, p) {
  return pose.rotacao.map((linha, i) => linha[0] * p[0] + linha[1] * p[1] + linha[2] * p[2] + pose.deslocamento[i]);
}

/* A caixa, em mm no conjunto, dos vértices da parte (ou de todos, sem `parte`). `null` sem vértice. */
function caixaExecutada(neutro, pose, parte) {
  const vistos = new Set();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const face of neutro.F.values()) {
    if (parte !== undefined && face.parte !== parte) continue;
    for (const v of face.vs) {
      if (vistos.has(v)) continue;
      vistos.add(v);
      const p = neutro.V.get(v);
      if (!p) continue;
      const q = aplicar(pose, p);
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], q[i] * MM); max[i] = Math.max(max[i], q[i] * MM); }
    }
  }
  return vistos.size ? { min, max } : null;
}

const partesDe = (neutro) => [...new Set([...neutro.F.values()].map((f) => f.parte).filter(Boolean))].sort();

function normalizarDirecao(v) {
  const n = Math.hypot(...v);
  return n > 0 ? v.map((x) => x / n) : v;
}

/* Um desvio por lado, em mm: `maior` é quanto a parte passa do volume, `menor` quanto fica aquém dele. */
function desviosDaCaixa(executada, planejada) {
  return EIXOS.flatMap((eixo, i) => [
    { lado: `-${eixo}`, maior: planejada.min[i] - executada.min[i], menor: executada.min[i] - planejada.min[i], executada: executada.min[i], planejada: planejada.min[i] },
    { lado: `+${eixo}`, maior: executada.max[i] - planejada.max[i], menor: planejada.max[i] - executada.max[i], executada: executada.max[i], planejada: planejada.max[i] },
  ]);
}

/**
 * Cruza o andaime com a montagem executada.
 *
 * `montagem` é o JSON da montagem v5 com `etapas`, `andaime` o JSON do andaime N2, `receitas` o mapa ref para receita (o que
 * `receitasDaMontagem` devolve) e `mapa` o mapa explícito opcional. Devolve `{ ok, volumes, portas, partesSemVolume, achados, resumo }`.
 */
export async function medirPlanejadoContraExecutado({
  montagem: dado, andaime: andaimeBruto, receitas, mapa: mapaBruto, tolerancia: tolCaixa, toleranciaPorta: tolPorta,
}) {
  const tol = tolerancia(tolCaixa, 'tolerancia', TOLERANCIA_DA_CAIXA_MM);
  const tolP = tolerancia(tolPorta, 'tolerancia-porta', TOLERANCIA_DA_PORTA_MM);
  const mapa = posicaoDoMapa(mapaBruto);
  const montagem = lerMontagemPersistida(dado);
  if (!montagem.etapas?.length) {
    throw new ErroDaReguaPlanejadoExecutado(`a montagem '${montagem.id}' sem "etapas"`, 'uma montagem v5 com a ordem de construção em "etapas"', `declare "etapas" na montagem (ver CONTRATO-DE-MONTAGEM) e rode npm run etapas -- <montagem>`);
  }
  const andaime = normalizarAndaimeGlobal(andaimeBruto);
  const caixasPlanejadas = envelopesDosVolumes(andaime);
  const idsDeVolume = new Set(andaime.volumes.map((v) => v.id));

  const { dado: parcial, construidas } = montagemAteAGeometria(dado, montagem, receitas);
  const resolvida = construidas.length ? await resolverMontagemPersistida(parcial, carregadoresDeReceitas(receitas)) : null;
  const construida = new Set(construidas);
  const noConjunto = new Map((resolvida?.instancias ?? []).map((i) => [i.id, i]));

  /* as ligações volume -> (instância, parte) */
  const ligacoes = [];
  const achados = [];
  const partesSemVolume = [];
  const volumesCitados = new Set();
  const ligar = (instancia, parte, volume, origem) => {
    if (!idsDeVolume.has(volume)) {
      achados.push({ codigo: 'volume-desconhecido', instancia, parte, volume, mensagem: `${origem} liga '${instancia}${parte ? `.${parte}` : ''}' ao volume '${volume}', que o andaime não tem.` });
      return;
    }
    ligacoes.push({ instancia, parte, volume });
    volumesCitados.add(volume);
  };
  for (const alvo of Object.keys(mapa.volumes)) {
    const [inst] = alvo.split('.');
    if (!montagem.instancias.some((i) => i.id === inst)) {
      achados.push({ codigo: 'mapa-com-instancia-desconhecida', instancia: inst, mensagem: `o mapa cita a instância '${inst}', que a montagem '${montagem.id}' não tem.` });
    }
  }
  for (const instancia of montagem.instancias) {
    if (instancia.alvo.tipo !== 'peca') {
      achados.push({ codigo: 'submontagem-nao-medida', instancia: instancia.id, mensagem: `a instância '${instancia.id}' é uma submontagem, e esta régua mede só peças do primeiro nível.`, aviso: true });
      continue;
    }
    const receita = receitas[instancia.alvo.ref];
    const doMapaInteira = mapa.volumes[instancia.id];
    const doMapaPorParte = Object.entries(mapa.volumes).filter(([k]) => k.startsWith(`${instancia.id}.`));
    let refinamento = null;
    try { refinamento = receita?.REFINA ? normalizarRefinamentoGlobal(receita.REFINA) : null; } catch (erro) {
      throw new ErroDaReguaPlanejadoExecutado(`REFINA inválido em '${instancia.alvo.ref}' (${erro.message})`, 'uma declaração REFINA válida', `corrija o REFINA da receita e rode npm run descrever -- ${instancia.alvo.ref}`);
    }
    if (doMapaInteira) ligar(instancia.id, undefined, doMapaInteira, 'o mapa');
    else if (doMapaPorParte.length) for (const [k, v] of doMapaPorParte) ligar(instancia.id, k.slice(instancia.id.length + 1), v, 'o mapa');
    else if (refinamento) for (const { parte, volume } of refinamento.partes) ligar(instancia.id, parte, volume, `REFINA.partes de '${instancia.alvo.ref}'`);
    else if (idsDeVolume.has(emKebab(instancia.id))) ligar(instancia.id, undefined, emKebab(instancia.id), 'o nome');
    else if (construida.has(instancia.id)) {
      partesSemVolume.push({ instancia: instancia.id });
      achados.push({ codigo: 'parte-sem-volume', instancia: instancia.id, mensagem: `a instância '${instancia.id}' (${instancia.alvo.ref}) foi executada e nenhum volume do andaime a refina: declare REFINA.partes na receita, ponha-a no mapa, ou acrescente o volume ao andaime.` });
    }
    /* a parte que a receita entrega e que nem `partes` nem `novas` citam */
    if (refinamento && construida.has(instancia.id)) {
      const cobertas = new Set([...refinamento.partes.map((p) => p.parte), ...(refinamento.novas ?? []).map((p) => p.parte), ...(refinamento.esboco?.formas ?? []).map((p) => p.parte)]);
      for (const parte of partesDe(noConjunto.get(instancia.id).definicao.neutro)) {
        if (!cobertas.has(parte) && !doMapaInteira) {
          partesSemVolume.push({ instancia: instancia.id, parte });
          achados.push({ codigo: 'parte-sem-volume', instancia: instancia.id, parte, mensagem: `a parte '${parte}' da instância '${instancia.id}' foi executada e REFINA não a liga a volume (nem a declara em 'novas').` });
        }
      }
    }
  }

  /* os volumes */
  const volumes = [];
  for (const volume of andaime.volumes) {
    const dele = ligacoes.filter((l) => l.volume === volume.id);
    if (!dele.length) {
      volumes.push({ volume: volume.id, estado: 'sem-parte', planejada: caixasPlanejadas[volume.id] });
      achados.push({ codigo: 'volume-sem-parte', volume: volume.id, mensagem: `o volume '${volume.id}' do andaime não é refinado por nenhuma parte da montagem '${montagem.id}' (parte esquecida): acrescente a instância, declare REFINA.partes ou ponha-o no mapa.` });
      continue;
    }
    for (const { instancia, parte } of dele) {
      const quem = parte ? `${instancia}.${parte}` : instancia;
      const planejada = caixasPlanejadas[volume.id];
      if (!construida.has(instancia)) {
        volumes.push({ volume: volume.id, instancia, ...(parte ? { parte } : {}), estado: 'pendente', planejada });
        continue;
      }
      const executada = caixaExecutada(noConjunto.get(instancia).definicao.neutro, noConjunto.get(instancia).poseMundo, parte);
      if (!executada) {
        volumes.push({ volume: volume.id, instancia, ...(parte ? { parte } : {}), estado: 'reprovado', planejada });
        achados.push({ codigo: 'parte-sem-geometria', volume: volume.id, instancia, ...(parte ? { parte } : {}), mensagem: `'${quem}' está ligada ao volume '${volume.id}' e a peça executada não entrega geometria dela.` });
        continue;
      }
      const desvios = desviosDaCaixa(executada, planejada);
      const proprios = [];
      for (const d of desvios) {
        if (d.maior > tol) proprios.push({ codigo: 'parte-maior-que-o-volume', lado: d.lado, desvioMm: num(d.maior), mensagem: `'${quem}' passa do volume '${volume.id}' em ${d.lado} por ${num(d.maior)} mm (executada ${num(d.executada)}, planejada ${num(d.planejada)}, tolerância ${tol} mm).` });
        if (d.menor > tol) proprios.push({ codigo: 'parte-menor-que-o-volume', lado: d.lado, desvioMm: num(d.menor), mensagem: `'${quem}' fica aquém do volume '${volume.id}' em ${d.lado} por ${num(d.menor)} mm (executada ${num(d.executada)}, planejada ${num(d.planejada)}, tolerância ${tol} mm).` });
      }
      for (const p of proprios) achados.push({ ...p, volume: volume.id, instancia, ...(parte ? { parte } : {}) });
      volumes.push({
        volume: volume.id, instancia, ...(parte ? { parte } : {}), estado: proprios.length ? 'reprovado' : 'confere',
        planejada, executada: { min: executada.min.map(num), max: executada.max.map(num) },
        desvioMaximoMm: num(Math.max(...desvios.map((d) => Math.max(d.maior, d.menor, 0)))),
      });
    }
  }

  /* as portas */
  const portas = [];
  for (const porta of andaime.portas ?? []) {
    const ref = mapa.portas[porta.id];
    let donos;
    if (ref) {
      const [inst, nome] = [ref.slice(0, ref.indexOf('.')), ref.slice(ref.indexOf('.') + 1)];
      if (ref.indexOf('.') < 0 || !montagem.instancias.some((i) => i.id === inst)) {
        achados.push({ codigo: 'mapa-com-instancia-desconhecida', porta: porta.id, mensagem: `o mapa liga a porta '${porta.id}' a '${ref}', e a montagem '${montagem.id}' não tem a instância '${inst}'.` });
        portas.push({ porta: porta.id, estado: 'reprovada' });
        continue;
      }
      donos = [{ instancia: inst, nome }];
    } else {
      donos = [...noConjunto.values()].filter((i) => i.definicao.neutro.portas.has(porta.id)).map((i) => ({ instancia: i.id, nome: porta.id }));
      if (donos.length > 1) {
        throw new ErroDaReguaPlanejadoExecutado(`a porta '${porta.id}' publicada por ${donos.map((d) => `'${d.instancia}'`).join(', ')}`, 'uma só instância dona da porta do andaime', `ponha {"portas": {"${porta.id}": "<instância>.${porta.id}"}} no mapa e passe --mapa=<arquivo>`);
      }
    }
    if (!donos.length) {
      const sobra = montagem.etapas.some((id) => !construida.has(id));
      if (sobra) { portas.push({ porta: porta.id, estado: 'pendente' }); continue; }
      portas.push({ porta: porta.id, estado: 'reprovada' });
      achados.push({ codigo: 'porta-ausente', porta: porta.id, mensagem: `a porta '${porta.id}' do andaime não é publicada por nenhuma instância executada.` });
      continue;
    }
    const [{ instancia, nome }] = donos;
    if (!construida.has(instancia)) { portas.push({ porta: porta.id, instancia, estado: 'pendente' }); continue; }
    const inst = noConjunto.get(instancia);
    const publicada = inst.definicao.neutro.portas.get(nome);
    if (!publicada?.interface) {
      portas.push({ porta: porta.id, instancia, estado: 'reprovada' });
      achados.push({ codigo: 'porta-ausente', porta: porta.id, instancia, mensagem: `a instância '${instancia}' não publica a porta '${nome}' que o andaime declara como '${porta.id}'.` });
      continue;
    }
    const mundo = interfaceNoMundo(publicada.interface, inst.poseMundo);
    const centro = (mundo.centro ?? mundo.ponto).map((c) => c * MM);
    const esperado = porta.interface.centro ?? porta.interface.ponto;
    const desvio = Math.hypot(...centro.map((c, i) => c - esperado[i]));
    const problemas = [];
    if (desvio > tolP) problemas.push(`centro em ${vetor(centro)} mm, o andaime declara ${vetor(esperado)} (desvio ${num(desvio)} mm, tolerância ${tolP} mm)`);
    let desvioDeDirecao = 0;
    for (const campo of ['eixo', 'normal']) {
      if (!porta.interface[campo] || !mundo[campo]) continue;
      const a = normalizarDirecao(porta.interface[campo]);
      const b = normalizarDirecao(mundo[campo]);
      const d = Math.hypot(...a.map((x, i) => x - b[i]));
      desvioDeDirecao = Math.max(desvioDeDirecao, d);
      if (d > TOLERANCIA_DE_DIRECAO) problemas.push(`${campo} em ${vetor(b)}, o andaime declara ${vetor(a)} (desvio ${Number(d.toFixed(4))}, tolerância ${TOLERANCIA_DE_DIRECAO})`);
    }
    portas.push({
      porta: porta.id, instancia, estado: problemas.length ? 'reprovada' : 'confere',
      desvioMm: num(desvio), desvioDeDirecao: Number(desvioDeDirecao.toFixed(4)),
    });
    if (problemas.length) achados.push({ codigo: 'porta-fora-do-lugar', porta: porta.id, instancia, desvioMm: num(desvio), mensagem: `a porta '${porta.id}' (${instancia}.${nome}) não está onde o andaime a declarou: ${problemas.join('; ')}.` });
  }

  const contar = (lista, estado) => lista.filter((x) => x.estado === estado).length;
  const reprovados = achados.filter((a) => !a.aviso);
  return {
    ok: reprovados.length === 0,
    montagem: montagem.id,
    andaime: andaime.id,
    tolerancia: { caixaMm: tol, portaMm: tolP },
    volumes,
    portas,
    partesSemVolume,
    achados,
    resumo: {
      volumes: andaime.volumes.length,
      confere: contar(volumes, 'confere'),
      reprovados: contar(volumes, 'reprovado'),
      pendentes: contar(volumes, 'pendente'),
      semParte: contar(volumes, 'sem-parte'),
      portas: portas.length,
      portasConferem: contar(portas, 'confere'),
      portasReprovadas: contar(portas, 'reprovada'),
      portasPendentes: contar(portas, 'pendente'),
      partesSemVolume: partesSemVolume.length,
    },
  };
}

export function textoDoRelatorio(r) {
  const s = r.resumo;
  const linhas = [
    `PLANEJADO CONTRA EXECUTADO — montagem '${r.montagem}', andaime '${r.andaime}' (tolerância ${r.tolerancia.caixaMm} mm na caixa, ${r.tolerancia.portaMm} mm na porta)`,
    `volumes: ${s.volumes}; conferem ${s.confere}, reprovados ${s.reprovados}, pendentes ${s.pendentes}, sem parte ${s.semParte}; partes sem volume ${s.partesSemVolume}`,
  ];
  if (s.portas) linhas.push(`portas: ${s.portas}; conferem ${s.portasConferem}, reprovadas ${s.portasReprovadas}, pendentes ${s.portasPendentes}`);
  for (const v of r.volumes) {
    const quem = v.instancia ? `${v.instancia}${v.parte ? `.${v.parte}` : ''}` : '-';
    const medida = v.desvioMaximoMm !== undefined ? ` (desvio máximo ${v.desvioMaximoMm} mm)` : '';
    linhas.push(`  ${v.estado.padEnd(9)} ${v.volume} <- ${quem}${medida}`);
  }
  for (const p of r.portas) linhas.push(`  porta ${p.estado.padEnd(9)} ${p.porta}${p.instancia ? ` <- ${p.instancia}` : ''}${p.desvioMm !== undefined ? ` (desvio ${p.desvioMm} mm)` : ''}`);
  if (r.achados.length) {
    linhas.push('ACHADOS:');
    for (const a of r.achados) linhas.push(`  ${a.aviso ? 'aviso' : a.codigo}: ${a.mensagem}`);
  }
  linhas.push(r.ok ? (s.pendentes || s.portasPendentes ? `OK: nada reprova; ${s.pendentes} volume(s) e ${s.portasPendentes} porta(s) pendentes, sem receita executável.` : 'OK: o executado confere com o planejado.') : `REPROVADO: ${r.achados.filter((a) => !a.aviso).length} achado(s).`);
  return `${linhas.join('\n')}\n`;
}

const AJUDA = `Uso: node tools/modelar/planejado-contra-executado.mjs --montagem=<montagem.json> [opções]

Compara o andaime N2 (o planejado) com a montagem v5 executada: a caixa de cada parte contra a do volume, nos dois sentidos, as
portas de junta contra a posição publicada, o volume sem parte e a parte sem volume. Volume sem receita executável fica pendente e
não reprova. Sai com 1 se algo reprova.

Opções (sempre com '='):
  --montagem=<arquivo>         montagem v5 com "etapas" (obrigatória)
  --andaime=<arquivo>          andaime N2; padrão: andaime.json ao lado da montagem
  --mapa=<arquivo>             {"volumes": {"instancia" ou "instancia.parte": "volume"}, "portas": {"porta": "instancia.porta"}}
  --tolerancia=<mm>            folga da caixa, nos dois sentidos (padrão ${TOLERANCIA_DA_CAIXA_MM}, teto ${LIMITE_DA_TOLERANCIA_MM})
  --tolerancia-porta=<mm>      folga do centro da porta (padrão ${TOLERANCIA_DA_PORTA_MM}, teto ${LIMITE_DA_TOLERANCIA_MM})
  --json                       saída em JSON em vez de texto
  --ajuda                      esta mensagem
`;

export async function comoCLI(argv, { escrever = (t) => process.stdout.write(t) } = {}) {
  const args = lerArgumentos(argv, { opcoes: ['montagem', 'andaime', 'mapa', 'tolerancia', 'tolerancia-porta'], bandeiras: ['json', 'ajuda'] });
  if (args.bandeira('ajuda')) { escrever(AJUDA); return 0; }
  const arquivoMontagem = args.opcao('montagem');
  if (!arquivoMontagem) {
    throw new ErroDaReguaPlanejadoExecutado('nenhuma montagem', '--montagem=<montagem.json>', 'node tools/modelar/planejado-contra-executado.mjs --montagem=<montagem.json>');
  }
  const lerJson = (arquivo, nome) => {
    try { return JSON.parse(readFileSync(resolve(arquivo), 'utf8')); } catch (erro) {
      throw new ErroDaReguaPlanejadoExecutado(`${nome} '${arquivo}' ilegível (${erro.message})`, `${nome} em JSON`, `confira o caminho de --${nome}=`);
    }
  };
  const numero = (nome) => { const v = args.opcao(nome); return v === null ? undefined : Number(v); };
  const montagem = lerJson(arquivoMontagem, 'montagem');
  const andaime = lerJson(args.opcao('andaime') ?? resolve(dirname(resolve(arquivoMontagem)), 'andaime.json'), 'andaime');
  const mapa = args.opcao('mapa') ? lerJson(args.opcao('mapa'), 'mapa') : undefined;
  const receitas = await receitasDaMontagem(lerMontagemPersistida(montagem));
  const r = await medirPlanejadoContraExecutado({
    montagem, andaime, receitas, mapa, tolerancia: numero('tolerancia'), toleranciaPorta: numero('tolerancia-porta'),
  });
  escrever(args.bandeira('json') ? `${JSON.stringify(r, null, 2)}\n` : textoDoRelatorio(r));
  return r.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  comoCLI(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`${erro.message}\n`);
    process.exitCode = 2;
  });
}
