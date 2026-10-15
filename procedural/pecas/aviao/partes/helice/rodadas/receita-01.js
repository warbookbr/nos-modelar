/* aviao/helice — o cone e as cinco pás da hélice do avião de pequeno porte, parada na pose do esboço.
 *
 * Terceira etapa do avião (`../../montagem.json`): o plano está em `../../ALINHAMENTO.md` e as formas vêm da unidade `helice` do esboço
 * aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre e
 * `aviao-detalhe-helice.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. O
 * eixo da hélice é a reta x = 0, y = 1330. A TABELA está em milímetro, no quadro do esboço, e a conversão para metro acontece só em
 * `derivar`. O motor e a fuselagem não publicam porta, e por isso a proa do cone, o eixo da hélice e o lábio do capô estão na TABELA
 * como os pontos do esboço (`proa`, `eixoHelice`) e como a primeira estação do capô, e não saem de um vínculo de medida e de um encaixe
 * de porta da montagem v5.
 *
 * O cone é uma revolução em z. O esboço o declara `suave` e passa pelos 12 pontos do perfil uma curva de tangente contínua (cúbica de
 * Hermite com a tangente de Fritsch e Carlson, a do PCHIP, que não passa do valor de nenhum ponto); aqui a curva entra em `derivar`,
 * que a avalia no raio e acrescenta as estações entre os pontos, e o `lathe` a revoluciona em `lados` faces com o sombreado liso. O
 * `lathe` guarda 1000 faces por passo, e com 48 lados cabem 20 faixas: as estações a mais ficam onde a flecha de um vão passa de meio
 * milímetro (a ponta e o ombro do cone, onde o perfil vira), e o resto fica só nos pontos do esboço. O perfil fecha na base com um polo
 * no eixo, e a base fica dentro do capô: o cone termina 14 mm depois do lábio, em z 606, e o capô começa em z 592.
 *
 * A pá é a chamada da família `superficie-aerodinamica` com o perfil `pa-de-helice` e os parâmetros do esboço, expandida aqui dentro
 * dos PASSOS. A família a gera na pose dela (a raiz na origem, a envergadura em +y, a corda no plano de rotação), e o esboço a põe
 * girando 90 graus em z para a envergadura ir a +x e levando a raiz ao ponto do eixo da hélice mais o deslocamento `raiz`; a receita
 * faz o mesmo com `rotaciona` e `transladar`. As outras quatro pás são cópias da primeira em arranjo radial em torno do eixo da
 * hélice, nomeadas uma a uma (`arranja` com `nomes`). Da expansão ficam a casca, o material, o sólido e o liso; saem a parte `fixa`,
 * porque a receita nomeia as cinco pás, e as duas portas, que a família publica no quadro local da pá e que a pose deixaria longe da
 * forma (`porta-fora-do-plano`).
 */
import { chamar, criarRegistroDeFamilias } from '../../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../../nucleo/composicoes.js';
import { nucleo } from '../../../../../nucleo/entrada.js';

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const PAS = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];
const FORMA_DA_PA = { pa1: 'helicePa', pa2: 'helicePa1', pa3: 'helicePa2', pa4: 'helicePa3', pa5: 'helicePa4' };

export const TABELA = {
  /* O ponto `eixoHelice` do esboço: o eixo da hélice passa por x e y, e o z é o da âncora em que a raiz da pá se mede. */
  eixo: [0, 1330, 490],
  /* O cone: `proa` é o z do ponto `proa` do esboço, onde nasce a ponta. O `perfil` é o do esboço, [raio, distância da ponta ao longo do
     eixo] em cada linha, e `trechos` diz quantos trechos cada vão entre dois pontos vira na curva suave, um número por vão, onze ao
     todo: [2, 2, 2, 1, 1, 1, 1, 2, 1, 4, 1] põem uma estação por meio milímetro de flecha, dão 18 anéis e 19 faixas, e com 48 lados
     o `lathe` ocupa 912 das 1000 faces do passo. `labio` é o z da primeira estação do capô, onde a base do cone tem de estar dentro. */
  cone: {
    proa: 8,
    perfil: [[0, 0], [60, 54], [100, 104], [125, 154], [150, 204], [168, 254], [185, 304], [200, 354], [210, 404], [212, 444], [195, 540], [182, 598]],
    trechos: [2, 2, 2, 1, 1, 1, 1, 2, 1, 4, 1],
    lados: 48,
    labio: 592,
  },
  /* A pá: os parâmetros da família, a `raiz` como deslocamento do ponto do eixo (a âncora do esboço, em x, y, z), o `giro` em z que leva
     a envergadura de +y a +x, e o número de pás, em arranjo radial de volta inteira em torno do eixo. */
  pa: {
    perfil: 'pa-de-helice',
    envergadura: 912,
    cordaNaRaiz: 0.22,
    cordaNaPonta: 0.125,
    raiz: [178, 0, -62],
    giro: -90,
    total: 5,
  },
};

