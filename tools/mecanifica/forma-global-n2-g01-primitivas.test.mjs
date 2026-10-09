/* G01 com um andaime que usa as seis primitivas do nível zero (cone, esfera, anel, revolução, extrusão côncava e tubo): um
   reservatório com base em anel, corpo e cúpula, bico em tronco de cone, suporte em L e saída lateral em tubo curvo. O alvo
   é desenhado à mão, em polígonos por vista, sem derivar nada da malha. O mesmo consumidor caixa-preta do N2 compila, avalia
   e valida o resultado nos schemas. */
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { criarServicoAutoria3DNativa } from '../../procedural/servicos/fluxo-autoria.js';

const EIXOS = { direita: '+x', cima: '+y', frente: '+z' };
const arredondar = (x) => Math.round(x * 1000) / 1000;
const circulo = (cx, cy, r, n = 96) => Array.from({ length: n }, (_, i) => [arredondar(cx + r * Math.cos(2 * Math.PI * i / n)), arredondar(cy + r * Math.sin(2 * Math.PI * i / n))]);
const retangulo = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const arco = (cx, cy, r, de, ate, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const t = (de + (ate - de) * i / n) * Math.PI / 180;
  return [arredondar(cx + r * Math.cos(t)), arredondar(cy + r * Math.sin(t))];
});

const PERFIL_CORPO = [[0, 0], [60, 0], [60, 160], [0, 160]];
const PERFIL_SUPORTE = [[-100, 20], [-55, 20], [-55, 35], [-85, 35], [-85, 100], [-100, 100]];
const CAMINHO_SAIDA = [[40, 90, 0], [85, 90, 0], [85, 150, 0]];

/* Saída lateral vista de frente: faixa de 20 mm que sobe com curva de raio 20 mm na linha de centro (30 por fora e 10 por dentro). */
const SAIDA_FRONTAL = [
  [40, 80], ...arco(65, 110, 30, -90, 0), [95, 150], [75, 150], ...arco(65, 110, 10, 0, -90), [40, 100],
];

function alvo() {
  return {
    formato: 'mecanifica.alvo-forma-global@2', id: 'alvo-reservatorio', objetivo: 'reservatorio-n2', familia: 'peca-mecanica',
    intencao: 'reservatório com base em anel, corpo e cúpula, bico em tronco, suporte em L e saída lateral curva', unidade: 'mm', eixos: EIXOS,
    envelope: { min: [-100, 0, -100], max: [100, 300, 100] },
    procedencia: { tipo: 'medidas-declaradas', referencias: ['repo://tools/mecanifica/forma-global-n2-g01-primitivas.test.mjs'] },
    rubrica: {
      id: 'reservatorio-forma-global', categoriaEsperada: 'reservatorio',
      criterios: ['categoria-identificavel', 'leitura-sem-apoios'], papeisAuxiliares: ['apoio-reconhecimento'],
    },
    landmarks: [
      { id: 'boca-da-saida', posicao: [85, 150, 0], tolerancia: 15 },
      { id: 'topo', posicao: [0, 300, 0], tolerancia: 10 },
    ],
    regioesObrigatorias: ['base', 'bico', 'corpo', 'cupula', 'saida-lateral', 'suporte'],
    vistas: {
      frontal: {
        contornos: [
          { id: 'base', papel: 'massa-primaria', pontos: retangulo(-100, 0, 100, 20) },
          { id: 'corpo', papel: 'massa-primaria', pontos: retangulo(-60, 20, 60, 180) },
          { id: 'cupula', papel: 'massa-primaria', pontos: circulo(0, 180, 60) },
          { id: 'bico', papel: 'massa-primaria', pontos: [[-30, 240], [30, 240], [10, 300], [-10, 300]] },
          { id: 'suporte', papel: 'apoio-reconhecimento', pontos: PERFIL_SUPORTE },
          { id: 'saida', papel: 'apoio-reconhecimento', pontos: SAIDA_FRONTAL },
        ],
      },
      direita: {
        contornos: [
          { id: 'base', papel: 'massa-primaria', pontos: retangulo(-100, 0, 100, 20) },
          { id: 'corpo', papel: 'massa-primaria', pontos: retangulo(-60, 20, 60, 180) },
          { id: 'cupula', papel: 'massa-primaria', pontos: circulo(0, 180, 60) },
          { id: 'bico', papel: 'massa-primaria', pontos: [[-30, 240], [30, 240], [10, 300], [-10, 300]] },
        ],
      },
      superior: { contornos: [{ id: 'base', papel: 'massa-primaria', pontos: circulo(0, 0, 100) }] },
    },
    limiares: { iouMinimo: 0.98, desvioMaximo: 0.03, erroEnvelopeRelativoMaximo: 0.02, erroLandmarkNormalizadoMaximo: 1 },
    orcamento: { volumesMaximos: 8, triangulosMaximos: 20000, resolucaoGrade: 96 }, rejeicoes: ['forma-parcial'],
  };
}

