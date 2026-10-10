/* Orientação da malha do prisma na forma global N2. Para cada combinação de eixo de extrusão, ordem dos eixos do perfil e
   sentido do contorno (doze no total), a malha precisa ser fechada, com cada aresta percorrida nos dois sentidos, e ter
   volume com sinal positivo, o que só acontece quando as normais saem para fora. */
import { describe, expect, it } from 'vitest';
import { compilarBlocagemGlobal } from './forma-global.js';

const EIXOS = { direita: '+x', cima: '+y', frente: '+z' };
const QUADRO = { contornos: [{ id: 'massa', papel: 'massa-primaria', pontos: [[-1000, -1000], [1000, -1000], [1000, 1000], [-1000, 1000]] }] };

function alvoLargo() {
  return {
    formato: 'mecanifica.alvo-forma-global@2', id: 'alvo-prisma', objetivo: 'prisma', familia: 'peca-mecanica',
    intencao: 'conferir a orientação de um prisma', unidade: 'mm', eixos: EIXOS,
    envelope: { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] },
    procedencia: { tipo: 'teste', referencias: ['repo://src/autoria/forma-global-prisma.test.mjs'] },
    rubrica: { id: 'prisma', categoriaEsperada: 'prisma', criterios: ['categoria-identificavel'], papeisAuxiliares: [] },
    landmarks: [{ id: 'origem', posicao: [0, 0, 0], tolerancia: 10 }], regioesObrigatorias: ['corpo'],
    vistas: { frontal: QUADRO, direita: QUADRO, superior: QUADRO },
    limiares: { iouMinimo: 0, desvioMaximo: 1, erroEnvelopeRelativoMaximo: 1, erroLandmarkNormalizadoMaximo: 1 },
    orcamento: { volumesMaximos: 8, triangulosMaximos: 20000, resolucaoGrade: 64 }, rejeicoes: ['forma-parcial'],
  };
}

function andaimeCom(volume) {
  return {
    formato: 'mecanifica.andaime-global@2', id: 'andaime-prisma', objetivo: 'prisma', alvo: 'alvo-prisma', familia: 'peca-mecanica',
    intencao: 'conferir a orientação de um prisma', unidade: 'mm', eixos: EIXOS,
    envelope: { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] }, landmarks: [{ id: 'origem', posicao: [0, 0, 0] }],
    volumes: [volume],
  };
}

/* Contorno não simétrico e convexo, nos dois sentidos. Com o centro deslocado, nenhuma soma de coordenadas se anula por
   acaso. */
const ANTIHORARIO = [[-20, -10], [30, -12], [25, 18], [-15, 14]];
const HORARIO = [...ANTIHORARIO].reverse();
const CENTRO = [5, 7, 11];

/* Permutações: para cada extrusão, as duas ordens possíveis dos outros dois eixos. Seis ordens no total. */
const COMBINACOES = [];
for (const extrusao of ['x', 'y', 'z']) {
  const outros = ['x', 'y', 'z'].filter((eixo) => eixo !== extrusao);
  COMBINACOES.push([extrusao, outros], [extrusao, [...outros].reverse()]);
}

function malhaDoPrisma(extrusao, eixosPerfil, perfil) {
  const volume = { id: 'prisma', regioes: ['corpo'], tipo: 'prisma', centro: CENTRO, eixoExtrusao: extrusao, eixosPerfil, comprimento: 40, perfil };
  return compilarBlocagemGlobal({ alvo: alvoLargo(), andaime: andaimeCom(volume) }).malha;
}

/* Volume pelo teorema da divergência: soma de det(a, b, c) / 6 sobre os triângulos. Positivo quando as normais saem. */
function volumeComSinal({ vertices, faces }) {
  let total = 0;
  for (const { vertices: [i, j, k] } of faces) {
    const [a, b, c] = [vertices[i], vertices[j], vertices[k]];
    total += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return total;
}

/* Cada aresta orientada aparece exatamente uma vez, e a aresta oposta também: a malha é fechada e nenhum triângulo está
   virado do avesso em relação aos vizinhos. */
function arestasFechadas({ faces }) {
  const contagem = new Map();
  for (const { vertices: [i, j, k] } of faces) {
    for (const [p, q] of [[i, j], [j, k], [k, i]]) contagem.set(`${p}>${q}`, (contagem.get(`${p}>${q}`) ?? 0) + 1);
  }
  return [...contagem.keys()].every((aresta) => {
    const [p, q] = aresta.split('>');
    return contagem.get(aresta) === 1 && contagem.get(`${q}>${p}`) === 1;
  });
}

/* Normal para fora de cada triângulo: aponta para longe do centro do volume. Para um prisma convexo isso vale em toda face. */
function facesParaFora({ vertices, faces }) {
  const centro = [0, 1, 2].map((eixo) => vertices.reduce((soma, p) => soma + p[eixo], 0) / vertices.length);
  return faces.every(({ vertices: [i, j, k] }) => {
    const [a, b, c] = [vertices[i], vertices[j], vertices[k]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const meio = [0, 1, 2].map((eixo) => (a[eixo] + b[eixo] + c[eixo]) / 3 - centro[eixo]);
    return normal[0] * meio[0] + normal[1] * meio[1] + normal[2] * meio[2] > 0;
  });
}

describe('malha do prisma: normais para fora em toda combinação de eixos', () => {
  for (const [extrusao, eixosPerfil] of COMBINACOES) {
    for (const [sentido, perfil] of [['antihorario', ANTIHORARIO], ['horario', HORARIO]]) {
      it(`extrusão ${extrusao}, perfil ${eixosPerfil.join('')}, contorno ${sentido}: volume positivo, fechada e normais para fora`, () => {
        const malha = malhaDoPrisma(extrusao, eixosPerfil, perfil);
        expect(volumeComSinal(malha)).toBeGreaterThan(0);
        expect(arestasFechadas(malha)).toBe(true);
        expect(facesParaFora(malha)).toBe(true);
      });
    }
  }

  it('o volume é o mesmo nas doze combinações: a permutação dos eixos não muda a forma, só a orientação', () => {
    const volumes = COMBINACOES.flatMap(([extrusao, eixosPerfil]) => [ANTIHORARIO, HORARIO]
      .map((perfil) => volumeComSinal(malhaDoPrisma(extrusao, eixosPerfil, perfil))));
    for (const volume of volumes) expect(volume).toBeCloseTo(volumes[0], 6);
  });
});
