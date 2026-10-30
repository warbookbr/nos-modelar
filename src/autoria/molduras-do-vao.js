/* molduras-do-vao.js — a moldura em volta de cada vão que a receita declara, medida sobre a malha.
 *
 * A receita declara em `vaos` a borda de um vão de chapa pelos nomes da gaiola (`bordaDoVao` da gaiola por estações, `linha` da rede) e os
 * frisos que a contornam, pelo nome da linha de cada um. A conferência (`conferirMoldura`, no núcleo) mede, sobre as seções que a
 * varredura de cada friso deixou na chapa, se a faixa dos frisos cobre a borda inteira e se as emendas entre eles têm o mesmo perfil.
 * Este módulo é o adaptador: lê e valida a declaração, acha a borda na malha, chama a conferência e escreve o resultado.
 *
 * A DECLARAÇÃO É CONTRATO, NÃO ESCAPATÓRIA, como `contatos`. Vão declarado com trecho sem moldura reprova; a aba parcial de propósito
 * passa só com `parcial: { motivo }`, e o motivo tem o tamanho mínimo do motivo de um contato. A declaração de parcial que a borda
 * não precisa (a borda está inteira coberta) também reprova, porque descreve o que não existe. Sem `vaos` nada roda.
 *
 *   vaos: [{ nome, borda: [nomes dos pontos, o primeiro repetido no fim na volta fechada], frisos: [nomes das linhas],
 *            parcial?: { motivo }, tolerancia?: metro }]
 *
 * A borda sobre uma chapa com `simetria: 'x'` se confere nas duas metades (a cópia espelhada dos frisos contra a imagem da borda); a
 * borda que toca o plano de simetria, em que o friso passa pela imagem, fica inconclusiva e não passa calada. */
import { cadeiaRefinada, ErroDoFriso } from '../../procedural/nucleo/friso.js';
import { idDoPasso } from '../../procedural/nucleo/nucleo.js';
import { conferirMoldura, TOLERANCIA_DA_MOLDURA } from '../../procedural/nucleo/moldura-do-vao.js';
import { MINIMO_DO_MOTIVO } from './contatos-da-peca.js';

/** Faixa de tolerância que um vão pode declarar para si, em metro. */
export const TOLERANCIA_MINIMA_DO_VAO = 1e-5;
export const TOLERANCIA_MAXIMA_DO_VAO = 5e-3;

const citar = (nome) => `'${nome}'`;
const mm = (m) => (Math.abs(m) === Infinity ? '∞' : (m * 1000).toFixed(1).replace('.', ','));
const ponto = (p) => `(${p.map((x) => (x * 1000).toFixed(1).replace('.', ',')).join(', ')} mm)`;
const lista = (xs) => xs.map(citar).join(', ');

/**
 * Lê e valida `vaos` da receita contra os frisos que o núcleo varreu. Declaração que não casa com nada FALHA nomeando o que existe.
 * Devolve a lista já lida: { nome, borda, frisos, parcial, tolerancia }.
 */