const m = (mm) => mm / 1000;

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* A cúbica de Hermite por trechos com a tangente do PCHIP, sobre o raio em função da distância à ponta. `pontos` são [raio, distância]
   em ordem crescente de distância, e `trechos` traz um número por vão. Devolve [raio, distância] nos pontos e nas estações entre eles.
   Os pontos do cone têm quebra de direção bem abaixo dos 40 graus em que o esboço declara aresta, e por isso nenhum é aresta. */
function perfilSuave(pontos, trechos) {
  const n = pontos.length;
  if (trechos.length !== n - 1) throw new Error(`cone: ${n} pontos pedem ${n - 1} números em trechos, e a TABELA traz ${trechos.length}`);
  const h = pontos.slice(1).map((p, k) => p[1] - pontos[k][1]);
  const d = pontos.slice(1).map((p, k) => (p[0] - pontos[k][0]) / h[k]);
  const interna = (h0, h1, d0, d1) => {
    if (d0 * d1 <= 0) return 0;
    const a = 2 * h1 + h0;
    const b = h1 + 2 * h0;
    return (a + b) / (a / d0 + b / d1);
  };
  const daPonta = (h0, h1, d0, d1) => {
    const t = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(t) !== Math.sign(d0)) return 0;
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(t) > 3 * Math.abs(d0)) return 3 * d0;
    return t;
  };
  const tangente = pontos.map((_, k) => {
    if (k === 0) return daPonta(h[0], h[1], d[0], d[1]);
    if (k === n - 1) return daPonta(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
    return interna(h[k - 1], h[k], d[k - 1], d[k]);
  });
  const saida = [];
  for (let k = 0; k < n - 1; k++) {
    saida.push(pontos[k]);
    const quantos = trechos[k];
    if (!Number.isInteger(quantos) || quantos < 1) throw new Error(`cone: trechos[${k}] precisa ser inteiro maior ou igual a 1`);
    for (let j = 1; j < quantos; j++) {
      const t = j / quantos;
      const [h00, h10, h01, h11] = [2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2];
      saida.push([
        h00 * pontos[k][0] + h10 * h[k] * tangente[k] + h01 * pontos[k + 1][0] + h11 * h[k] * tangente[k + 1],
        pontos[k][1] + t * h[k],
      ]);
    }
  }
  saida.push(pontos[n - 1]);
  return saida;
}

export function derivar(t = TABELA) {
  const eixo = t.eixo.map(m);

  /* O cone: o perfil suave em [raio, z] com a ponta em `proa`, fechado na base por um polo no eixo. */
  const suave = perfilSuave(t.cone.perfil, t.cone.trechos);
  const base = t.cone.proa + t.cone.perfil[t.cone.perfil.length - 1][1];
  if (base <= t.cone.labio) throw new Error(`cone: a base em z ${base} mm não passa do lábio do capô, em z ${t.cone.labio} mm, e o cone ficaria fora dele`);
  const cone = {
    perfil: [...suave.map(([raio, distancia]) => [m(raio), m(t.cone.proa + distancia)]), [0, m(base)]],
    lados: t.cone.lados,
    em: [eixo[0], eixo[1], 0],
  };

  /* A pá: a chamada da família, com o material da hélice, e a pose. O esboço gira a pá em z em torno da raiz, que é a origem da pá, e
     leva a raiz ao ponto do eixo mais `raiz`. O arranjo gira em torno do eixo da hélice, e o pivô só importa em x e y. */
  const p = t.pa;
  const chamada = chamar(registroDeFamilias().obter('superficie-aerodinamica'), 'pa1', {
    perfil: p.perfil, envergadura: p.envergadura, cordaNaRaiz: p.cordaNaRaiz, cordaNaPonta: p.cordaNaPonta,
  });
  const pa = {
    chamada: { ...chamada, argumentos: { ...chamada.argumentos, materialDaPele: 'helice' } },
    giro: p.giro,
    desloca: t.eixo.map((v, k) => m(v + p.raiz[k])),
    pivo: [eixo[0], eixo[1], 0],
    total: p.total,
  };

  return { cone, pa };
}

