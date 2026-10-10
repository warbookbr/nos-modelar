/* A prova do tradutor do nível zero sobre os esboços do módulo e do banco de provas: o andaime é aceito por
   `normalizarAndaimeGlobal`, a blocagem compila e fecha, e o volume e o envelope de cada forma traduzida, de cada unidade e de
   cada parte, e do conjunto, batem com os que o esboço resolve; as formas aproximadas (caixa com raio, cilindro achatado, loft)
   entram no relatório de perdas com o erro medido na blocagem, e o que tem perda de volume de verdade (a caçamba de casca e
   seção inclinada) é provado à parte.

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

const perto = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

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

/* O que fica sem equivalente em cada opção, por esboço: a lista é a decisão registrada, e uma forma nova fora dela reprova. A
   lista de uma opção que falta é a da primeira. As fixtures que não aparecem aqui traduzem tudo. */
const SEM_EQUIVALENTE = {
  'mancal-eixo.esboco.json': [['base']],
  'moto-componentes.esboco.json': [['garfoE.perna', 'garfoD.perna'], ['garfoE.perna', 'garfoD.perna']],
  'moto-curvas.esboco.json': [['garfoE.perna', 'garfoD.perna'], ['garfoE.perna', 'garfoD.perna']],
};
/* O que entra aproximado em cada opção (ids na ordem do relatório), por esboço. As que não aparecem não aproximam nada. */
const MOTO = ['banco', 'motor', 'tanque'];
const APROXIMADAS = {
  'mancal-eixo.esboco.json': [['ponta_chaveta']],
  'moto.esboco.json': [MOTO],
  'moto-relacoes.esboco.json': [MOTO],
  'moto-parametros.esboco.json': [MOTO, MOTO],
  'moto-componentes.esboco.json': [MOTO, MOTO],
  'moto-curvas.esboco.json': [['carenagem', 'motor', 'tanque'], ['carenagem', 'motor', 'tanque']],
  'teste-cubo.esboco.json': [['cubo']],
  'cadeira-jantar.esboco.json': [['estofado']],
  'carrinho-casca.esboco.json': [['cacamba']],
  'chassi-e-cacamba.esboco.json': [['paD', 'paE', 'paFrente', 'paTras']],
};
/* As formas cujo volume o esboço não reproduz de propósito (a caçamba perde a cavidade e a inclinação): fora das comparações
   exatas, com prova própria. */
const COM_PERDA_DE_VOLUME = { 'carrinho-casca.esboco.json': ['cacamba'] };
/* Os esboços em que nada é aproximado nem fica de fora: a prova completa de formas exatas. */
const EXATOS = ['casa.esboco.json', 'estilos-perfis.esboco.json', 'guarda-roupa.esboco.json', 'cadeira-de-rodas.esboco.json', 'carrinho-de-mao.esboco.json'];
const doNome = (tabela, nome, i) => tabela[nome]?.[i] ?? tabela[nome]?.[0] ?? [];

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
function medirOpcao(esboco, opcao, nome = '') {
  const traducao = andaimeDoEsboco(esboco, { opcao });
  const dados = formasResolvidas(esboco, opcao);
  const expandido = expandirEsboco(esboco);
  const resolvidas = resolverOpcao(expandido.opcoes[opcao - 1], `opção ${opcao}`, expandido.pontos);
  const blocagem = compilarAndaime(traducao.andaime);
  const medidas = medirVolumes(blocagem);
  const todas = dados.formas.filter((f) => traducao.tabela[f.id]).map((f) => {
    const r = resolvidas.find((q) => q.id === f.id);
    return { forma: f, r, volumeEsboco: volumeDoEsboco(r), caixaEsboco: { min: r.min, max: r.max }, medida: medidas.get(traducao.tabela[f.id]), tolerancia: toleranciaDaForma(f) };
  });
  const semVolumeExato = COM_PERDA_DE_VOLUME[nome] ?? [];
  return { traducao, dados, blocagem, medidas, todas, formas: todas.filter((x) => !semVolumeExato.includes(x.forma.id)), semVolumeExato };
}

const doTipo = (m, tipo) => m.formas.filter((x) => x.forma.tipo === tipo);