export function lerVaosDeclarados(receita, registros, quem = 'vãos da peça') {
  const bruto = receita?.vaos;
  if (bruto === undefined || bruto === null) return [];
  if (!Array.isArray(bruto)) throw new Error(`${quem}: 'vaos' precisa ser lista de { nome, borda, frisos }.`);
  const disponiveis = [...new Set(registros.map((r) => r.nome))];
  const nomes = new Set();
  return bruto.map((item, indice) => {
    const onde = `${quem}: vaos[${indice}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${onde} precisa ser objeto.`);
    const extras = Object.keys(item).filter((k) => !['nome', 'borda', 'frisos', 'parcial', 'tolerancia'].includes(k));
    if (extras.length) throw new Error(`${onde}: campo desconhecido '${extras[0]}'; aceito 'nome', 'borda', 'frisos', 'parcial' e 'tolerancia'.`);
    const { nome, borda, frisos, parcial, tolerancia } = item;
    if (typeof nome !== 'string' || !nome) throw new Error(`${onde}: 'nome' precisa ser o nome do vão, texto não vazio.`);
    if (nomes.has(nome)) throw new Error(`${onde}: o vão ${citar(nome)} já foi declarado.`);
    nomes.add(nome);
    if (!Array.isArray(borda) || borda.length < 3 || borda.some((n) => typeof n !== 'string' || !n)) {
      throw new Error(`${onde} (${citar(nome)}): 'borda' precisa ser a lista dos nomes de ponto da borda do vão, três ou mais (bordaDoVao da gaiola os dá).`);
    }
    if (!Array.isArray(frisos) || !frisos.length || frisos.some((n) => typeof n !== 'string' || !n)) {
      throw new Error(`${onde} (${citar(nome)}): 'frisos' precisa ser a lista dos nomes de linha dos frisos que contornam o vão.`);
    }
    for (const f of frisos) {
      if (!disponiveis.includes(f)) throw new Error(`${onde} (${citar(nome)}): a peça não tem friso de linha ${citar(f)}. Frisos disponíveis: ${disponiveis.length ? lista(disponiveis) : '(nenhum)'}.`);
    }
    let parcialLida = null;
    if (parcial !== undefined && parcial !== null) {
      if (typeof parcial !== 'object' || Array.isArray(parcial)) throw new Error(`${onde} (${citar(nome)}): 'parcial' precisa ser { motivo }.`);
      const outros = Object.keys(parcial).filter((k) => k !== 'motivo');
      if (outros.length) throw new Error(`${onde} (${citar(nome)}): 'parcial' tem campo desconhecido '${outros[0]}'; aceito só 'motivo'.`);
      if (typeof parcial.motivo !== 'string' || parcial.motivo.trim().length < MINIMO_DO_MOTIVO) {
        throw new Error(`${onde} (${citar(nome)}): 'parcial.motivo' precisa dizer POR QUE a moldura não cobre a borda inteira, com pelo menos ${MINIMO_DO_MOTIVO} caracteres. Motivo curto é declaração que ninguém confere.`);
      }
      parcialLida = { motivo: parcial.motivo.trim() };
    }
    if (tolerancia !== undefined && (!Number.isFinite(tolerancia) || tolerancia < TOLERANCIA_MINIMA_DO_VAO || tolerancia > TOLERANCIA_MAXIMA_DO_VAO)) {
      throw new Error(`${onde} (${citar(nome)}): 'tolerancia' precisa ser um número em metro de ${TOLERANCIA_MINIMA_DO_VAO} a ${TOLERANCIA_MAXIMA_DO_VAO}, recebi ${JSON.stringify(tolerancia)}. Acima disso a moldura não cobre a borda.`);
    }
    return { nome, borda: [...borda], frisos: [...frisos], parcial: parcialLida, tolerancia: tolerancia ?? TOLERANCIA_DA_MOLDURA };
  });
}

