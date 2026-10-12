/* A forma de família do esboço (`tipo: "familia"`, `src/familia.js`): o módulo recebe a malha de um provedor injetado e a trata como
   as outras formas, em cada leitura (posição por âncora e relação, desenho, gate de contato, medidas, descrever, formas resolvidas).
   O provedor aqui é de mentira, um tubo de parede com uma porta na boca, para provar o módulo sem importar o núcleo; a prova com a
   roda 2.0 e o cilindro hidráulico de verdade está em `tools/mecanifica/esboco-familias.test.mjs` (o caso do trem do avião, E7 do
   `ATRITOS.md`). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ancorasDe, desenharEsboco, ErroDeEsboco, nomesDeAncoras, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { definirProvedorDeFamilias, malhaDaFamilia, temProvedorDeFamilias } from '../src/familia.js';
import { verificarContato } from '../src/contato.js';
import { formatarDescricao, formatarForma, medirEsboco } from '../src/descrever.js';
import { formasResolvidas } from '../src/formas-resolvidas.js';
import { conferirPlano, visiveisDoEsboco } from '../src/plano.js';
import { mapaDeLigacoes } from '../src/mapa-de-ligacoes.js';
import { tuboOco } from './malha-de-prova.js';

const chamadas = [];
/* A família `tubo-de-prova`: um tubo de parede ao longo de x, com `comprimento` e `diametro` em milímetro, o perfil `curto` e a porta
   `boca` no centro da face do fim, como `chamar` as recusa e entrega. */
function provedor({ familia, perfil, parametros }) {
  chamadas.push({ familia, perfil, parametros });
  if (familia !== 'tubo-de-prova') throw new Error(`família '${familia}': campo 'familia'; aceito: uma família registrada: tubo-de-prova`);
  if (perfil !== undefined && perfil !== 'curto') throw new Error(`família 'tubo-de-prova': parametros.perfil recebeu ${JSON.stringify(perfil)}; aceito: um perfil da família: curto`);
  const base = { comprimento: perfil === 'curto' ? 60 : 100, diametro: 40, ...parametros };
  for (const nome of Object.keys(parametros)) if (!['comprimento', 'diametro'].includes(nome)) throw new Error(`família 'tubo-de-prova': parametros.${nome} recebeu ${parametros[nome]}; aceito: parâmetro conhecido da família: comprimento, diametro`);
  const dado = tuboOco({ rExt: base.diametro / 2, rInt: base.diametro / 4, comprimento: base.comprimento, eixo: 'x', ancoras: { boca: [base.comprimento / 2, 0, 0] } });
  return { ...dado, familia, ...(perfil === undefined ? {} : { perfil }), portas: [{ id: 'boca', tipo: 'anel', papel: 'recebe', eixo: [1, 0, 0] }] };
}

beforeEach(() => { chamadas.length = 0; definirProvedorDeFamilias(provedor); });
afterEach(() => definirProvedorDeFamilias(null));

const tubo = (extra = {}) => ({ id: 'tubo', tipo: 'familia', familia: 'tubo-de-prova', ...extra });
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], ...extra });
const resolvidas = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'opção 1', x.pontos); };
const resolvida = (e, id) => resolvidas(e).find((r) => r.id === id);
const perto = (v, alvo, casas = 3) => v.forEach((x, i) => expect(x).toBeCloseTo(alvo[i], casas));

