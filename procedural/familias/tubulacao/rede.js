/* rede.js — a rede de tubos de um traçado, como a lista das peças da família `tubulacao` com a pose de cada uma, em metro.

   `pecasDaRede(tracado)` lê o traçado (`lerTracado`) e devolve, para cada trecho, o tubo cortado no comprimento de corte,
   começando no nó de origem mais o avanço da conexão; para cada nó de curva, a curva com o ângulo do desvio e o raio da
   tabela, com a boca de entrada onde termina o tubo que chega; para cada ponta com `fim: 'tampao'`, o tampão com a boca no
   nó, voltado para fora; e, para cada ponta aberta, a porta da boca (centro, eixo para fora e raios). A peça da família tem a
   boca no plano y = 0 com o eixo em +y (e a curva dobra para +x); a pose gira esse quadro para o do traçado por três giros,
   em x, em y e em z, aplicados nessa ordem, e o leva à posição. O tê tem a passagem em y, com a boca de entrada no nó menos
   o centro à boca, e a derivação em +x; a redução tem a boca maior a meio comprimento antes do nó. Os vértices das seções de
   48 lados casam de peça em peça: o tê fixa o ângulo dos três tubos dele, e daí a rede passa o ângulo adiante; quando dois
   tês pedem ângulos diferentes ao mesmo tubo, o par vai para `desencontros`. `encostos` lista os pares de peças que se
   tocam de topo na boca de uma conexão, e a receita declara esse contato. Quem põe as peças na receita é o `instanciaDeFamilia`, uma chamada por
   peça com a base encadeada. */
import { lerTracado } from './tracado.js';

const sub = (a, b) => a.map((x, k) => x - b[k]);
const soma = (a, b) => a.map((x, k) => x + b[k]);
const vezes = (a, s) => a.map((x) => x * s);
const dot = (a, b) => a.reduce((s, x, k) => s + x * b[k], 0);
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => vezes(v, 1 / Math.hypot(...v));
const graus = (r) => (r * 180) / Math.PI;
const m = (mm) => mm / 1000;

/* um eixo x perpendicular a y, o mais perto possível do x do mundo */
function perpendicular(y) {
  const base = Math.abs(y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  return unit(sub(base, vezes(y, dot(base, y))));
}

/** Os giros em x, y e z (graus, nessa ordem) que levam os eixos locais x e y aos vetores dados. */
export function girosDoQuadro(x, y) {
  const z = cruz(x, y);
  /* R = Rz(c)·Ry(b)·Rx(a), com as colunas x, y e z */
  const R = [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]];
  const sb = -Math.max(-1, Math.min(1, R[2][0]));
  const b = Math.asin(sb);
  let a; let c;
  if (Math.abs(sb) > 1 - 1e-9) {
    /* trava de cardã (o giro em y de ±90°): o de z fica zero e o de x leva o resto */
    c = 0;
    a = Math.atan2(sb * R[0][1], sb * R[0][2]);
  } else {
    a = Math.atan2(R[2][1], R[2][2]);
    c = Math.atan2(R[1][0], R[0][0]);
  }
  return [{ eixo: 'x', graus: graus(a) }, { eixo: 'y', graus: graus(b) }, { eixo: 'z', graus: graus(c) }];
}

const LADO = 360 / 48;
const mod = (x, n) => ((x % n) + n) % n;
const girarNoPlano = (x, z, graus) => { const r = (graus * Math.PI) / 180; return soma(vezes(x, Math.cos(r)), vezes(z, Math.sin(r))); };