/* A borda do vão na malha: a cadeia refinada pela gaiola da chapa, cada ponto com a posição da malha e, nos nomes declarados, o nome. */
export function bordaNaMalha(gaiola, nomes, neutro, onde, espelhada) {
  const fechada = nomes.length > 2 && nomes[0] === nomes[nomes.length - 1];
  const indices = [];
  for (const n of nomes) {
    if (!gaiola.indiceDoNome.has(n)) throw new Error(`${onde}: a borda cita o ponto ${citar(n)}, que não é ponto nomeado da gaiola da chapa.`);
    indices.push(gaiola.indiceDoNome.get(n));
  }
  if (gaiola.simetria === 'x') {
    if (indices.some((k) => gaiola.imagem[k] === k)) return { inconclusivo: 'a borda toca o plano de simetria (simetria x), e o friso que a segue passa pela imagem espelhada: esta conferência ainda não cobre esse caso' };
  }
  const cadeia = espelhada ? indices.map((k) => gaiola.imagem[k]) : indices;
  let refinada;
  try { refinada = cadeiaRefinada(gaiola.faces, gaiola.nVertices, gaiola.niveis, cadeia); } catch (e) {
    if (!(e instanceof ErroDoFriso)) throw e;
    throw new Error(`${onde}: a borda liga ${citar(nomes[e.indice])} a ${citar(nomes[e.indice + 1])}, que não formam aresta da gaiola.`);
  }
  const passoDaCadeia = 2 ** gaiola.niveis;
  const ids = fechada ? refinada.cadeia.slice(0, -1) : refinada.cadeia;
  const pontos = ids.map((v, k) => {
    const p = neutro.V.get(idDoPasso(gaiola.passo, v));
    if (!p) throw new Error(`${onde}: o vértice da chapa sob a borda perto de ${citar(nomes[Math.min(nomes.length - 1, Math.round(k / passoDaCadeia))])} não existe mais na malha.`);
    return { nome: k % passoDaCadeia === 0 ? nomes[k / passoDaCadeia] : null, p };
  });
  return { pontos, fechada };
}

/**
 * Confere os vãos que a receita declara. -> { declarados, vaos: [{ nome, frisos, parcial, tolerancia, comprimento, amostras, cobertas,
 * descobertos, emendas, problemas, inconclusivo }], problemas: [texto], ok }. Sem `vaos`, { declarados: 0, ok: true }.
 */
export function conferirVaosDaPeca(neutro, receita = {}) {
  const registros = neutro.frisos ?? [];
  const declarados = lerVaosDeclarados(receita, registros);
  const vaos = [];
  for (const d of declarados) {
    const onde = `vaos: o vão ${citar(d.nome)}`;
    const dele = registros.filter((r) => d.frisos.includes(r.nome));
    const sem = dele.find((r) => r.gaiola == null);
    if (sem) throw new Error(`${onde}: o friso ${citar(sem.nome)} não segue uma chapa (superficie): a moldura de um vão se confere sobre a malha da chapa.`);
    const gaiolas = new Set(dele.map((r) => r.gaiola));
    if (gaiolas.size !== 1) throw new Error(`${onde}: os frisos ${lista(d.frisos)} seguem chapas diferentes; um vão é de uma chapa só.`);
    const gaiola = dele[0].gaiola;
    const saida = { nome: d.nome, frisos: d.frisos, parcial: d.parcial, tolerancia: d.tolerancia, problemas: [], descobertos: [], emendas: [], comprimento: 0, amostras: 0, cobertas: 0, inconclusivo: null };
    const lados = gaiola.simetria === 'x' ? [false, true] : [false];
    for (const espelhada of lados) {
      const borda = bordaNaMalha(gaiola, d.borda, neutro, onde, espelhada);
      if (borda.inconclusivo) { saida.inconclusivo = borda.inconclusivo; break; }
      const r = conferirMoldura({ borda: borda.pontos, fechada: borda.fechada, frisos: dele.filter((f) => f.espelhada === espelhada), tolerancia: d.tolerancia });
      saida.comprimento += r.comprimento; saida.amostras += r.amostras; saida.cobertas += r.cobertas;
      saida.descobertos.push(...r.descobertos.map((t) => ({ ...t, espelhada })));
      saida.emendas.push(...r.emendas.map((t) => ({ ...t, espelhada })));
    }
    saida.problemas = problemasDoVao(saida);
    vaos.push(saida);
  }
  const problemas = vaos.flatMap((v) => v.problemas.map((t) => `${citar(v.nome)}: ${t}`));
  return { declarados: declarados.length, vaos, problemas, ok: problemas.length === 0 };
}