describe('a forma de família resolvida', () => {
  it('tem a caixa da superfície, centrada como toda forma, e a porta da família como âncora', () => {
    const r = resolvida(esboco([tubo({ centro: [10, 20, 30] })]), 'tubo');
    perto(r.min, [-40, 0, 10]);
    perto(r.max, [60, 40, 50]);
    const a = ancorasDe(r);
    expect(Object.keys(a)).toEqual(['centro', 'boca', '+x', '-x', '+y', '-y', '+z', '-z']);
    perto(a.boca, [60, 20, 30]);
    expect(nomesDeAncoras('familia', tubo())).toEqual(['centro', 'boca', '+x', '-x', '+y', '-y', '+z', '-z']);
  });

  it('o perfil e os ajustes chegam ao provedor, e a mesma chamada é lida uma vez só', () => {
    const e = esboco([tubo({ id: 'a', perfil: 'curto', parametros: { diametro: 30 } }), tubo({ id: 'b', perfil: 'curto', parametros: { diametro: 30 }, centro: [0, 100, 0] }), tubo({ id: 'c', centro: [0, 200, 0] })]);
    const rs = resolvidas(e);
    expect(chamadas).toEqual([
      { familia: 'tubo-de-prova', perfil: 'curto', parametros: { diametro: 30 } },
      { familia: 'tubo-de-prova', perfil: undefined, parametros: {} },
    ]);
    perto(rs[0].max.map((v, i) => v - rs[0].min[i]), [60, 30, 30]);
    perto(rs[2].max.map((v, i) => v - rs[2].min[i]), [100, 40, 40]);
    expect(malhaDaFamilia(tubo({ id: 'a', perfil: 'curto', parametros: { diametro: 30 } }))).toBe(rs[0].prisma.malha);
  });

  it('os ajustes aceitam parâmetro do esboço e expressão, resolvidos antes de a família ser chamada', () => {
    const e = esboco([tubo({ parametros: { comprimento: '=2*medida', diametro: 'medida' } })], { parametros: { medida: 25 } });
    const r = resolvida(e, 'tubo');
    perto(r.max.map((v, i) => v - r.min[i]), [50, 25, 25]);
    expect(chamadas[0].parametros).toEqual({ comprimento: 50, diametro: 25 });
  });

  it('é posicionada por `sobre`, `ponta` e `encaixa` pela âncora da porta, como as outras formas', () => {
    const base = caixa('base', [0, 10, 0], 200, 20, 200);
    const sobre = resolvida(esboco([base, tubo({ sobre: 'base' })]), 'tubo');
    expect(sobre.min[1]).toBeCloseTo(20, 6);
    const ponta = resolvida(esboco([base, tubo({ ponta: { id: 'base', lado: '+x' } })]), 'tubo');
    expect(ponta.min[0]).toBeCloseTo(100, 6);
    /* a boca do tubo vai ao ponto `base.+y` com o tubo girado de 90 graus em z: o eixo x do tubo aponta para cima e a boca fica ali */
    const encaixado = resolvida(esboco([base, tubo({ rotacao: [0, 0, 90], encaixa: { ancora: 'boca', em: 'base.+y' } })]), 'tubo');
    perto(ancorasDe(encaixado).boca, [0, 20, 0]);
    expect(encaixado.min[1]).toBeCloseTo(20 - 100, 6);
  });

  it('as âncoras das portas giram com a forma e valem em `centro`, `de` e `para` das outras formas', () => {
    const e = esboco([tubo({ id: 'rodado', rotacao: [0, 0, 90] }), { id: 'haste', tipo: 'cilindro', diametro: 6, de: 'rodado.boca', para: { ancora: 'rodado.boca', mm: [0, 30, 0] } }]);
    const r = resolvida(e, 'rodado');
    perto(ancorasDe(r).boca, [0, 50, 0]);
    const h = resolvida(e, 'haste');
    perto(h.min, [-3, 50, -3]);
    perto(h.max, [3, 80, 3]);
  });

  it('a cópia por espelho e por arranjo leva as âncoras da fonte refletidas e deslocadas', () => {
    const e = esboco([tubo({ id: 'tuboE', centro: [100, 0, 0] }), { id: 'tuboD', espelha: { forma: 'tuboE', eixo: 'x' } }, { arranja: { forma: 'tuboE', modo: 'linear', total: 2, passo: [0, 80, 0] } }]);
    const rs = resolvidas(e);
    perto(ancorasDe(rs.find((r) => r.id === 'tuboE')).boca, [150, 0, 0]);
    perto(ancorasDe(rs.find((r) => r.id === 'tuboD')).boca, [-150, 0, 0]);
    expect(rs.map((r) => r.id)).toEqual(['tuboE', 'tuboD', 'tuboE1']);
    perto(ancorasDe(rs[2]).boca, [150, 80, 0]);
  });

  it('recusa a forma mal escrita e a chamada que a família recusa, com a mensagem dela', () => {
    expect(() => desenharEsboco(esboco([{ id: 't', tipo: 'familia' }]))).toThrow(/precisa de "familia", o id de uma família do registro/);
    expect(() => desenharEsboco(esboco([tubo({ perfil: 3 })]))).toThrow(/"perfil" deve ser o nome de um perfil da família/);
    expect(() => desenharEsboco(esboco([tubo({ parametros: [1] })]))).toThrow(/"parametros" deve ser \{/);
    expect(() => desenharEsboco(esboco([tubo({ parametros: { diametro: true } })]))).toThrow(/o parâmetro "diametro" da família deve ser um número, o nome de um parâmetro do esboço ou "=expressão"/);
    expect(() => desenharEsboco(esboco([tubo({ diametro: 30 })]))).toThrow(/o campo "diametro" não existe em familia.*campos válidos: .*familia, perfil, parametros/);
    expect(() => desenharEsboco(esboco([tubo({ parametros: { espessura: 3 } })]))).toThrow(/forma "tubo": a família "tubo-de-prova" recusa a chamada: .*parametros.espessura/);
    expect(() => desenharEsboco(esboco([tubo({ perfil: 'longo' })]))).toThrow(/a família "tubo-de-prova" recusa a chamada: .*aceito: um perfil da família: curto/);
    expect(() => desenharEsboco(esboco([tubo({ familia: 'outra' })]))).toThrow(/a família "outra" recusa a chamada: .*uma família registrada: tubo-de-prova/);
    expect(() => desenharEsboco(esboco([tubo({ de: [0, 0, 0], para: [0, 1, 0] })]))).toThrow(/o campo "de" não existe em familia|"de"\/"para" valem só em/);
    let erro;
    try { desenharEsboco(esboco([tubo({ familia: 'outra' })])); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(ErroDeEsboco);
  });

  it('sem provedor instalado recusa a forma dizendo o que falta', () => {
    definirProvedorDeFamilias(null);
    expect(temProvedorDeFamilias()).toBe(false);
    expect(() => desenharEsboco(esboco([tubo()]))).toThrow(/a forma é da família "tubo-de-prova", e esta leitura não tem o adaptador das famílias/);
    expect(() => definirProvedorDeFamilias('x')).toThrow(/o provedor deve ser uma função/);
    /* o resto do esboço continua sem o provedor */
    expect(desenharEsboco(esboco([caixa('a', [0, 0, 0])])).svg).toContain('<svg');
  });
});

describe('o desenho da forma de família', () => {
  it('desenha a superfície, com o oco do tubo visto de frente, e é determinístico', () => {
    const e = esboco([tubo({ cor: 'azul' })], { vista: 'lateral' });
    const a = desenharEsboco(e, { camada: true });
    const b = desenharEsboco(e, { camada: true });
    expect(a.svg).toBe(b.svg);
    expect(JSON.stringify(a.camada)).toBe(JSON.stringify(b.camada));
    const forma = a.camada.formas.find((f) => f.id === 'tubo');
    expect(forma.faces.length).toBeGreaterThan(30);
    expect(forma.tracos.length).toBeGreaterThan(0);
    /* na vista de frente do tubo (olhando ao longo de x) vê-se a parede do furo: faces de dentro além das de fora */
    const topo = desenharEsboco(esboco([tubo({ cor: 'azul' })], { vista: 'superior' }), { camada: true }).camada.formas[0];
    expect(topo.faces.length).toBeGreaterThan(15);
  });

  it('o corte mostra a seção do oco, e a vista de cima, a do tubo cortado ao meio', () => {
    const e = esboco([tubo({ cor: 'azul' })], { corte: { eixo: 'y', valor: 5 }, vista: 'isometrica' });
    const d = desenharEsboco(e);
    expect(d.svg).toContain('hachura');
  });

  it('os lados por escala e a prévia deixam a forma de família como está', () => {
    const e = esboco([tubo()], { ladosPorEscala: true });
    expect(desenharEsboco(e).svg).toBe(desenharEsboco(esboco([tubo()])).svg);
    expect(() => desenharEsboco(esboco([tubo()], { previa: true }))).not.toThrow();
  });
});

describe('o gate de contato com a forma de família', () => {
  const contato = { usar: true, tolerancia: 1, penetracao: 1, folga: 50 };
  const com = (formas) => verificarContato(esboco(formas, { contato }));
  const pino = (diametro) => ({ id: 'pino', tipo: 'cilindro', diametro, comprimento: 140, eixo: 'x', centro: [0, 20, 0] });

  it('o pino de 18 mm no furo de 20 mm entra sem atravessar a parede, e o de 26 mm atravessa', () => {
    const livre = com([tubo({ centro: [0, 20, 0] }), pino(18)]);
    expect(livre.achados.filter((a) => a.tipo === 'colisao')).toEqual([]);
    expect(livre.opcoes[0].atravessamentos ?? []).toEqual([]);
    const grosso = com([tubo({ centro: [0, 20, 0] }), pino(26)]);
    expect(grosso.achados.some((a) => a.tipo === 'colisao' && a.pecas.includes('tubo') && a.pecas.includes('pino'))).toBe(true);
  });

  it('uma esfera de 6 mm na parede (raio 15) colide, e no eixo do furo (raio 0) não', () => {
    const na = (y, z) => ({ id: 'bola', tipo: 'esfera', diametro: 6, centro: [0, y, z] });
    const parede = com([tubo({ centro: [0, 20, 0] }), na(35, 0)]);
    expect(parede.achados.some((a) => a.tipo === 'colisao')).toBe(true);
    const furo = com([tubo({ centro: [0, 20, 0] }), na(20, 0)]);
    expect(furo.achados.some((a) => a.tipo === 'colisao')).toBe(false);
  });

  it('a forma de família sobre uma base toca a base (o grupo conectado é um só) e a de longe fica solta', () => {
    const base = caixa('base', [0, 10, 0], 200, 20, 200);
    const ok = com([base, tubo({ sobre: 'base' })]);
    expect(ok.resultado).toBe('aprovado');
    const longe = com([base, tubo({ centro: [0, 400, 0] })]);
    expect(longe.achados.some((a) => a.tipo === 'longe' || a.tipo === 'voando')).toBe(true);
  });
});

describe('as medidas e a leitura em texto com a forma de família', () => {
  const formas = () => [caixa('base', [0, 10, 0], 200, 20, 200), tubo({ sobre: 'base', parametros: { comprimento: 80 } })];

  it('a caixa da forma e a distância entre âncoras de portas entram nas medidas do plano', () => {
    const e = esboco(formas(), { plano: { nivel: 'medio', medidas: [
      { nome: 'comprimentoDoTubo', valor: 80, unidade: 'mm', origem: 'ficha', tolerancia: 0.5, mede: { caixa: 'x', formas: ['tubo'] } },
      { nome: 'bocaAteABase', valor: 20, unidade: 'mm', origem: 'ficha', tolerancia: 0.5, mede: { distancia: ['tubo.boca', 'base.+y'], eixo: 'y' } },
    ] } });
    const x = expandirEsboco(e);
    const r = conferirPlano(x, visiveisDoEsboco(x));
    expect(r.achados).toEqual([]);
    expect(r.opcoes[0].medidas.map((m) => [m.nome, Math.round(m.medido_mm * 100) / 100])).toEqual([['comprimentoDoTubo', 80], ['bocaAteABase', 20]]);
  });

  it('o --descrever diz a família, o perfil, os ajustes, as partes, o volume, as portas com o eixo no mundo e as âncoras', () => {
    const e = esboco([tubo({ perfil: 'curto', rotacao: [0, 0, 90], parametros: { diametro: 30 } })]);
    const d = medirEsboco(e).descricao.opcoes[0].formas[0];
    expect(d).toMatchObject({ id: 'tubo', tipo: 'familia', familia: { id: 'tubo-de-prova', perfil: 'curto', ajustes: { diametro: 30 }, partes: ['corpo'], portas: [{ id: 'boca', tipo: 'anel', papel: 'recebe' }] } });
    expect(d.familia.volume_mm3).toBeGreaterThan(10000);
    perto(d.familia.portas[0].eixo, [0, 1, 0]);
    expect(d.eixo).toBeUndefined();
    expect(d.relacao).toBe('família tubo-de-prova, perfil curto, ajustes diametro 30');
    const texto = formatarDescricao(medirEsboco(e).descricao);
    expect(texto).toMatch(/família tubo \(perfil curto\): 1 partes \(corpo\), volume \d+ mm3; portas boca \(anel, recebe, eixo \[0 1 0\]\)/);
    expect(texto).toMatch(/âncoras tubo: centro \[0 0 0\]; boca /);
    expect(formatarForma(medirEsboco(e).descricao, medirEsboco(e).divergencias, 'tubo')).toMatch(/família tubo \(perfil curto\)/);
  });

  it('o mapa de ligações lê a forma como as outras', () => {
    const e = esboco(formas(), { contato: { usar: true, tolerancia: 1, folga: 50 } });
    expect(() => mapaDeLigacoes(e)).not.toThrow();
  });
});

describe('as formas resolvidas com a forma de família', () => {
  it('exportam a família, o perfil, os ajustes, as partes, o volume e o casco por seções, em dado puro e determinístico', () => {
    const e = esboco([tubo({ perfil: 'curto', parametros: { comprimento: 90 }, rotacao: [0, 0, 90] })]);
    const a = formasResolvidas(e);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(formasResolvidas(e)).toEqual(a);
    const g = a.formas[0].geometria;
    expect(a.formas[0]).toMatchObject({ tipo: 'familia' });
    expect(g).toMatchObject({ familia: 'tubo-de-prova', perfil: 'curto', parametros: { comprimento: 90 }, partes: ['corpo'], eixo: 'x', eixosDoPerfil: ['z', 'y'], comprimento: 90 });
    expect(g.extensao).toEqual([90, 40, 40]);
    expect(g.secoes.length).toBeGreaterThan(2);
    expect(Object.keys(g.ancoras)).toEqual(['centro', 'boca']);
    perto(g.ancoras.boca, [0, 45, 0]);
    /* o envelope do casco refaz a caixa de mundo: o eixo x do tubo virou o y do mundo */
    perto(g.caixa.max.map((v, i) => v - g.caixa.min[i]), [40, 90, 40]);
  });
});