/* Identidade estrutural dos passos, escolhida aqui. A pá da família leva a origem `loft` 1, e o resto fica acima dela. */
const ID = { cone: 100, arranjo: 200 };
const PA = { op: 'loft', id: 1 };

export const MATERIAIS = {
  helice: { cor: '#b8c4d0', metalicidade: 0.3, aspereza: 0.45 },
};

/* O ângulo, em graus, a partir do qual a quina fica nítida no sombreado liso: a base do cone, de 76 graus contra a lateral, fica; o
   perfil do cone, que vira menos de 15 graus por anel, fica liso. */
const ANGULO_LISO = 30;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];

  /* O cone. */
  const sel = { origem: { op: 'lathe', id: ID.cone } };
  passos.push(['lathe', { origemId: ID.cone, eixo: 'z', lados: P.cone.lados, perfil: P.cone.perfil, em: P.cone.em }]);
  passos.push(['parte', { nome: 'cone', sel }]);
  passos.push(['material', { usa: 'helice', sel }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel }]);

  /* A primeira pá: a expansão da família, sem a parte `fixa` e sem as portas, na pose do esboço. */
  const { passos: daFamilia } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [P.pa.chamada]);
  passos.push(...daFamilia.filter(([operacao]) => operacao !== 'parte' && operacao !== 'publicarPorta'));
  passos.push(['rotaciona', { eixo: 'z', graus: P.pa.giro, pivo: [0, 0, 0], sel: { origem: PA } }]);
  passos.push(['transladar', { d: P.pa.desloca, sel: { origem: PA } }]);

  /* As outras quatro, em arranjo radial de volta inteira em torno do eixo da hélice, cada uma com o nome dela. O arranjo vem antes de
     nomear a primeira, porque a cópia leva a parte da fonte e `parte` não toma face que já tem dona. */
  const copias = PAS.slice(1);
  passos.push(['arranja', {
    modo: 'radial', total: P.pa.total, eixo: 'z', volta: 360, pivo: P.pa.pivo, origemId: ID.arranjo, derivaDe: PA, sel: { origem: PA }, nomes: copias,
  }]);
  passos.push(['parte', { nome: PAS[0], sel: { origem: PA } }]);
  for (const nome of copias) passos.push(['parte', { nome, sel: { origem: { op: 'arranja', id: ID.arranjo, de: PA, nome } } }]);

  return passos;
}

/* A caixa da pá 1 na pose, em milímetro. O desenho da pá é o da família, e a conferência dele é a do `REFINA.esboco`; aqui a pá da
   família é executada sozinha, sem a pose, e a pose (o giro em z e o deslocamento da raiz) é aplicada aos vértices em JavaScript, para o
   ponto declarado provar que `rotaciona` e `transladar` fizeram o que a TABELA diz. */