function andaime(ajuste = (volumes) => volumes) {
  const volumes = [
    { id: 'base', regioes: ['base'], tipo: 'anel', centro: [0, 10, 0], eixo: 'y', raioExterno: 100, raioInterno: 60, espessura: 20, segmentos: 48 },
    { id: 'corpo', regioes: ['corpo'], tipo: 'revolucao', centro: [0, 100, 0], eixo: 'y', perfil: PERFIL_CORPO, segmentos: 48 },
    { id: 'cupula', regioes: ['cupula'], tipo: 'esfera', centro: [0, 180, 0], raio: 60, segmentos: 48 },
    { id: 'bico', regioes: ['bico'], tipo: 'cone', centro: [0, 270, 0], eixo: 'y', raioBase: 30, raioTopo: 10, comprimento: 60, segmentos: 48 },
    { id: 'suporte', regioes: ['suporte'], tipo: 'extrusao', centro: [0, 0, 0], eixoExtrusao: 'z', eixosPerfil: ['x', 'y'], comprimento: 40, perfil: PERFIL_SUPORTE },
    { id: 'saida', regioes: ['saida-lateral'], tipo: 'tubo', centro: [0, 0, 0], caminho: CAMINHO_SAIDA, raio: 10, raioCurva: 20, segmentos: 32 },
  ];
  return {
    formato: 'mecanifica.andaime-global@2', id: 'andaime-reservatorio', objetivo: 'reservatorio-n2', alvo: 'alvo-reservatorio', familia: 'peca-mecanica',
    intencao: 'reservatório do nível zero com as seis primitivas', unidade: 'mm', eixos: EIXOS,
    envelope: { min: [-100, 0, -100], max: [100, 300, 100] },
    landmarks: [{ id: 'boca-da-saida', posicao: [85, 150, 0] }, { id: 'topo', posicao: [0, 300, 0] }], volumes: ajuste(volumes),
  };
}

const criticaAprovada = (a) => ({
  formato: 'mecanifica.critica-alvo-forma-global@1', papel: 'critico-visual-independente', contexto: 'alvo-e-rubrica-sem-blocagem',
  alvo: a.id, estado: 'aprovada', categoriaReconhecida: a.rubrica.categoriaEsperada,
  criterios: a.rubrica.criterios.map((id) => ({ id, estado: 'passa', achado: `critério '${id}' coberto pela rubrica.` })), achados: [],
});

const memoria = new Map();
function medir(ajuste) {
  if (!ajuste) {
    if (!memoria.has('base')) memoria.set('base', medirSemMemoria());
    return memoria.get('base');
  }
  return medirSemMemoria(ajuste);
}
function medirSemMemoria(ajuste) {
  const forma = criarServicoAutoria3DNativa().formaGlobal, a = alvo();
  const avaliacaoAlvo = forma.avaliarAlvo(a, criticaAprovada(a)), blocagem = forma.compilar(a, andaime(ajuste));
  return { forma, a, avaliacaoAlvo, blocagem, avaliacao: forma.avaliar(a, blocagem, avaliacaoAlvo) };
}