/* O volume do sólido que o esboço desenha para um loft com seções inclinadas: a união dos sólidos convexos de cada par de seções
   vizinhas. Calculado pelo casco convexo dos pontos de cada faixa (os planos de apoio, sem passar pela malha do tradutor):
   o volume é a soma, por face do casco, de um terço da distância do centro à face vezes a área dela. */
function volumeDoCascoConvexo(pontos) {
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const c = [0, 1, 2].map((i) => pontos.reduce((soma, p) => soma + p[i], 0) / pontos.length);
  const planos = new Map();
  for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) for (let k = j + 1; k < pontos.length; k++) {
    let n = cruz(sub(pontos[j], pontos[i]), sub(pontos[k], pontos[i]));
    const tamanho = Math.hypot(...n);
    if (tamanho < 1e-9) continue;
    n = n.map((v) => v / tamanho);
    let d = ponto(n, pontos[i]);
    let acima = false, abaixo = false;
    for (const q of pontos) { const lado = ponto(n, q) - d; if (lado > 1e-6) acima = true; else if (lado < -1e-6) abaixo = true; if (acima && abaixo) break; }
    if (acima && abaixo) continue;
    if (ponto(n, c) - d > 0) { n = n.map((v) => -v); d = -d; }
    const chave = [...n.map((v) => Math.round(v * 1e6)), Math.round(d * 1e3)].join(',');
    if (!planos.has(chave)) planos.set(chave, { n, d });
  }
  let volume = 0;
  for (const { n, d } of planos.values()) {
    const sobre = pontos.filter((q) => Math.abs(ponto(n, q) - d) < 1e-6);
    const U = cruz(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
    const u = U.map((v) => v / Math.hypot(...U));
    const v = cruz(n, u);
    const p2 = sobre.map((q) => [ponto(q, u), ponto(q, v)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const cadeia = (lista) => { const out = []; for (const q of lista) { while (out.length >= 2 && giro(out[out.length - 2], out[out.length - 1], q) <= 1e-9) out.pop(); out.push(q); } return out; };
    const poligono = [...cadeia(p2).slice(0, -1), ...cadeia([...p2].reverse()).slice(0, -1)];
    let areaDoPoligono = 0;
    for (let i = 0; i < poligono.length; i++) { const q = poligono[(i + 1) % poligono.length]; areaDoPoligono += poligono[i][0] * q[1] - q[0] * poligono[i][1]; }
    volume += (d - ponto(n, c)) * Math.abs(areaDoPoligono) / 2 / 3;
  }
  return volume;
}
const pontosDoAnel = (anel) => anel.perfil.map((q) => [q[0], q[1], q.length > 2 ? q[2] : anel.w]);
const volumeDeLoftPorFaixas = (aneis) => aneis.slice(0, -1).reduce((soma, anel, k) => soma + volumeDoCascoConvexo([...pontosDoAnel(anel), ...pontosDoAnel(aneis[k + 1])]), 0);

describe('o adaptador do esboço ao andaime: as fixtures do módulo e do banco de provas', () => {
  it('toda fixture está decidida: exata, com a lista do que é aproximado e do que fica sem equivalente', () => {
    for (const nome of caminhos.keys()) {
      expect(EXATOS.includes(nome) || nome in APROXIMADAS || nome in SEM_EQUIVALENTE, `${nome} não está em EXATOS, APROXIMADAS nem SEM_EQUIVALENTE`).toBe(true);
    }
    for (const nome of [...EXATOS, ...Object.keys(APROXIMADAS), ...Object.keys(SEM_EQUIVALENTE)]) expect(caminhos.has(nome), `${nome} não existe`).toBe(true);
    for (const nome of EXATOS) expect(nome in APROXIMADAS || nome in SEM_EQUIVALENTE, `${nome} é exata e está nas outras listas`).toBe(false);
  });

  for (const [nome, url] of caminhos) {
    const esboco = lerJson(url);
    esboco.opcoes.forEach((_, i) => {
      const numero = i + 1;
      const foraEsperado = doNome(SEM_EQUIVALENTE, nome, i);
      const aproximadasEsperadas = doNome(APROXIMADAS, nome, i);

      describe(`${nome}, opção ${numero}`, () => {
        const m = medirOpcao(esboco, numero, nome);

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
          const toleranciaDoConjunto = Math.max(...m.todas.map((x) => x.tolerancia));
          const esboco = uniao(m.todas.map((x) => x.caixaEsboco));
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
          if (grupos.size > 0 && foraEsperado.length === 0 && m.semVolumeExato.length === 0) expect(comparados).toBe(grupos.size);
        });

        it('o relatório de perdas lista exatamente as formas aproximadas, com o erro medido na blocagem e contra o esboço', () => {
          const perdas = m.traducao.perdas;
          expect(perdas.map((p) => p.id)).toEqual(aproximadasEsperadas);
          for (const p of perdas) {
            const x = m.todas.find((q) => q.forma.id === p.id);
            expect(p.aproximacao, p.id).toMatch(/^(caixa-com-raio-como-extrusao|cilindro-achatado-como-extrusao|loft-como-casco)$/);
            expect(p.volumeId).toBe(m.traducao.tabela[p.id]);
            /* o volume e o envelope do andaime são os da blocagem que este teste mede por fora */
            expect(relativo(p.volumeAndaime, x.medida.volume), `volume do andaime de ${p.id}`).toBeLessThanOrEqual(1e-6);
            expect(desvioDeEnvelope(p.envelopeAndaime, x.medida), `envelope do andaime de ${p.id}`).toBeLessThanOrEqual(1e-6);
            expect(desvioDeEnvelope(p.envelopeEsboco, x.caixaEsboco), `envelope do esboço de ${p.id}`).toBeLessThanOrEqual(1e-6);
            if (m.semVolumeExato.includes(p.id)) continue;
            /* o volume do esboço do relatório é o que o módulo resolve, e o erro dos dois é o do arredondamento */
            expect(relativo(p.volumeEsboco, x.volumeEsboco), `volume do esboço de ${p.id}`).toBeLessThanOrEqual(TOLERANCIA_DE_VOLUME);
            expect(Math.abs(p.erroVolume.relativo), `erro de volume de ${p.id}`).toBeLessThanOrEqual(TOLERANCIA_DE_VOLUME);
            expect(p.erroEnvelope.mm, `erro de envelope de ${p.id}`).toBeLessThanOrEqual(TOLERANCIA_DE_ENVELOPE);
          }
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

  it('a recusa do que não tem equivalente sai com o id, o tipo e o motivo, e a descrição em texto mostra também as perdas', () => {
    const esboco = lerJson(caminhos.get('moto-curvas.esboco.json'));
    const r = andaimeDoEsboco(esboco);
    expect(r.naoTraduzidas.map((n) => [n.id, n.tipo])).toEqual([['garfoE.perna', 'cone'], ['garfoD.perna', 'cone']]);
    expect(r.naoTraduzidas[0].motivo).toContain('gira em dois eixos');
    const texto = descreverTraducao(r);
    expect(texto).toContain('3 aproximado(s), 2 forma(s) sem equivalente');
    expect(texto).toContain('  sem equivalente garfoE.perna (cone): ');
    expect(texto).toContain('  aproximado tanque (loft, loft-como-casco): volume ');
    expect(texto).toContain('  aproximado motor (caixa, caixa-com-raio-como-extrusao): ');
    expect(() => andaimeDoEsboco(esboco, { estrito: true })).toThrow(/garfoE\.perna \(cone/);
    try { andaimeDoEsboco(esboco, { estrito: true }); } catch (e) { expect(e.naoTraduzidas).toEqual(r.naoTraduzidas); }
    /* as aproximações sozinhas não reprovam o modo estrito */
    expect(andaimeDoEsboco(lerJson(caminhos.get('moto.esboco.json')), { estrito: true }).perdas).toHaveLength(3);
    expect(descreverTraducao(andaimeDoEsboco(lerJson(caminhos.get('moto.esboco.json'))))).toContain('perdido (tipo): ');
  });

  it('todos os tipos traduzidos nas fixtures têm sólidos medidos: pelo menos uma forma de cada', () => {
    const m = medirOpcao(lerJson(caminhos.get('cadeira-de-rodas.esboco.json')), 1);
    for (const tipo of ['tubo', 'extrusao', 'anel', 'cilindro', 'caixa']) expect(doTipo(m, tipo).length, tipo).toBeGreaterThan(0);
  });

  describe('a caçamba do carrinho: loft com casca e seção inclinada', () => {
    const nome = 'carrinho-casca.esboco.json';
    const esboco = lerJson(caminhos.get(nome));
    const m = medirOpcao(esboco, 1, nome);
    const x = m.todas.find((q) => q.forma.id === 'cacamba');
    const [p] = m.traducao.perdas;
    const volume = m.traducao.andaime.volumes.find((v) => v.id === 'cacamba');

    it('traduz inteira, como casco por seções de 35 pontos, sem forma fora do andaime', () => {
      expect(m.traducao.naoTraduzidas).toEqual([]);
      expect(volume).toMatchObject({ tipo: 'casco-secoes', eixoPercurso: 'y', eixosSecao: ['x', 'z'] });
      expect(volume.secoes).toHaveLength(6);
      expect(new Set(volume.secoes.map((q) => q.perfil.length))).toEqual(new Set([35]));
      expect(m.traducao.perdas).toHaveLength(1);
    });

    it('o envelope externo fica dentro de 1% em cada eixo, medido na blocagem contra o do módulo', () => {
      for (let i = 0; i < 3; i++) {
        const extensao = x.caixaEsboco.max[i] - x.caixaEsboco.min[i];
        expect(Math.abs(x.medida.min[i] - x.caixaEsboco.min[i]) / extensao, `mínimo do eixo ${i}`).toBeLessThanOrEqual(0.01);
        expect(Math.abs(x.medida.max[i] - x.caixaEsboco.max[i]) / extensao, `máximo do eixo ${i}`).toBeLessThanOrEqual(0.01);
      }
      expect(p.erroEnvelope.relativo).toBeLessThanOrEqual(0.01);
      expect(p.erroEnvelope.mm).toBeLessThanOrEqual(TOLERANCIA_DE_ENVELOPE);
    });

    it('declara a perda da cavidade e da inclinação, e o volume a mais é o medido na blocagem', () => {
      expect(p.perdido.map((d) => d.codigo)).toEqual(['inclinacao', 'casca']);
      expect(p.perdido[1].descricao).toContain('cavidade');
      expect(relativo(p.volumeAndaime, x.medida.volume)).toBeLessThanOrEqual(1e-9);
      expect(p.erroVolume.mm3).toBeGreaterThan(0);
      perto(p.erroVolume.mm3, x.medida.volume - p.volumeEsboco, 1e-6 * x.medida.volume);
      /* a casca de 4 mm numa caçamba de 740 por 880: a cavidade que some é quase todo o volume */
      expect(p.erroVolume.relativo).toBeGreaterThan(10);
    });

    it('o volume do esboço (casca) é o dos sólidos convexos de cada par de seções, externo menos cavidade, calculado por fora', () => {
      const { prisma } = x.r;
      const externo = volumeDeLoftPorFaixas(prisma.secoes);
      const cavidade = volumeDeLoftPorFaixas(prisma.casca.cavidade);
      expect(relativo(p.volumeExternoEsboco, externo)).toBeLessThanOrEqual(1e-6);
      expect(relativo(p.volumeEsboco, externo - cavidade)).toBeLessThanOrEqual(1e-6);
      /* a parede inclinada tem espessura medida no plano da seção: o volume fica abaixo de espessura vezes a área externa */
      expect(p.volumeEsboco).toBeGreaterThan(0.5 * 4 * 531084);
      expect(p.volumeEsboco).toBeLessThan(4 * (531084 + 253666));
    });

    it('o custo da inclinação ignorada está separado: o sólido externo do andaime passa do externo do esboço em cerca de 10%', () => {
      expect(p.erroVolumeExterno.mm3).toBeGreaterThan(0);
      expect(p.erroVolumeExterno.relativo).toBeGreaterThan(0.05);
      expect(p.erroVolumeExterno.relativo).toBeLessThan(0.15);
    });
  });

  describe('formas escritas no próprio teste, com o volume e o envelope do módulo', () => {
    const esbocoDe = (formas, extra = {}) => ({ vista: 'isometrica', ...extra, opcoes: [{ titulo: 'inline', formas }] });
    const INLINE = {
      'caixa com chanfro': [{ id: 'c', tipo: 'caixa', largura: 100, altura: 60, profundidade: 80, chanfro: 10, centro: [0, 30, 0] }],
      'caixa com chanfro girada em y': [{ id: 'c', tipo: 'caixa', largura: 100, altura: 60, profundidade: 80, chanfro: 10, centro: [0, 30, 0], rotacao: [0, 90, 0] }],
      'caixa com raio girada em x': [{ id: 'c', tipo: 'caixa', largura: 100, altura: 60, profundidade: 80, raio: 12, centro: [0, 30, 0], rotacao: [90, 0, 0] }],
      'caixa com raio de pílula (raio maior que a metade)': [{ id: 'c', tipo: 'caixa', largura: 100, altura: 20, profundidade: 60, raio: 100, centro: [0, 10, 0] }],
      'cilindro achatado em x': [{ id: 'c', tipo: 'cilindro', eixo: 'x', diametro: 30, comprimento: 90, achatado: { lado: '+y', profundidade: 4 }, centro: [0, 20, 0] }],
      'cilindro achatado em z, girado em z': [{ id: 'c', tipo: 'cilindro', eixo: 'z', diametro: 30, comprimento: 90, achatado: { lado: '-x', profundidade: 6 }, centro: [0, 20, 0], rotacao: [0, 0, 90] }],
      'loft de retângulos em z': [{ id: 'l', tipo: 'loft', eixo: 'z', centro: [0, 40, 0], secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 50, tamanho: [70, 50] }, { pos: 120, tamanho: [40, 30], centro: [10, 0] }] }],
      'loft de elipses em x': [{ id: 'l', tipo: 'loft', eixo: 'x', centro: [0, 40, 0], secoes: [{ pos: 0, forma: 'elipse', tamanho: [60, 40] }, { pos: 80, forma: 'elipse', tamanho: [30, 20] }] }],
      'loft espelhado': [{ id: 'l', tipo: 'loft', eixo: 'y', centro: [100, 40, 0], secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 60, tamanho: [40, 30], centro: [8, 5] }] }, { id: 'e', espelha: { forma: 'l', eixo: 'x', pos: 0 } }],
      'loft com arredondado': [{ id: 'l', tipo: 'loft', eixo: 'y', centro: [0, 40, 0], secoes: [{ pos: 0, forma: 'arredondado', tamanho: [100, 60], cantos: 12 }, { pos: 60, forma: 'arredondado', tamanho: [60, 40], cantos: 8 }] }],
    };
    for (const [nome, formas] of Object.entries(INLINE)) {
      it(`${nome}: entra como aproximação com o volume e o envelope do esboço`, () => {
        const esb = esbocoDe(formas);
        const m = medirOpcao(esb, 1);
        expect(m.traducao.naoTraduzidas).toEqual([]);
        expect(m.traducao.perdas.length).toBeGreaterThan(0);
        for (const [id, medida] of m.medidas) {
          expect(medida.arestasSemPar, id).toBe(0);
          expect(medida.volume, id).toBeGreaterThan(0);
        }
        for (const x of m.formas) {
          expect(relativo(x.medida.volume, x.volumeEsboco), `volume de ${x.forma.id}`).toBeLessThanOrEqual(1e-4);
          expect(desvioDeEnvelope(x.medida, x.caixaEsboco), `envelope de ${x.forma.id}`).toBeLessThanOrEqual(x.tolerancia);
        }
        for (const p of m.traducao.perdas) {
          expect(Math.abs(p.erroVolume.relativo)).toBeLessThanOrEqual(1e-4);
          expect(p.erroEnvelope.mm).toBeLessThanOrEqual(1e-5);
        }
      });
    }

    it('o loft com a ponta em ponto vira o casco de ponta a 1% e declara a perda; o volume a mais é o medido', () => {
      const m = medirOpcao(esbocoDe([{ id: 'l', tipo: 'loft', eixo: 'z', centro: [0, 40, 0], secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 80, tamanho: [0, 0] }] }]), 1);
      const [p] = m.traducao.perdas;
      expect(p.perdido.map((d) => d.codigo)).toEqual(['secao-ponto']);
      expect(m.traducao.naoTraduzidas).toEqual([]);
      perto(p.erroVolume.relativo, 0.0101, 5e-4);
      expect(p.erroEnvelope.mm).toBeLessThanOrEqual(1e-5);
    });

    it('o loft com casca sem inclinação perde só a cavidade: o volume do esboço é externo menos cavidade', () => {
      const bacia = { id: 'b', tipo: 'loft', eixo: 'y', centro: [0, 40, 0], casca: { espessura: 6, aberta: 'fim' }, secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 60, tamanho: [140, 90] }] };
      const m = medirOpcao(esbocoDe([bacia]), 1);
      const x = m.todas[0];
      const [p] = m.traducao.perdas;
      expect(p.perdido.map((d) => d.codigo)).toEqual(['casca']);
      const cavidade = volumeDeLoftPorFaixas(x.r.prisma.casca.cavidade);
      expect(relativo(p.volumeEsboco, x.volumeEsboco - cavidade)).toBeLessThanOrEqual(1e-6);
      expect(relativo(p.volumeAndaime, x.volumeEsboco)).toBeLessThanOrEqual(1e-6);
      expect(p.erroEnvelope.mm).toBeLessThanOrEqual(1e-5);
    });
  });

  describe('o orçamento de volumes do alvo', () => {
    it('um componente com detalhe interno é recolhido ao envelope da forma principal quando o andaime passa do orçamento', () => {
      const esboco = lerJson(caminhos.get('moto-componentes.esboco.json'));
      const inteiro = andaimeDoEsboco(esboco);
      const total = inteiro.andaime.volumes.length;
      const r = andaimeDoEsboco(esboco, { volumesMaximos: total - 2 });
      const recolhidos = r.perdas.filter((q) => q.tipo === 'componente');
      expect(recolhidos.length).toBeGreaterThan(0);
      expect(r.andaime.volumes.length).toBeLessThanOrEqual(total - 2);
      const antes = medirVolumes(compilarAndaime(inteiro.andaime));
      for (const q of recolhidos) {
        expect(q.aproximacao).toBe('componente-recolhido-ao-envelope');
        expect(q.formas.length).toBeGreaterThanOrEqual(2);
        expect(q.perdido[0].codigo).toBe('detalhe-interno');
        for (const id of q.formas) expect(r.tabela[id]).toBe(q.volumeId);
        const volume = r.andaime.volumes.find((v) => v.id === q.volumeId);
        expect(volume.tipo).toBe('caixa');
        /* o volume do esboço é a soma dos volumes das formas traduzidas do componente, medidos na blocagem inteira antes de recolher */
        const soma = q.formas.filter((id) => inteiro.tabela[id]).reduce((s, id) => s + antes.get(inteiro.tabela[id]).volume, 0);
        expect(relativo(q.volumeEsboco, soma)).toBeLessThanOrEqual(1e-6);
        perto(q.volumeAndaime, volume.dimensoes[0] * volume.dimensoes[1] * volume.dimensoes[2], 1e-3);
      }
      /* o resto do andaime é o mesmo, forma a forma */
      const recolhidasIds = new Set(recolhidos.flatMap((q) => q.formas));
      for (const [id, destino] of Object.entries(inteiro.tabela)) if (!recolhidasIds.has(id)) expect(r.tabela[id]).toBe(destino);
      expect(JSON.stringify(andaimeDoEsboco(esboco, { volumesMaximos: total - 2 }))).toBe(JSON.stringify(r));
    });

    it('sem forma recolhível que baste, recusa dizendo o orçamento', () => {
      expect(() => andaimeDoEsboco(lerJson(caminhos.get('cadeira-jantar.esboco.json')), { volumesMaximos: 3 })).toThrow(/orçamento do alvo é 3/);
    });
  });
});
