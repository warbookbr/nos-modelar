/* A prova do tradutor do nível zero sobre os esboços do módulo e do banco de provas: o andaime é aceito por
   `normalizarAndaimeGlobal`, a blocagem compila e fecha, e o volume e o envelope de cada forma traduzida, de cada unidade e de
   cada parte, e do conjunto, batem com os que o esboço resolve.

   Tolerâncias, e por que valem:
   - Volume: 1e-6 relativo. O andaime guarda coordenadas em 1e-6 mm, e a N2 usa os mesmos lados do esboço (128 no cilindro, no
     anel e no cone, 48 no tubo, 40 por 20 na esfera), então os polígonos e as áreas são os mesmos. O pior caso medido nas
     fixtures é 2,4e-7 (a caixa girada, pelo arredondamento das coordenadas).
   - Envelope: 1e-5 mm nos sólidos de arestas retas e de eixo no lugar (o arredondamento de 1e-6 mm, com folga). O cilindro e o
     tubo inclinados têm o polígono inscrito de n lados girado em relação ao do esboço, e dois n-gonos inscritos no mesmo círculo
     diferem na caixa por no máximo r (1 - cos(pi / n)); essa é a tolerância deles (0,0024 mm medido no cilindro de 128 lados e
     0,027 mm no tubo de 48 lados e 25 mm de diâmetro).
   O volume do esboço sai de `resolverOpcao` (área do perfil menos furos vezes o comprimento, as seções pela fórmula do
   prismatoide, o tubo pela soma das partes), por um caminho que não passa pela malha da N2. */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ErroDoTradutor, slugDe } from '../../src/autoria/tradutor-nivel-zero.js';
import { normalizarAndaimeGlobal } from '../../src/autoria/forma-global.js';
import { resolverOpcao } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { compilarAndaime, medirVolumes } from '../fixtures/nivel-zero/medir-blocagem.js';
import { andaimeDoArquivo, andaimeDoEsboco, descreverTraducao } from './esboco-para-andaime.mjs';

const TOLERANCIA_DE_VOLUME = 1e-6;
const TOLERANCIA_DE_ENVELOPE = 1e-5;

const pastaDoModulo = new URL('../../modulos/esboco/tests/fixtures/', import.meta.url);
const pastaDoBanco = new URL('../../docs/mecanifica/banco-de-provas/', import.meta.url);
const lerJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const arquivosDoModulo = readdirSync(fileURLToPath(pastaDoModulo)).filter((n) => n.endsWith('.esboco.json')).sort();
const doBanco = [
  'rodada-2026-10-08/cadeira/cadeira-jantar', 'rodada-2026-10-08/guarda-roupa/guarda-roupa',
  'rodada-2026-10-08/cadeira-de-rodas/cadeira-de-rodas', 'rodada-2026-10-08/carrinho-de-mao/carrinho-de-mao',
  'carrinho-refeito-2026-10-08/carrinho-casca', 'carrinho-refeito-2026-10-08/chassi-e-cacamba',
];
const caminhos = new Map([
  ...arquivosDoModulo.map((n) => [n, new URL(n, pastaDoModulo)]),
  ...doBanco.map((n) => [`${n.split('/').pop()}.esboco.json`, new URL(`${n}.esboco.json`, pastaDoBanco)]),
]);

/* O que fica de fora em cada opção, por esboço: a lista é a decisão registrada, e uma forma nova fora dela reprova. As
   fixtures que não aparecem aqui são totalmente exatas (nenhuma forma fora). Valor `null`: o esboço inteiro não se traduz. */