export function pecasDaRede(tracado) {
  const lido = lerTracado(tracado);
  const posicao = Object.fromEntries(lido.nos.map((n) => [n.nome, n.posicao]));
  const noPorNome = Object.fromEntries(lido.nos.map((n) => [n.nome, n]));
  const pecas = [];
  const portas = [];
  const encostos = [];
  const ligadosA = (nome) => lido.trechos.filter((t) => t.de === nome || t.para === nome);
  const outro = (t, nome) => (t.de === nome ? t.para : t.de);
  /* o eixo x de cada tubo: os vértices da seção (48 lados) ficam a cada 7,5° a partir dele; a rede percorre o traçado a
     partir de uma ponta e passa esse ângulo do tubo para a curva e da curva para o tubo seguinte, para as bocas casarem */
  const eixoX = new Map();
  const curvas = new Map();
  const tes = new Map();
  const desencontros = [];
  /* o quadro do tê: y ao longo da passagem, x para a derivação; o tubo da passagem tem o x na derivação, e o da derivação, na passagem */
  const quadroDoTe = (no) => {
    if (!tes.has(no.nome)) {
      const ligados = ligadosA(no.nome);
      const derivacao = ligados.find((t) => t.indice === no.derivacao);
      const [a, b] = ligados.filter((t) => t !== derivacao);
      const y = unit(sub(posicao[outro(b, no.nome)], posicao[outro(a, no.nome)]));
      const x = unit(sub(posicao[outro(derivacao, no.nome)], no.posicao));
      tes.set(no.nome, { derivacao, passagem: [a, b], x, y });
    }
    return tes.get(no.nome);
  };
  const xDoTuboNoTe = (no, t) => { const q = quadroDoTe(no); return t === q.derivacao ? q.y : q.x; };
  const paralelo = (a, b) => Math.abs(Math.abs(dot(a, b)) - 1) < 1e-6;
  const fila = [];
  const semear = (no) => {
    for (const t of ligadosA(no.nome)) if (!eixoX.has(t)) { eixoX.set(t, no.tipo === 'te' ? xDoTuboNoTe(no, t) : perpendicular(unit(sub(posicao[t.para], posicao[t.de])))); fila.push([t, outro(t, no.nome)]); }
  };
  const fontes = [...lido.nos.filter((n) => n.tipo === 'te'), lido.nos.find((n) => n.tipo === 'ponta') ?? lido.nos[0]];
  for (const fonte of fontes) { semear(fonte); while (fila.length) {
    const [chegou, nome] = fila.shift();
    const no = noPorNome[nome];
    if (no.tipo === 'te' && !paralelo(eixoX.get(chegou), xDoTuboNoTe(no, chegou))) desencontros.push([`te${nome}`, `tubo${chegou.indice}`]);
    for (const t of ligadosA(nome)) {
      if (t === chegou) continue;
      if (eixoX.has(t)) continue;
      const dirT = unit(sub(posicao[t.para], posicao[t.de]));
      const X = eixoX.get(chegou);
      if (no.tipo === 'curva') {
        const u = unit(sub(no.posicao, posicao[outro(chegou, nome)]));
        const v = unit(sub(posicao[outro(t, nome)], no.posicao));
        const dobra = unit(sub(v, vezes(u, dot(v, u))));
        const z = cruz(dobra, u);
        const theta = (Math.atan2(dot(X, z), dot(X, dobra)) * 180) / Math.PI;
        const fase = mod(-theta, LADO);
        /* no fim do arco, o x da curva aponta para o centro dela: o oposto da direção de chegada */
        const xFim = vezes(u, -1);
        const Xt = girarNoPlano(xFim, z, -fase);
        eixoX.set(t, unit(sub(Xt, vezes(dirT, dot(Xt, dirT)))));
        curvas.set(nome, { chegou, saiu: t, u, dobra, fase });
      } else if (no.tipo === 'te') {
        eixoX.set(t, xDoTuboNoTe(no, t));
      } else {
        eixoX.set(t, unit(sub(X, vezes(dirT, dot(X, dirT)))));
      }
      fila.push([t, outro(t, nome)]);
    }
  } }
  for (const t of lido.trechos) {
    const p = posicao[t.de];
    const dir = unit(sub(posicao[t.para], p));
    const comeco = soma(p, vezes(dir, t.avancos.de));
    const X = eixoX.get(t) ?? perpendicular(dir);
    pecas.push({ nome: `tubo${t.indice}`, parametros: { forma: 1, diametroExterno: t.diametroExterno, parede: t.parede, comprimento: t.corte }, pose: { posicao: comeco.map(m), giro: girosDoQuadro(X, dir) } });
  }
  for (const no of lido.nos) {
    const ligados = ligadosA(no.nome);
    if (no.tipo === 'curva') {
      const c = curvas.get(no.nome);
      const a = c ? c.chegou : ligados[0];
      const u = c ? c.u : unit(sub(no.posicao, posicao[outro(a, no.nome)]));
      const dobra = c ? c.dobra : unit(sub(unit(sub(posicao[outro(ligados[1], no.nome)], no.posicao)), vezes(u, dot(unit(sub(posicao[outro(ligados[1], no.nome)], no.posicao)), u))));
      const comeco = sub(no.posicao, vezes(u, no.avanco));
      for (const t of ligados) encostos.push([`curva${no.nome}`, `tubo${t.indice}`]);
      pecas.push({ nome: `curva${no.nome}`, parametros: { forma: 2, diametroExterno: a.diametroExterno, parede: a.parede, raio: no.raio, angulo: no.desvio, fase: c ? c.fase : 0 }, pose: { posicao: comeco.map(m), giro: girosDoQuadro(dobra, u) } });
    } else if (no.tipo === 'ponta') {
      const [t] = ligados;
      const fora = unit(sub(no.posicao, posicao[outro(t, no.nome)]));
      const ro = t.diametroExterno / 2;
      if (no.fim === 'tampao') {
        encostos.push([`tampao${no.nome}`, `tubo${t.indice}`]);
        const X = eixoX.get(t) ?? perpendicular(fora);
        pecas.push({ nome: `tampao${no.nome}`, parametros: { forma: 3, diametroExterno: t.diametroExterno, parede: t.parede, comprimentoDoTampao: tampaoDe(lido.material, t) }, pose: { posicao: no.posicao.map(m), giro: girosDoQuadro(unit(sub(X, vezes(fora, dot(X, fora)))), fora) } });
      } else {
        portas.push({ no: no.nome, centro: no.posicao, eixo: fora, raioInterno: ro - t.parede, raioExterno: ro });
      }
    } else if (no.tipo === 'te') {
      const q = quadroDoTe(no);
      const t = q.derivacao;
      for (const l of ligados) encostos.push([`te${no.nome}`, `tubo${l.indice}`]);
      const entrada = sub(no.posicao, vezes(q.y, no.centroABoca));
      pecas.push({ nome: `te${no.nome}`, parametros: { forma: 4, diametroExterno: t.diametroExterno, parede: t.parede, centroABoca: no.centroABoca }, pose: { posicao: entrada.map(m), giro: girosDoQuadro(q.x, q.y) } });
    } else if (no.tipo === 'reducao') {
      const maior = ligados.find((l) => l.bitola === no.maior);
      const menor = ligados.find((l) => l !== maior);
      const dir = unit(sub(posicao[outro(menor, no.nome)], posicao[outro(maior, no.nome)]));
      const X0 = eixoX.get(maior) ?? perpendicular(dir);
      const X = unit(sub(X0, vezes(dir, dot(X0, dir))));
      for (const l of ligados) encostos.push([`reducao${no.nome}`, `tubo${l.indice}`]);
      const entrada = sub(no.posicao, vezes(dir, no.comprimento / 2));
      pecas.push({ nome: `reducao${no.nome}`, parametros: { forma: 5, diametroExterno: maior.diametroExterno, parede: maior.parede, diametroMenor: menor.diametroExterno, paredeMenor: menor.parede, comprimentoDaReducao: no.comprimento }, pose: { posicao: entrada.map(m), giro: girosDoQuadro(X, dir) } });
    }
  }
  return { material: lido.material, trechos: lido.trechos, nos: lido.nos, pecas, portas, encostos, desencontros };
}

/* o comprimento do tampão da tabela da bitola */
import { bitola } from './tabela.js';
function tampaoDe(material, t) { return bitola(material, t.bitola).tampao; }
