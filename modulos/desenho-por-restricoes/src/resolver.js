/* resolver.js — resolve o desenho com o planegcs 1.3.0 (o resolvedor do Sketcher do FreeCAD compilado para WebAssembly) e lê o
   que ele diz, em palavras da descrição.

   O planegcs devolve um estado, um grau de liberdade só para o desenho inteiro e, quando falha, os identificadores das restrições
   em conflito ou redundantes; este módulo traduz isso em quatro estados (resolvido, conflito, solto, lado trocado) e acrescenta o
   que o planegcs não diz:

   - as partes e os pontos que ainda se movem, achados prendendo uma coordenada de cada vez no valor resolvido: se ela estava
     determinada, a restrição nova é redundante e o grau de liberdade não cai; se estava solta, o grau cai em um;
   - o lado de cada relação sem sinal. A distância de um ponto a uma reta e a tangência de um círculo a uma reta valem dos dois lados,
     e só o chute decide o ramo; o resolvedor devolveu sucesso, zero grau de liberdade e a caçamba espelhada, sem nenhum aviso.
     O `lado` declarado é conferido depois de resolver, e o módulo tenta uma vez de novo com o chute do ponto refletido pela reta,
     só para dizer à IA qual chute usar: o desenho que a IA escreveu não é mudado por baixo dela;
   - a conferência das medidas pedidas (distância, raio, ângulo) na geometria resolvida, que não depende do estado do resolvedor.

   Puro e determinístico: a mesma descrição dá a mesma resposta. */
import { DebugMode, GcsWrapper, init_planegcs_module, SolveStatus } from '@salusoft89/planegcs';
import { traduzir, idDoPonto, idDaParte, nomeDaRelacao } from './traducao.js';
import { anguloEmGraus, distancia, ladoDoPonto, refletir, retaResolvida, r3 } from './geometria.js';

let modulo = null;
export function carregarPlanegcs() {
  modulo ??= init_planegcs_module();
  return modulo;
}

const NOMES_DO_ESTADO = { [SolveStatus.Success]: 'Success', [SolveStatus.Converged]: 'Converged', [SolveStatus.Failed]: 'Failed', [SolveStatus.SuccessfulSolutionInvalid]: 'SuccessfulSolutionInvalid' };
const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const unicos = (l) => [...new Set(l)];

/* Uma execução do resolvedor sobre a descrição. */
export async function executar(modelo, opcoes = {}) {
  const mod = await carregarPlanegcs();
  const gcs = new GcsWrapper(new mod.GcsSystem());
  /* O C++ do planegcs escreve o diagnóstico na saída padrão no modo de depuração mínimo; o módulo devolve o diagnóstico por dados. */
  gcs.debug_mode = DebugMode.NoDebug;
  try {
    gcs.push_primitives_and_params(traduzir(modelo, opcoes));
    const status = gcs.solve();
    const conflitantes = unicos(gcs.get_gcs_conflicting_constraints());
    const redundantes = unicos(gcs.get_gcs_redundant_constraints());
    const parciais = unicos(gcs.get_gcs_partially_redundant_constraints());
    const dof = gcs.gcs.dof();
    const resolvido = status === SolveStatus.Success || status === SolveStatus.Converged;
    let pontos = null; let raios = null;
    if (resolvido) {
      gcs.apply_solution();
      pontos = {}; raios = {};
      for (const nome of Object.keys(modelo.pontos)) { const p = gcs.sketch_index.get_sketch_point(idDoPonto(nome)); pontos[nome] = [p.x, p.y]; }
      for (const [nome, parte] of Object.entries(modelo.partes)) if (parte.tipo === 'circulo') raios[nome] = gcs.sketch_index.get_sketch_circle(idDaParte('circulo', nome)).radius;
      if (![...Object.values(pontos).flat(), ...Object.values(raios)].every(Number.isFinite)) { pontos = null; raios = null; }
    }
    return { status, nomeDoStatus: NOMES_DO_ESTADO[status], dof, conflitantes, redundantes, parciais, pontos, raios, resolvido: resolvido && pontos !== null };
  } finally {
    gcs.destroy_gcs_module();
  }
}

const nomesDasRelacoes = (ids) => unicos(ids.map(nomeDaRelacao).filter((n) => n !== null)).sort(porNome);

/* Como a reta de uma relação se chama nas mensagens. */
export function descreverLinha(l) {
  if (l.via === 'par') return `a reta ${JSON.stringify(l.pontos[0])}-${JSON.stringify(l.pontos[1])}`;
  return JSON.stringify(l.nome);
}

const TOLERANCIA = 0.005;
const tolMm = (v) => Math.max(TOLERANCIA, 1e-5 * Math.abs(v));
const volta = (g) => ((g % 360) + 360) % 360;
const diferencaAngular = (a, b) => { const d = Math.abs(volta(a) - volta(b)); return Math.min(d, 360 - d); };