function caixaDaPa(t) {
  const P = derivar(t);
  const { passos } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [P.pa.chamada]);
  const { V } = nucleo(passos.filter(([operacao]) => operacao === 'loft'), {}, {}, {}, null, []);
  const rad = (P.pa.giro * Math.PI) / 180;
  const [c, s] = [Math.cos(rad), Math.sin(rad)];
  const postos = [...V.values()].map(([x, y, z]) => [c * x - s * y + P.pa.desloca[0], s * x + c * y + P.pa.desloca[1], z + P.pa.desloca[2]].map((v) => v * 1000));
  return {
    min: [0, 1, 2].map((k) => Math.min(...postos.map((p) => p[k]))),
    max: [0, 1, 2].map((k) => Math.max(...postos.map((p) => p[k]))),
  };
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. Do cone, os extremos: a ponta em z `proa`, a base em z `proa`
   mais o comprimento do perfil, e o raio do perfil no ponto mais largo em x e em y em torno do eixo. Da pá 1, a raiz e a ponta em x, que
   são o `raiz` da TABELA mais o eixo e esse valor mais a envergadura (a ponta a 1090 mm do eixo), e o resto da caixa vem da caixa da pá. */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  const raio = Math.max(...perfilSuave(t.cone.perfil, t.cone.trechos).map(([r]) => r));
  const base = t.cone.proa + t.cone.perfil[t.cone.perfil.length - 1][1];
  const cone = {
    min: [t.eixo[0] - raio, t.eixo[1] - raio, t.cone.proa],
    max: [t.eixo[0] + raio, t.eixo[1] + raio, base],
  };
  const caixa = caixaDaPa(t);
  const raiz = t.eixo[0] + t.pa.raiz[0];
  return [
    { nome: 'ponta do cone, embaixo e à esquerda', parte: 'cone', medida: 'minimo', em: cone.min, toleranciaMm: tolerancia },
    { nome: 'base do cone, em cima e à direita', parte: 'cone', medida: 'maximo', em: cone.max, toleranciaMm: tolerancia },
    { nome: 'raiz da pá 1, a menor extensão em x', parte: 'pa1', medida: 'minimo', em: [raiz, caixa.min[1], caixa.min[2]], toleranciaMm: tolerancia },
    { nome: 'ponta da pá 1, a maior extensão em x', parte: 'pa1', medida: 'maximo', em: [raiz + t.pa.envergadura, caixa.max[1], caixa.max[2]], toleranciaMm: tolerancia },
  ];
}

const receita = {
  meta: { nome: 'aviao/helice', desc: 'hélice do avião de pequeno porte: o cone e as cinco pás' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'a proa do avião em z 0; o eixo da hélice em x 0 e y 1330; y para cima com o chão em y 0; x para a direita do piloto' },
  PLANO: {
    objeto: 'hélice de cinco pás de um avião monomotor de pequeno porte, parada: o cone na frente do capô e as cinco pás saindo dele em arranjo radial',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'diâmetro da hélice no esboço, de ponta a ponta das pás (o dobro de 1090 mm do eixo à ponta)', milimetros: 2180 },
    partes: [
      {
        nome: 'cone',
        forma: 'cone da hélice, de revolução em torno do eixo z, da proa em z 8 até dentro do lábio do capô, com 424 mm de diâmetro no ponto mais largo, em z 452, e 364 mm na base, em z 606',
        tecnica: 'revolução pelo perfil do esboço com sombreado liso',
      },
      ...PAS.map((nome, i) => ({
        nome,
        forma: `pá ${i + 1} de 5, torcida, com a raiz dentro do cone e a ponta a 1090 mm do eixo, a ${72 * i} graus da primeira em torno do eixo da hélice`,
        tecnica: 'a pá da família superficie-aerodinamica, perfil pa-de-helice, com os parâmetros do esboço, expandida nos PASSOS e girada em torno do eixo da hélice',
      })),
    ],
    criteriosDeReprovacao: [
      'pá reta, sem a torção da família',
      'pá que não entra no cone, ou solta',
      'pás fora do arranjo radial de 72 graus',
      'cone facetado em vez de liso',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: PAS.map((pa) => ({ par: [pa, 'cone'], motivo: 'a raiz da pá entra no cone' })),
  formas: { cone: 'solido', ...Object.fromEntries(PAS.map((pa) => [pa, 'solido'])) },
  REFINA: {
    andaime: '../../andaime.json',
    /* só a primeira pá tem volume no andaime; as outras quatro são giradas, que a N2 não traduz, e se conferem só pelo esboço */
    partes: { cone: 'cone', pa1: 'helice-pa' },
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: { cone: 'cone', ...FORMA_DA_PA }, minimo: 0.95 },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