const SEM_CORRESPONDENCIA = {
  'mancal-eixo.esboco.json': [['base', 'ponta_chaveta']],
  'moto.esboco.json': [['motor', 'tanque', 'banco']],
  'moto-relacoes.esboco.json': [['motor', 'tanque', 'banco']],
  'moto-parametros.esboco.json': [['motor', 'tanque', 'banco'], ['motor', 'tanque', 'banco']],
  'moto-componentes.esboco.json': [['motor', 'tanque', 'banco', 'garfoE.perna', 'garfoD.perna'], ['motor', 'tanque', 'banco', 'garfoE.perna', 'garfoD.perna']],
  'moto-curvas.esboco.json': [['motor', 'tanque', 'garfoE.perna', 'garfoD.perna', 'carenagem'], ['motor', 'tanque', 'garfoE.perna', 'garfoD.perna', 'carenagem']],
  'cadeira-jantar.esboco.json': [['estofado']],
  'carrinho-casca.esboco.json': [['cacamba']],
  'chassi-e-cacamba.esboco.json': [['paFrente', 'paTras', 'paD', 'paE']],
  'teste-cubo.esboco.json': null,
};
/* Os esboços em que nenhuma forma fica de fora: a prova completa (todas as formas, unidades, partes e o conjunto). */
const EXATOS = ['casa.esboco.json', 'estilos-perfis.esboco.json', 'guarda-roupa.esboco.json', 'cadeira-de-rodas.esboco.json', 'carrinho-de-mao.esboco.json'];

/* ---------- o lado do esboço ---------- */

const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; };
function volumeDoPrisma(pr) {
  if (pr.secoes) {
    let v = 0;
    for (let k = 0; k + 1 < pr.secoes.length; k++) {
      const a = pr.secoes[k], b = pr.secoes[k + 1];
      const meio = a.perfil.map((q, i) => [(q[0] + b.perfil[i][0]) / 2, (q[1] + b.perfil[i][1]) / 2]);
      v += (b.w - a.w) / 6 * (area(a.perfil) + 4 * area(meio) + area(b.perfil));
    }
    return v;
  }
  return (area(pr.perfil) - pr.furos.reduce((s, f) => s + area(f), 0)) * pr.comprimento;
}
const volumeDoEsboco = (r) => (r.partes ? r.partes.reduce((s, p) => s + volumeDoPrisma(p.prisma), 0) : volumeDoPrisma(r.prisma));

/* O erro que o polígono inscrito de n lados girado admite na caixa: o cilindro e o tubo que a N2 recebe fora dos eixos. */
function toleranciaDaForma(forma) {
  const g = forma.geometria;
  if (forma.tipo === 'cilindro') return TOLERANCIA_DE_ENVELOPE + g.diametro / 2 * (1 - Math.cos(Math.PI / (g.lados ?? 128)));
  if (forma.tipo === 'tubo') return TOLERANCIA_DE_ENVELOPE + g.diametro / 2 * (1 - Math.cos(Math.PI / 48));
  return TOLERANCIA_DE_ENVELOPE;
}
const uniao = (caixas) => ({ min: [0, 1, 2].map((i) => Math.min(...caixas.map((c) => c.min[i]))), max: [0, 1, 2].map((i) => Math.max(...caixas.map((c) => c.max[i]))) });
const desvioDeEnvelope = (a, b) => Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(a.min[i] - b.min[i]), Math.abs(a.max[i] - b.max[i])]));
const relativo = (a, b) => Math.abs(a - b) / Math.abs(b);

/* Tudo o que a prova compara de uma opção: o resultado do tradutor, a blocagem medida e, por forma traduzida, o volume e a
   caixa do esboço. */
function medirOpcao(esboco, opcao) {
  const traducao = andaimeDoEsboco(esboco, { opcao });
  const dados = formasResolvidas(esboco, opcao);
  const expandido = expandirEsboco(esboco);
  const resolvidas = resolverOpcao(expandido.opcoes[opcao - 1], `opção ${opcao}`, expandido.pontos);
  const blocagem = compilarAndaime(traducao.andaime);
  const medidas = medirVolumes(blocagem);
  const formas = dados.formas.filter((f) => traducao.tabela[f.id]).map((f) => {
    const r = resolvidas.find((q) => q.id === f.id);
    return { forma: f, volumeEsboco: volumeDoEsboco(r), caixaEsboco: { min: r.min, max: r.max }, medida: medidas.get(traducao.tabela[f.id]), tolerancia: toleranciaDaForma(f) };
  });
  return { traducao, dados, blocagem, medidas, formas };
}

