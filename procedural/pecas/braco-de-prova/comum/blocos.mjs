/* blocos.js — o tradutor comum das partes do braço de prova: cada forma da TABELA de uma parte, em milímetros, vira os passos
 * do núcleo (caixa chanfrada ou cilindro, furos por subtração, casca aberta no topo), com a parte e o material logo depois.
 *
 * Todas as partes do braço de prova são escritas no mesmo referencial, o da montagem: origem no chão, sob o eixo do ombro;
 * y para cima, x ao longo do braço esticado e z ao longo dos eixos do ombro e do cotovelo (+z é a frente, o lado do motor do
 * ombro). Por isso as portas de duas partes que se encaixam têm o mesmo centro e o mesmo eixo, e a posição derivada pela
 * montagem sai sem giro nem deslocamento.
 *
 * Forma `caixa`: { nome, material, caixa: [x0, x1, y0, y1, z0, z1], chanfro? }.
 * Forma `cil`:   { nome, material, eixo: 'x'|'y'|'z', base: [x, y, z] (centro da tampa de início), comprimento, raio, lados? }.
 * Opcionais: `furos` (lista de cilindros, no formato `cil`, tirados da forma) e `oca` ({ espessura }: casca aberta na tampa
 * de cima, só para o cilindro de eixo y).
 */

export const m = (mm) => mm / 1000;

/* O cilindro inteiro (laterais e tampas) só se cita por alias; cada parte exporta os seus por `aliasesDasFormas`. */
const nomeDoCilindro = (id) => `cilindro${id}`;
const inteiro = (id) => ({ alias: nomeDoCilindro(id) });
const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });

export function aliasesDasFormas(formas) {
  const aliases = [];
  formas.forEach((f, k) => {
    const id = 100 * (k + 1);
    if (!f.caixa) aliases.push([nomeDoCilindro(id), cilindroInteiro(id)]);
    (f.furos ?? []).forEach((furo, j) => { if (!furo.caixa) aliases.push([nomeDoCilindro(id + 1 + j), cilindroInteiro(id + 1 + j)]); });
  });
  return aliases;
}

function solido(f, id, passos) {
  if (f.caixa) {
    const [x0, x1, y0, y1, z0, z1] = f.caixa;
    passos.push(['chamferBox', {
      origemId: id, larg: m(x1 - x0), alt: m(y1 - y0), prof: m(z1 - z0), chanfro: m(f.chanfro ?? 0.5),
      em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)],
    }]);
    return { origem: { op: 'chamferBox', id } };
  }
  passos.push(['cilindro', { origemId: id, raio: m(f.raio), altura: m(f.comprimento), lados: f.lados ?? 36, eixo: f.eixo, em: f.base.map(m) }]);
  return inteiro(id);
}

/* Cada forma k ocupa o bloco de ids 100·(k+1): o sólido no início, os furos depois e a subtração em +50. */
export function passosDasFormas(formas) {
  const passos = [];
  const sels = {};
  formas.forEach((f, k) => {
    const id = 100 * (k + 1);
    let sel = solido(f, id, passos);
    if (f.oca) {
      passos.push(['casca', { origemId: id + 60, solido: sel, abertas: { origem: { op: 'cilindro', id, tampa: 'topo' } }, espessura: m(f.oca.espessura) }]);
      sel = { origem: { op: 'casca', id: id + 60 } };
    }
    if (f.furos?.length) {
      const ferramentas = f.furos.map((furo, j) => solido({ lados: 18, ...furo }, id + 1 + j, passos));
      passos.push(['subtrair', { origemId: id + 50, solidos: [sel, ...ferramentas] }]);
      sel = { origem: { op: 'subtrair', id: id + 50 } };
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { usa: f.material, sel }]);
    sels[f.nome] = sel;
  });
  return { passos, sels };
}

/* As cores do alinhamento de 2026-11-23: estrutura cinza-escuro, garfo e tampas das juntas laranja, motores pretos, polias
 * de alumínio, correia preta; a eletrônica da base com as cores das placas. */
export const MATERIAIS = {
  estrutura: { cor: '#3c3f44', aspereza: 0.6 },
  laranja: { cor: '#e8731c', aspereza: 0.55 },
  motor: { cor: '#1d1e20', aspereza: 0.4 },
  aluminio: { cor: '#b9bdc2', aspereza: 0.3 },
  aco: { cor: '#8d9196', aspereza: 0.3 },
  correia: { cor: '#151515', aspereza: 0.8 },
  fonte: { cor: '#9aa0a6', aspereza: 0.35 },
  placaArduino: { cor: '#1f6f9a', aspereza: 0.5 },
  placaDriver: { cor: '#7a3f8f', aspereza: 0.5 },
  vermelho: { cor: '#c8201e', aspereza: 0.45 },
};

/* Porta escrita em milímetros (centro, ponto, raios, início, fim e extensão), levada a metro para o `publicarPorta`. */
export function porta(nome, de, i) {
  const interfaceEmMetro = { ...i };
  for (const k of ['centro', 'ponto', 'extensao']) if (i[k]) interfaceEmMetro[k] = i[k].map(m);
  for (const k of ['raio', 'raioInterno', 'raioExterno', 'inicio', 'fim']) if (i[k] !== undefined) interfaceEmMetro[k] = m(i[k]);
  return ['publicarPorta', { nome, de, interface: interfaceEmMetro }];
}

/* A seleção que a porta cita como origem: a forma de nome dado, depois dos furos. */
export function origemDa(formas, nome) {
  const k = formas.findIndex((f) => f.nome === nome);
  if (k < 0) throw new Error(`blocos: forma '${nome}' não existe`);
  const id = 100 * (k + 1);
  const f = formas[k];
  if (f.furos?.length) return { op: 'subtrair', id: id + 50 };
  if (f.oca) return { op: 'casca', id: id + 60 };
  return f.caixa ? { op: 'chamferBox', id } : { op: 'cilindro', id };
}