describe('N2 — G01 com as primitivas do nível zero', () => {
  it('aprova o reservatório de seis primitivas nas três silhuetas, no envelope e nas regiões', () => {
    const { blocagem, avaliacao, avaliacaoAlvo } = medir();
    expect(avaliacaoAlvo.estado).toBe('aprovado');
    expect(blocagem.volumes.map(({ id, tipo }) => [id, tipo])).toEqual([
      ['base', 'anel'], ['bico', 'cone'], ['corpo', 'revolucao'], ['cupula', 'esfera'], ['saida', 'tubo'], ['suporte', 'extrusao'],
    ]);
    perto(blocagem.envelopeDerivado.min, [-100, 0, -100]);
    perto(blocagem.envelopeDerivado.max, [100, 300, 100]);
    expect(avaliacao.diagnosticos).toEqual([]);
    expect(avaliacao.estado).toBe('aprovado');
    expect(avaliacao.vistas.map(({ id, estado }) => [id, estado])).toEqual([['frontal', 'aprovada'], ['direita', 'aprovada'], ['superior', 'aprovada']]);
    for (const { metricas } of avaliacao.vistas) {
      expect(metricas.iou).toBeGreaterThanOrEqual(0.98);
      expect(metricas.desvioMaximo).toBeLessThanOrEqual(0.03);
    }
    expect(avaliacao.envelope.erroRelativoMaximo).toBeLessThanOrEqual(1e-6);
    expect(avaliacao.regioes).toEqual({ estado: 'aprovado', ausentes: [] });
    expect(avaliacao.landmarks.map(({ estado }) => estado)).toEqual(['aprovado', 'aprovado']);
    expect(avaliacao.orcamento.estado).toBe('aprovado');
  });

  it('é determinística: a blocagem e a avaliação repetidas saem idênticas', () => {
    const um = medir(), dois = medirSemMemoria();
    expect(JSON.stringify(dois.blocagem)).toBe(JSON.stringify(um.blocagem));
    expect(JSON.stringify(dois.avaliacao)).toBe(JSON.stringify(um.avaliacao));
  });

  it('reprova pelo envelope quando o bico perde metade do comprimento', () => {
    const { avaliacao } = medir((volumes) => volumes.map((v) => (v.id === 'bico' ? { ...v, comprimento: 30, centro: [0, 255, 0] } : v)));
    expect(avaliacao.estado).toBe('reprovado');
    expect(avaliacao.envelope.estado).toBe('reprovado');
    expect(avaliacao.diagnosticos.map(({ codigo }) => codigo)).toContain('envelope-reprovado');
  });

  it('reprova pela região obrigatória quando a saída lateral em tubo não existe', () => {
    const { avaliacao } = medir((volumes) => volumes.filter((v) => v.id !== 'saida'));
    expect(avaliacao.estado).toBe('reprovado');
    expect(avaliacao.regioes).toEqual({ estado: 'reprovado', ausentes: ['saida-lateral'] });
    expect(avaliacao.diagnosticos.map(({ codigo }) => codigo)).toContain('regiao-global-ausente');
  });

  it('reprova pela silhueta quando a cúpula esférica vira uma esfera pequena', () => {
    const { avaliacao } = medir((volumes) => volumes.map((v) => (v.id === 'cupula' ? { ...v, raio: 25 } : v)));
    expect(avaliacao.estado).toBe('reprovado');
    const frontal = avaliacao.vistas.find(({ id }) => id === 'frontal');
    expect(frontal.estado).toBe('reprovada');
    expect(avaliacao.diagnosticos.map(({ codigo }) => codigo)).toContain('silhueta-reprovada');
  });

  it('recusa na compilação o volume inválido, com o campo, o valor e o aceito', () => {
    const forma = criarServicoAutoria3DNativa().formaGlobal;
    const invalido = andaime((volumes) => volumes.map((v) => (v.id === 'bico' ? { ...v, raioTopo: 30 } : v)));
    expect(() => forma.compilar(alvo(), invalido)).toThrow(/volumes\[3\]\.raioTopo: recebeu 30; aceita valor diferente de raioBase \(30\)/);
  });

  it('publica o andaime, a blocagem e a avaliação nos schemas', () => {
    const { forma, a, blocagem, avaliacao } = medir();
    const servico = criarServicoAutoria3DNativa(), ajv = new Ajv2020({ strict: false, allErrors: true });
    Object.values(servico.schemas().contratos).forEach((schema) => ajv.addSchema(schema));
    for (const [id, valor] of [
      ['mecanifica.alvo-forma-global@2', forma.normalizarAlvo(a)], ['mecanifica.andaime-global@2', forma.normalizarAndaime(andaime())],
      ['mecanifica.blocagem-global@2', blocagem], ['mecanifica.avaliacao-forma-global@1', avaliacao],
    ]) expect(ajv.validate(id, valor), `${id}: ${ajv.errorsText()}`).toBe(true);
  });

  it('recusa nos schemas o volume que o contrato recusa', () => {
    const servico = criarServicoAutoria3DNativa(), ajv = new Ajv2020({ strict: false, allErrors: true });
    Object.values(servico.schemas().contratos).forEach((schema) => ajv.addSchema(schema));
    const ruim = andaime((volumes) => volumes.map((v) => (v.id === 'cupula' ? { ...v, segmentos: 30 } : v)));
    expect(ajv.validate('mecanifica.andaime-global@2', ruim)).toBe(false);
  });
});

function perto(lista, esperado) { lista.forEach((valor, i) => expect(valor).toBeCloseTo(esperado[i], 6)); }