/* O quanto uma relação deixa de valer na geometria resolvida: em mm para as de medida e de posição, em graus para as de direção.
   Zero é uma relação satisfeita. Independe do estado que o resolvedor declarou. */
export function residuo(modelo, r, pontos, raios) {
  const raioDe = (c) => (c.tipo === 'circulo' ? raios[c.parte] : distancia(pontos[modelo.partes[c.parte].centro], pontos[modelo.partes[c.parte].inicio]));
  const centroDe = (c) => pontos[modelo.partes[c.parte].centro];
  const reta = (l) => retaResolvida(modelo, l, pontos);
  const distanciaPontoReta = (p, [a, b]) => Math.abs(((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / (distancia(a, b) || 1));
  const direcao = ([a, b]) => anguloEmGraus(a, b);
  switch (r.tipo) {
    case 'sobre':
      if (r.alvo.classe === 'linha') return { valor: distanciaPontoReta(pontos[r.ponto], reta(r.alvo)), unidade: 'mm' };
      return { valor: Math.abs(distancia(pontos[r.ponto], centroDe(r.alvo)) - raioDe(r.alvo)), unidade: 'mm' };
    case 'coincidente': return { valor: distancia(pontos[r.a], pontos[r.b]), unidade: 'mm' };
    case 'distancia': {
      const medido = r.linha ? distanciaPontoReta(pontos[r.a], reta(r.linha)) : distancia(pontos[r.a], pontos[r.b]);
      return { valor: Math.abs(medido - r.mm), unidade: 'mm', pedido: r.mm, medido };
    }
    case 'raio': return { valor: Math.abs(raioDe(r.alvo) - r.mm), unidade: 'mm', pedido: r.mm, medido: raioDe(r.alvo) };
    case 'tangente': {
      if (r.linha) return { valor: Math.abs(distanciaPontoReta(centroDe(r.a), reta(r.linha)) - raioDe(r.a)), unidade: 'mm' };
      const d = distancia(centroDe(r.a), centroDe(r.b)); const r1 = raioDe(r.a); const r2 = raioDe(r.b);
      return { valor: Math.min(Math.abs(d - (r1 + r2)), Math.abs(d - Math.abs(r1 - r2))), unidade: 'mm' };
    }
    case 'paralela': return { valor: Math.min(diferencaAngular(direcao(reta(r.a)), direcao(reta(r.b))), diferencaAngular(direcao(reta(r.a)) + 180, direcao(reta(r.b)))), unidade: 'graus' };
    case 'perpendicular': return { valor: Math.min(diferencaAngular(direcao(reta(r.a)) + 90, direcao(reta(r.b))), diferencaAngular(direcao(reta(r.a)) - 90, direcao(reta(r.b)))), unidade: 'graus' };
    case 'vertical': return { valor: Math.abs(pontos[r.a][0] - pontos[r.b][0]), unidade: 'mm' };
    case 'horizontal': return { valor: Math.abs(pontos[r.a][1] - pontos[r.b][1]), unidade: 'mm' };
    case 'angulo': {
      const medido = volta(direcao(reta(r.b)) - direcao(reta(r.a)));
      return { valor: diferencaAngular(medido, r.graus), unidade: 'graus', pedido: r.graus, medido };
    }
    case 'igual': {
      if (r.a.classe === 'linha') { const [a1, a2] = reta(r.a); const [b1, b2] = reta(r.b); return { valor: Math.abs(distancia(a1, a2) - distancia(b1, b2)), unidade: 'mm' }; }
      return { valor: Math.abs(raioDe(r.a) - raioDe(r.b)), unidade: 'mm' };
    }
    default: return { valor: 0, unidade: 'mm' };
  }
}

/* As relações que a geometria resolvida não satisfaz. Para as de medida, o valor pedido e o medido; para as outras, o resíduo. */
export function conferirMedidas(modelo, pontos, raios) {
  const desvios = [];
  for (const r of modelo.relacoes) {
    const x = residuo(modelo, r, pontos, raios);
    const tol = x.unidade === 'mm' ? tolMm(r.mm ?? 0) : TOLERANCIA;
    if (!(x.valor <= tol)) desvios.push({ relacao: r.nome, tipo: r.tipo, pedido: x.pedido ?? null, medido: x.medido === undefined ? null : r3(x.medido), residuo: r3(x.valor), unidade: x.unidade });
  }
  return desvios;
}

/* O lado de cada relação que o resolvedor não distingue, conferido na geometria resolvida. Cada item diz a relação, o que foi
   pedido, onde ficou, a frase para a IA e, quando há um ponto cujo chute se pode refletir, qual ponto e por qual reta. */
export function conferirLados(modelo, pontos, raios) {
  const trocados = [];
  for (const r of modelo.relacoes) {
    if (r.tipo === 'distancia' && r.linha) {
      const [a, b] = retaResolvida(modelo, r.linha, pontos);
      const l = ladoDoPonto(pontos[r.a], a, b, r.lado);
      if (!l.ok) {
        trocados.push({
          relacao: r.nome, pedido: r.lado, ficou: l.inaplicavel ? 'sem esse lado' : l.ficou, ponto: r.a, linha: r.linha,
          mensagem: l.inaplicavel
            ? `a relação ${JSON.stringify(r.nome)} pede o ponto ${JSON.stringify(r.a)} ${r.lado} de ${descreverLinha(r.linha)}, mas essa reta ficou ${r.lado === 'acima' || r.lado === 'abaixo' ? 'vertical' : 'horizontal'} e não tem ${r.lado}; use ${r.lado === 'acima' || r.lado === 'abaixo' ? '"esquerda" ou "direita"' : '"acima" ou "abaixo"'}`
            : `a relação ${JSON.stringify(r.nome)} pede o ponto ${JSON.stringify(r.a)} ${r.lado} de ${descreverLinha(r.linha)}, e ele ficou ${l.ficou} (a ${r3(r.mm)} mm dela)`,
        });
      }
    } else if (r.tipo === 'tangente' && r.linha) {
      const [a, b] = retaResolvida(modelo, r.linha, pontos);
      const centro = modelo.partes[r.a.parte].centro;
      const l = ladoDoPonto(pontos[centro], a, b, r.lado);
      if (!l.ok) {
        trocados.push({
          relacao: r.nome, pedido: r.lado, ficou: l.inaplicavel ? 'sem esse lado' : l.ficou, ponto: centro, linha: r.linha,
          mensagem: l.inaplicavel
            ? `a relação ${JSON.stringify(r.nome)} pede o círculo ${JSON.stringify(r.a.parte)} ${r.lado} de ${descreverLinha(r.linha)}, mas essa reta ficou ${r.lado === 'acima' || r.lado === 'abaixo' ? 'vertical' : 'horizontal'} e não tem ${r.lado}`
            : `a relação ${JSON.stringify(r.nome)} pede o círculo ${JSON.stringify(r.a.parte)} ${r.lado} de ${descreverLinha(r.linha)}, e ele ficou ${l.ficou}`,
        });
      }
    } else if (r.tipo === 'tangente' && r.b) {
      const d = distancia(pontos[modelo.partes[r.a.parte].centro], pontos[modelo.partes[r.b.parte].centro]);
      const r1 = raios[r.a.parte]; const r2 = raios[r.b.parte];
      const porFora = Math.abs(d - (r1 + r2)) <= Math.abs(d - Math.abs(r1 - r2));
      const ficou = porFora ? 'fora' : 'dentro';
      if (ficou !== r.por) {
        trocados.push({
          relacao: r.nome, pedido: r.por, ficou, ponto: null, linha: null,
          mensagem: `a relação ${JSON.stringify(r.nome)} pede os círculos ${JSON.stringify(r.a.parte)} e ${JSON.stringify(r.b.parte)} tangentes por ${r.por}, e eles ficaram tangentes por ${ficou}; mova o chute do centro de um deles para o lado certo do outro`,
        });
      }
    }
  }
  return trocados;
}

/* Prende uma coordenada de cada vez no valor resolvido. Quem estava solto faz o grau de liberdade cair; quem estava determinado
   vira restrição redundante e o grau não muda. */
async function acharSoltas(modelo, base) {
  const chutes = base.pontos; const raios = base.raios;
  const pontos = []; const raiosSoltos = [];
  for (const nome of Object.keys(modelo.pontos).sort(porNome)) {
    const eixos = [];
    for (const [eixo, tipo, campo, k] of [['h', 'coordinate_x', 'x', 0], ['v', 'coordinate_y', 'y', 1]]) {
      const x = await executar(modelo, { chutes, raios, extras: [{ id: `interna:prender:${nome}:${eixo}`, type: tipo, p_id: idDoPonto(nome), [campo]: chutes[nome][k] }] });
      if (x.resolvido && x.dof < base.dof) eixos.push(eixo);
    }
    if (eixos.length) pontos.push({ nome, eixos });
  }
  for (const nome of Object.keys(raios).sort(porNome)) {
    const x = await executar(modelo, { chutes, raios, extras: [{ id: `interna:prender:raio:${nome}`, type: 'circle_radius', c_id: idDaParte('circulo', nome), radius: raios[nome] }] });
    if (x.resolvido && x.dof < base.dof) raiosSoltos.push(nome);
  }
  const partes = Object.keys(modelo.partes).sort(porNome).filter((nome) => {
    const p = modelo.partes[nome];
    const dela = p.tipo === 'circulo' ? [p.centro] : p.tipo === 'arco' ? [p.centro, p.inicio, p.fim] : p.pontos;
    return dela.some((n) => pontos.some((s) => s.nome === n)) || raiosSoltos.includes(nome);
  });
  return { pontos, raios: raiosSoltos, partes };
}

/* O chute refletido pela reta de cada relação com lado trocado, um ponto por vez. */
function chutesRefletidos(modelo, trocados) {
  const novos = {};
  for (const t of trocados) {
    if (!t.ponto || !t.linha || novos[t.ponto]) continue;
    const [a, b] = retaResolvida(modelo, t.linha, modelo.pontos);
    const p = refletir(modelo.pontos[t.ponto], a, b);
    novos[t.ponto] = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  }
  return novos;
}

const semRelacao = (modelo, nome) => ({ ...modelo, relacoes: modelo.relacoes.filter((r) => r.nome !== nome) });

/* O planegcs chama de conflito também a redundância que não consegue resolver (a ordem das restrições decide: com a repetida no
   meio da lista, 14 de 40 ordens falharam). Para cada relação do grupo em conflito, tira-se a relação e resolve-se o resto: se
   o resto resolve e ainda satisfaz a relação tirada, ela já estava implicada pelas outras e é só redundante; se o resto resolve e
   a relação tirada não vale nele, ela contradiz as outras de verdade. Devolve a redundante (a escrita por último entre as
   implicadas) com a solução do resto, ou o grupo reduzido às relações cuja retirada desfaz o conflito. */
async function separarConflito(modelo, grupo) {
  const porPosicaoDesc = (a, b) => modelo.relacoes.find((r) => r.nome === b).posicao - modelo.relacoes.find((r) => r.nome === a).posicao;
  const desfazem = [];
  for (const nome of [...grupo].sort(porPosicaoDesc)) {
    const sem = semRelacao(modelo, nome);
    const y = await executar(sem);
    if (!y.resolvido || nomesDasRelacoes(y.conflitantes).length) continue;
    const r = modelo.relacoes.find((q) => q.nome === nome);
    const res = residuo(modelo, r, y.pontos, y.raios);
    if (res.valor <= (res.unidade === 'mm' ? tolMm(r.mm ?? 0) : TOLERANCIA)) return { tipo: 'redundante', nome, modelo: sem, x: y };
    desfazem.push(nome);
  }
  return { tipo: 'conflito', conflitantes: (desfazem.length ? desfazem : grupo).sort(porNome) };
}

/* A resposta completa do resolvedor para a descrição, sem a geometria das partes nem o texto. */
export async function resolver(modelo) {
  let atual = modelo; let x = await executar(modelo);
  let conflitantes = nomesDasRelacoes(x.conflitantes);
  let redundantes = nomesDasRelacoes([...x.redundantes, ...x.parciais]);
  if ((!x.resolvido || conflitantes.length) && conflitantes.length) {
    const sep = await separarConflito(modelo, conflitantes);
    if (sep.tipo === 'redundante') {
      atual = sep.modelo; x = sep.x; conflitantes = [];
      redundantes = unicos([sep.nome, ...nomesDasRelacoes([...x.redundantes, ...x.parciais])]).sort(porNome);
    } else conflitantes = sep.conflitantes;
  }
  const base = { grausDeLiberdade: x.dof, statusDoResolvedor: x.nomeDoStatus, conflitantes, redundantes };
  if (!x.resolvido || conflitantes.length) {
    return { ...base, estado: 'conflito', convergiu: x.resolvido, pontos: null, raios: null, soltas: null, ladosTrocados: [], desvios: [], sugestao: null };
  }
  const desvios = conferirMedidas(modelo, x.pontos, x.raios);
  if (desvios.length) {
    return { ...base, estado: 'conflito', convergiu: true, pontos: x.pontos, raios: x.raios, soltas: null, ladosTrocados: [], desvios, sugestao: null };
  }
  const ladosTrocados = conferirLados(modelo, x.pontos, x.raios);
  const soltas = x.dof > 0 ? await acharSoltas(atual, x) : null;
  let sugestao = null;
  if (ladosTrocados.length) {
    const novos = chutesRefletidos(modelo, ladosTrocados);
    if (Object.keys(novos).length) {
      const y = await executar(atual, { chutes: novos });
      const resolve = y.resolvido && nomesDasRelacoes(y.conflitantes).length === 0 && y.dof === 0 && conferirMedidas(modelo, y.pontos, y.raios).length === 0 && conferirLados(modelo, y.pontos, y.raios).length === 0;
      sugestao = { resolve, pontos: novos };
    }
  }
  const estado = ladosTrocados.length ? 'lado trocado' : x.dof > 0 ? 'solto' : 'resolvido';
  return { ...base, estado, convergiu: true, pontos: x.pontos, raios: x.raios, soltas, ladosTrocados, desvios, sugestao };
}