function problemasDoVao(v) {
  const problemas = [];
  const lado = (t) => (t.espelhada ? ' (na cópia espelhada)' : '');
  if (v.inconclusivo) { problemas.push(`inconclusivo: ${v.inconclusivo}.`); return problemas; }
  if (v.amostras > 0 && v.cobertas === 0) {
    const longe = v.descobertos.reduce((m, t) => Math.min(m, t.distanciaDaFaixa), Infinity);
    problemas.push(`a moldura ${lista(v.frisos)} não toca a borda: a faixa mais perto passa a ${mm(longe)} mm dela (ela não desce até a borda)${v.parcial ? '; a aba parcial precisa cobrir ao menos parte da borda' : ''}.`);
  } else if (v.descobertos.length && !v.parcial) {
    for (const t of v.descobertos) {
      problemas.push(`trecho da borda sem moldura${lado(t)}, ${mm(t.comprimento)} mm entre ${t.entre.map((n) => (n == null ? '?' : citar(n))).join(' e ')} perto de ${ponto(t.posicao)}; a faixa mais perto fica a ${mm(t.distanciaDaFaixa)} mm do meio do trecho. Cubra o trecho, ou, se a aba é parcial de propósito, declare em \`vaos\` da receita \`parcial: { motivo }\`.`);
    }
  } else if (v.parcial && !v.descobertos.length) {
    problemas.push(`declarado parcial (${v.parcial.motivo}) e a borda está inteira coberta: tire \`parcial\` da declaração.`);
  }
  for (const e of v.emendas) {
    if (e.ok) continue;
    if (e.tipo === 'reta') {
      if (e.degrau > v.tolerancia) problemas.push(`degrau na emenda de ${citar(e.frisos[0])} com ${citar(e.frisos[1])}${lado(e)} perto de ${ponto(e.posicao)}: os perfis das duas pontas diferem em ${mm(e.degrau)} mm (larguras de ${mm(e.larguras[0])} e ${mm(e.larguras[1])} mm). A emenda de dois frisos leva o mesmo perfil nas duas pontas; para mudar a largura use um friso só com \`variacao\`.`);
      if (e.entalhe > v.tolerancia) problemas.push(`entalhe na emenda de ${citar(e.frisos[0])} com ${citar(e.frisos[1])}${lado(e)} perto de ${ponto(e.posicao)}: a linha vira ${e.giro.toFixed(1).replace('.', ',')} graus ali, cada ponta é cortada reta na sua direção, e a cunha de fora da curva fica sem material até ${mm(e.entalhe)} mm da faixa. Emende onde a linha é reta, ou faça a volta com um friso só.`);
    } else {
      problemas.push(`entalhe no canto entre ${citar(e.frisos[0])} e ${citar(e.frisos[1])}${lado(e)} em ${ponto(e.posicao)}: as duas pontas se encontram a ${e.giro.toFixed(0)} graus em corte reto, e o quadrante de fora do canto fica sem material até ${mm(e.entalhe)} mm da faixa. O canto se faz com um friso só pela volta, com \`variacao\` nos cantos vivos.`);
    }
  }
  return problemas;
}

/** O texto da seção dos vãos para o `descrever`. */
export function formatarVaos(resultado) {
  if (!resultado || !resultado.declarados) return '';
  const linhas = ['', `MOLDURA EM VOLTA DO VÃO — ${resultado.declarados} vão(s) declarado(s)`];
  for (const v of resultado.vaos) {
    const cobertura = v.amostras ? `${((100 * v.cobertas) / v.amostras).toFixed(1).replace('.', ',')}% da borda coberta` : 'sem medida';
    const emendas = v.emendas.length ? `${v.emendas.length} emenda(s) (${v.emendas.filter((e) => e.ok).length} ok)` : 'nenhuma emenda';
    const resto = v.inconclusivo ? 'inconclusivo' : v.parcial ? `parcial declarada: ${v.parcial.motivo}` : 'borda inteira';
    linhas.push(`  ${v.nome}: frisos ${lista(v.frisos)}; borda de ${mm(v.comprimento)} mm, ${cobertura}, ${v.descobertos.length} trecho(s) descoberto(s), ${emendas}; ${resto}; tolerância ${mm(v.tolerancia)} mm`);
  }
  return `${linhas.join('\n')}\n`;
}