const doTipo = (m, tipo) => m.formas.filter((x) => x.forma.tipo === tipo);

describe('o adaptador do esboço ao andaime: as fixtures do módulo e do banco de provas', () => {
  it('toda fixture está decidida: exata, com a lista do que fica de fora, ou sem tradução', () => {
    for (const nome of caminhos.keys()) {
      expect(EXATOS.includes(nome) || nome in SEM_CORRESPONDENCIA, `${nome} não está em EXATOS nem em SEM_CORRESPONDENCIA`).toBe(true);
    }
    for (const nome of [...EXATOS, ...Object.keys(SEM_CORRESPONDENCIA)]) expect(caminhos.has(nome), `${nome} não existe`).toBe(true);
  });

  for (const [nome, url] of caminhos) {
    const esboco = lerJson(url);
    const esperado = SEM_CORRESPONDENCIA[nome];

    if (esperado === null) {
      it(`${nome}: nenhuma forma se traduz, e a tradução recusa com os motivos`, () => {
        expect(() => andaimeDoEsboco(esboco)).toThrow(ErroDoTradutor);
        expect(() => andaimeDoEsboco(esboco)).toThrow(/nenhuma forma visível se traduz: cubo \(caixa com raio de canto/);
      });
      continue;
    }

    esboco.opcoes.forEach((_, i) => {
      const numero = i + 1;
      const foraEsperado = esperado ? esperado[i] ?? esperado[0] : [];

      describe(`${nome}, opção ${numero}`, () => {
        const m = medirOpcao(esboco, numero);

        it('lista exatamente as formas sem correspondência, e as outras entram no andaime com tabela de ids', () => {
          expect(m.traducao.naoTraduzidas.map((n) => n.id)).toEqual(foraEsperado);
          for (const n of m.traducao.naoTraduzidas) expect(n.motivo.length).toBeGreaterThan(10);
          const visiveis = m.dados.formas.filter((f) => !f.oculto).map((f) => f.id);
          expect(Object.keys(m.traducao.tabela)).toEqual(visiveis.filter((id) => !foraEsperado.includes(id)));
          expect(m.traducao.andaime.volumes).toHaveLength(visiveis.length - foraEsperado.length);
          expect(new Set(Object.values(m.traducao.tabela)).size).toBe(Object.keys(m.traducao.tabela).length);
        });

        it('o andaime é aceito por normalizarAndaimeGlobal e já está na forma canônica', () => {
          const canonico = normalizarAndaimeGlobal(m.traducao.andaime);
          expect(JSON.stringify(canonico)).toBe(JSON.stringify(m.traducao.andaime));
        });

        it('a blocagem compila, cada volume fecha com a normal para fora e o envelope do conjunto é o do esboço', () => {
          expect(m.blocagem.estatisticas.volumes).toBe(m.traducao.andaime.volumes.length);
          for (const [id, medida] of m.medidas) {
            expect(medida.arestasSemPar, `${id} tem aresta sem par`).toBe(0);
            expect(medida.volume, `${id} tem volume com sinal não positivo`).toBeGreaterThan(0);
          }
          const toleranciaDoConjunto = Math.max(...m.formas.map((x) => x.tolerancia));
          const esboco = uniao(m.formas.map((x) => x.caixaEsboco));
          expect(desvioDeEnvelope(m.blocagem.envelopeDerivado, esboco)).toBeLessThanOrEqual(toleranciaDoConjunto);
          expect(desvioDeEnvelope(m.traducao.andaime.envelope, esboco)).toBeLessThanOrEqual(TOLERANCIA_DE_ENVELOPE);
        });

        it('o volume e o envelope de cada forma traduzida batem com os do esboço', () => {
          expect(m.formas.length).toBeGreaterThan(0);
          for (const x of m.formas) {
            expect(relativo(x.medida.volume, x.volumeEsboco), `volume de ${x.forma.id} (${x.forma.tipo})`).toBeLessThanOrEqual(TOLERANCIA_DE_VOLUME);
            expect(desvioDeEnvelope(x.medida, x.caixaEsboco), `envelope de ${x.forma.id} (${x.forma.tipo})`).toBeLessThanOrEqual(x.tolerancia);
          }
        });

        it('o volume e o envelope de cada unidade e de cada parte, e do conjunto, batem quando todas as suas formas se traduzem', () => {
          const grupos = new Map();
          for (const f of m.dados.formas.filter((q) => !q.oculto)) {
            for (const [campo, nome] of [['unidade', f.unidade], ['parte', f.parte]]) {
              if (nome === null) continue;
              const g = grupos.get(`${campo}:${nome}`) ?? [];
              g.push(f.id);
              grupos.set(`${campo}:${nome}`, g);
            }
          }
          const porId = new Map(m.formas.map((x) => [x.forma.id, x]));
          let comparados = 0;
          for (const [grupo, ids] of grupos) {
            if (ids.some((id) => !porId.has(id))) continue;
            const membros = ids.map((id) => porId.get(id));
            const soma = (campo) => membros.reduce((s, x) => s + (campo === 'esboco' ? x.volumeEsboco : x.medida.volume), 0);
            expect(relativo(soma('andaime'), soma('esboco')), `volume de ${grupo}`).toBeLessThanOrEqual(TOLERANCIA_DE_VOLUME);
            expect(desvioDeEnvelope(uniao(membros.map((x) => x.medida)), uniao(membros.map((x) => x.caixaEsboco))), `envelope de ${grupo}`)
              .toBeLessThanOrEqual(Math.max(...membros.map((x) => x.tolerancia)));
            /* a região do andaime é a do grupo: todo volume do grupo leva o slug do nome da unidade ou da parte */
            const regiao = slugDe(grupo.slice(grupo.indexOf(':') + 1));
            for (const x of membros) expect(m.traducao.andaime.volumes.find((v) => v.id === m.traducao.tabela[x.forma.id]).regioes).toContain(regiao);
            comparados++;
          }
          const total = m.formas.reduce((s, x) => s + x.volumeEsboco, 0);
          expect(relativo(m.formas.reduce((s, x) => s + x.medida.volume, 0), total)).toBeLessThanOrEqual(TOLERANCIA_DE_VOLUME);
          if (grupos.size > 0 && foraEsperado.length === 0) expect(comparados).toBe(grupos.size);
        });

        it('a mesma opção dá o mesmo andaime, a mesma tabela e as mesmas listas, byte a byte', () => {
          const outra = andaimeDoEsboco(JSON.parse(JSON.stringify(esboco)), { opcao: numero });
          expect(JSON.stringify(outra)).toBe(JSON.stringify(m.traducao));
        });

        it('o modo estrito recusa quando há forma sem correspondência e aceita quando não há', () => {
          if (foraEsperado.length === 0) {
            expect(JSON.stringify(andaimeDoEsboco(esboco, { opcao: numero, estrito: true }).andaime)).toBe(JSON.stringify(m.traducao.andaime));
          } else {
            expect(() => andaimeDoEsboco(esboco, { opcao: numero, estrito: true })).toThrow(ErroDoTradutor);
            for (const id of foraEsperado) expect(() => andaimeDoEsboco(esboco, { opcao: numero, estrito: true })).toThrow(id);
          }
        });
      });
    });
  }

  it('as fixtures exatas cobrem caixa (parada e girada), cilindro (no eixo e fora dele), anel, extrusão côncava, revolução e tubo', () => {
    const vistos = new Map();
    for (const nome of EXATOS) {
      const esboco = lerJson(caminhos.get(nome));
      const m = medirOpcao(esboco, 1);
      for (const v of m.traducao.andaime.volumes) vistos.set(v.tipo, (vistos.get(v.tipo) ?? 0) + 1);
      for (const x of m.formas) {
        const girada = x.forma.geometria.matriz.some((l, a) => l.some((c, b) => Math.abs(c - (a === b ? 1 : 0)) > 1e-9));
        if (girada) vistos.set(`${x.forma.tipo}-girado`, (vistos.get(`${x.forma.tipo}-girado`) ?? 0) + 1);
        if (x.forma.tipo === 'extrusao' && !x.forma.geometria.convexo) vistos.set('extrusao-concava', 1);
      }
    }
    for (const chave of ['caixa', 'cilindro', 'tubo', 'anel', 'extrusao', 'revolucao', 'extrusao-concava', 'caixa-girado', 'cilindro-girado']) {
      expect(vistos.get(chave), chave).toBeGreaterThan(0);
    }
  });

  it('a caixa girada em um eixo só vira extrusão e a haste fora dos eixos vira tubo, nas fixtures', () => {
    const casa = medirOpcao(lerJson(caminhos.get('casa.esboco.json')), 1);
    const telhado = casa.traducao.andaime.volumes.find((v) => v.id === casa.traducao.tabela.telhado_esq);
    expect(telhado.tipo).toBe('extrusao');
    const moto = medirOpcao(lerJson(caminhos.get('moto-parametros.esboco.json')), 1);
    const garfo = moto.traducao.andaime.volumes.find((v) => v.id === moto.traducao.tabela.garfoE);
    expect(garfo.tipo).toBe('tubo');
    expect(garfo.caminho).toHaveLength(2);
  });

  it('a opção pode ser pedida pelo título, e o arquivo lido dá o mesmo que o esboço lido', () => {
    const esboco = lerJson(caminhos.get('moto-parametros.esboco.json'));
    const pelaSegunda = andaimeDoEsboco(esboco, { opcao: 2 });
    const pelotitulo = andaimeDoEsboco(esboco, { opcao: esboco.opcoes[1].titulo });
    expect(JSON.stringify(pelotitulo)).toBe(JSON.stringify(pelaSegunda));
    const doArquivo = andaimeDoArquivo(fileURLToPath(caminhos.get('moto-parametros.esboco.json')), { opcao: 2 });
    expect(JSON.stringify(doArquivo)).toBe(JSON.stringify(pelaSegunda));
    expect(() => andaimeDoArquivo('/nao/existe.esboco.json')).toThrow(/não foi possível ler o esboço/);
    expect(() => andaimeDoEsboco(esboco, { opcao: 9 })).toThrow(/não existe/);
  });

  it('a recusa de um tipo não traduzido sai com o id, o tipo e o motivo, e a descrição em texto os mostra', () => {
    const esboco = lerJson(caminhos.get('carrinho-casca.esboco.json'));
    const r = andaimeDoEsboco(esboco);
    expect(r.naoTraduzidas).toEqual([{ id: 'cacamba', tipo: 'loft', motivo: expect.stringContaining('loft') }]);
    const texto = descreverTraducao(r);
    expect(texto).toContain('1 forma(s) sem correspondência exata');
    expect(texto).toContain('  cacamba (loft): ');
    expect(() => andaimeDoEsboco(esboco, { estrito: true })).toThrow(/cacamba \(loft/);
    try { andaimeDoEsboco(esboco, { estrito: true }); } catch (e) { expect(e.naoTraduzidas).toEqual(r.naoTraduzidas); }
  });

  it('todos os tipos traduzidos nas fixtures têm sólidos medidos: pelo menos uma forma de cada', () => {
    const m = medirOpcao(lerJson(caminhos.get('cadeira-de-rodas.esboco.json')), 1);
    for (const tipo of ['tubo', 'extrusao', 'anel', 'cilindro', 'caixa']) expect(doTipo(m, tipo).length, tipo).toBeGreaterThan(0);
  });
});
