/* A ponte das famílias procedurais para o esboço (`esboco-familias.mjs` e `modulos/esboco/src/familia.js`), com a roda 2.0 e o cilindro
   hidráulico de verdade: o atrito E7 do esboço do avião, em que as famílias de `procedural/familias` não entravam no JSON e o trem usou
   o componente `roda` e cilindros por `ligar`. A prova é uma perna do trem num esboço construído (`tools/fixtures/esboco-com-familias/
   perna-do-trem.esboco.json`: a longarina, duas orelhas, o pino, o cilindro hidráulico como amortecedor, o eixo e a roda do trem), lida
   por cada consumidor do módulo: o desenho (a camada das quatro vistas), o gate de contato (a perna é um grupo conectado, o pino e o eixo
   entram nos furos sem atravessar a parede, e o pino grosso demais atravessa), as medidas (dos parâmetros da família e das âncoras das
   portas), o `--descrever`, o Envelope de unidade e a blocagem do nível zero. A ponte é genérica: o teste também chama toda família do
   registro, sem caso especial. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ancorasDe, desenharEsboco, ErroDeEsboco, resolverOpcao } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { verificarContato } from '../../modulos/esboco/src/contato.js';
import { formatarDescricao, formatarForma, medirEsboco } from '../../modulos/esboco/src/descrever.js';
import { conferirPlano, visiveisDoEsboco } from '../../modulos/esboco/src/plano.js';
import { conferirEnvelope, criarEstado, planoDeDetalhe, portaoDoEstagio } from '../../modulos/esboco/src/condutor.js';
import { detalharUnidade } from '../../modulos/esboco/src/detalhe.js';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { cascoConvexo, pontosDe } from '../../modulos/esboco/src/decomposicao-convexa.js';
import { cascoEmSecoes, lerMalha } from '../../modulos/esboco/src/malha.js';
import { temProvedorDeFamilias } from '../../modulos/esboco/src/familia.js';
import { criarRegistroDeFamilias } from '../../procedural/familias/index.js';
import { malhaDaChamada } from './esboco-familias.mjs';
import { blocagemDoEsboco } from './esboco-blocagem.mjs';
import { nivelZeroDoEsboco } from './esboco-nivel-zero.mjs';
import { andaimeDoEsboco, medidasDoAndaime } from './esboco-para-andaime.mjs';
import { ajuda, README_DO_ESBOCO } from './esboco-ajuda.mjs';
import { variante, VISTAS_DA_ANALISE } from './esboco.mjs';
import { iou, mascaraDaCamada } from './esboco-silhueta.mjs';

const perna = () => JSON.parse(readFileSync(new URL('../fixtures/esboco-com-familias/perna-do-trem.esboco.json', import.meta.url), 'utf8'));
const comForma = (esboco, id, campos) => ({ ...esboco, opcoes: esboco.opcoes.map((o) => ({ ...o, formas: o.formas.map((f) => (f.id === id ? { ...f, ...campos } : f)) })) });
const perto = (v, alvo, casas = 2) => v.forEach((x, i) => expect(x).toBeCloseTo(alvo[i], casas));
const resolvidas = (e) => { const x = expandirEsboco(e); return resolverOpcao(x.opcoes[0], 'opção 1', x.pontos); };

describe('o provedor entrega a malha de qualquer família do registro', () => {
  it('instala o provedor no módulo ao ser importado', () => {
    expect(temProvedorDeFamilias()).toBe(true);
  });

  it('a roda 2.0 em milímetro: as quatro partes, as três portas como âncoras, o eixo das portas e o diâmetro do parâmetro', () => {
    const dado = malhaDaChamada({ familia: 'roda-pneu', perfil: 'trem', parametros: { diametroPneu: 500 } });
    expect(dado).toMatchObject({ formato: 'mecanifica.malha@1', familia: 'roda-pneu', perfil: 'trem', eixo: 'x' });
    expect(dado.partes.map((p) => p.nome)).toEqual(['cubo', 'pneu', 'aro', 'disco']);
    expect(dado.partes.at(-1).ate).toBe(dado.faces.length);
    expect(Object.keys(dado.ancoras)).toEqual(['assento-do-pneu', 'eixo', 'furos-de-fixacao']);
    expect(dado.portas.map((p) => [p.id, p.tipo, p.papel])).toEqual([['assento-do-pneu', 'anel', 'ocupa'], ['eixo', 'anel', 'recebe'], ['furos-de-fixacao', 'padraoFuros', 'recebe']]);
    const m = lerMalha(dado);
    perto(m.caixa.max.map((v, e) => v - m.caixa.min[e]), [100, 500, 500], 3);
    expect(m.volume).toBeGreaterThan(1e6);
  });

  it('o cilindro hidráulico: o vão entre os olhais é o comprimento recolhido, e o ajuste do esboço vale mais que o padrão', () => {
    const vao = (parametros) => {
      const m = lerMalha(malhaDaChamada({ familia: 'cilindro-hidraulico', parametros }));
      return Math.hypot(...m.ancoras['olhal-dianteiro'].map((c, e) => c - m.ancoras['olhal-traseiro'][e]));
    };
    expect(vao({})).toBeCloseTo(470, 3);
    expect(vao({ curso: 200, comprimentoRecolhido: 400 })).toBeCloseTo(400, 3);
    expect(malhaDaChamada({ familia: 'cilindro-hidraulico' }).partes.map((p) => p.nome)).toEqual(['tubo', 'cabeca', 'olhal-traseiro', 'pescoco-traseiro', 'embolo', 'haste', 'olhal-dianteiro', 'terminal']);
  });

  it('é determinístico e recusa com a mensagem da própria família', () => {
    const pedido = { familia: 'roda-pneu', perfil: 'carro', parametros: { diametroPneu: 480 } };
    expect(JSON.stringify(malhaDaChamada(pedido))).toBe(JSON.stringify(malhaDaChamada(pedido)));
    expect(() => malhaDaChamada({ familia: 'roda-quadrada' })).toThrow(/uma família registrada/);
    expect(() => malhaDaChamada({ familia: 'roda-pneu', perfil: 'foguete' })).toThrow(/um perfil da família/);
    expect(() => malhaDaChamada({ familia: 'roda-pneu', parametros: { diametroPneu: 5 } })).toThrow(/parametros.diametroPneu/);
    expect(() => malhaDaChamada({ familia: 'cilindro-hidraulico', parametros: { curso: 200 } })).toThrow(/comprimento-longo-demais/);
  });

  it('toda família do registro vira uma malha lida, com as portas como âncoras e o casco por seções convexo, sem caso especial', () => {
    const registro = criarRegistroDeFamilias();
    expect(registro.familias.length).toBeGreaterThanOrEqual(5);
    for (const id of registro.familias) {
      const dado = malhaDaChamada({ familia: id });
      const m = lerMalha(dado, id);
      expect(m.partes.length, id).toBeGreaterThan(0);
      expect(m.volume, id).toBeGreaterThan(0);
      for (const p of registro.obter(id).contrato.portas) {
        expect(dado.portas.map((q) => q.id), `${id}: a porta ${p.id}`).toContain(p.id);
      }
      for (const [nome, ponto] of Object.entries(m.ancoras)) expect(ponto.every(Number.isFinite), `${id}.${nome}`).toBe(true);
      /* o casco de cada parte tem no máximo 2n - 4 triângulos: a asa de seções planas, de centenas de pontos em cada plano, chegava a 19
         triângulos por ponto (34 mil para 1828) quando o casco incremental não desempatava os pontos coplanares */
      for (const parte of m.partes) {
        const pontos = pontosDe(m.faces.slice(parte.de, parte.ate).map((f) => f.map((i) => m.vertices[i])));
        const casco = cascoConvexo(pontos);
        if (casco) expect(casco.faces.length, `${id}, parte ${parte.nome}`).toBeLessThanOrEqual(2 * pontos.length - 4);
      }
      const c = cascoEmSecoes(m);
      for (const s of c.secoes) {
        let sinal = 0;
        for (let i = 0; i < s.perfil.length; i++) {
          const a = s.perfil[i]; const b = s.perfil[(i + 1) % s.perfil.length]; const d = s.perfil[(i + 2) % s.perfil.length];
          const cruz = (b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]);
          if (Math.abs(cruz) <= 1e-9) continue;
          if (sinal !== 0) expect(Math.sign(cruz), `${id}: seção em ${s.w}`).toBe(sinal);
          sinal = Math.sign(cruz);
        }
      }
    }
  }, 60_000);
});

describe('a perna do trem, com a roda 2.0 e o cilindro hidráulico escritos no JSON do esboço', () => {
  it('posiciona as famílias pelas âncoras das portas: o olhal de trás sob a longarina, o da frente no eixo da roda', () => {
    const rs = resolvidas(perna());
    const por = (id) => rs.find((r) => r.id === id);
    const ancoras = (id) => ancorasDe(por(id));
    perto(ancoras('amortecedor')['olhal-traseiro'], [0, 925, 0]);
    perto(ancoras('amortecedor')['olhal-dianteiro'], [0, 455, 0]);
    expect(Object.keys(ancoras('roda'))).toEqual(['centro', 'assento-do-pneu', 'eixo', 'furos-de-fixacao', '+x', '-x', '+y', '-y', '+z', '-z']);
    perto(por('roda').min, [-250, 205, 42]);
    perto(por('roda').max, [250, 705, 142]);
  });

  it('desenha as duas famílias nas quatro vistas, com a camada de cada forma e a mesma imagem a cada vez', () => {
    const e = perna();
    const a = desenharEsboco(e, { camada: true });
    expect(desenharEsboco(e, { camada: true }).svg).toBe(a.svg);
    for (const id of ['amortecedor', 'roda']) {
      const f = a.camada.formas.find((x) => x.id === id);
      expect(f.faces.length, id).toBeGreaterThan(100);
      expect(f.tracos.length, id).toBeGreaterThan(10);
    }
    const formasDaVista = (vista) => desenharEsboco({ ...e, vista }, { camada: true }).camada.formas.filter((f) => f.faces.length > 0).map((f) => f.id);
    for (const vista of VISTAS_DA_ANALISE) expect(formasDaVista(vista), vista).toEqual(expect.arrayContaining(['longarina', 'amortecedor', 'roda', 'pino', 'eixoDaRoda']));
    /* o corte pelo plano do meio mostra a seção da roda e do amortecedor */
    expect(desenharEsboco({ ...e, corte: { eixo: 'x', valor: 0 }, vista: 'isometrica' }).svg).toContain('hachura');
  }, 60_000);

  it('o gate de contato aprova a perna: um grupo conectado, o pino e o eixo nos furos sem atravessar, nenhuma colisão', () => {
    const e = perna();
    const g = verificarContato(e);
    expect(g.resultado).toBe('aprovado');
    expect(g.achados).toEqual([]);
    const m = medirEsboco(e).descricao.opcoes[0];
    expect(m.soltas).toEqual([]);
    expect(m.sobreposicoes3d).toEqual([]);
    const toca = (a, b) => m.contatos.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
    for (const par of [['amortecedor', 'pino'], ['amortecedor', 'eixoDaRoda'], ['eixoDaRoda', 'roda'], ['orelhaA', 'pino'], ['orelhaB', 'pino'], ['longarina', 'orelhaA'], ['longarina', 'orelhaB']]) expect(toca(...par), par.join(' e ')).toBeTruthy();
    /* o furo e o oco são livres: o que sobra é a concavidade que a decomposição aceita (0,25% da diagonal), bem dentro da tolerância */
    for (const par of [['amortecedor', 'pino'], ['amortecedor', 'eixoDaRoda'], ['eixoDaRoda', 'roda']]) expect(toca(...par).penetracao_mm ?? 0, par.join(' e ')).toBeLessThanOrEqual(1.5);
  }, 60_000);

  it('o pino grosso demais (40 mm no olhal de 31,5 mm) atravessa a parede, e a roda sem o eixo fica solta', () => {
    const grosso = comForma(perna(), 'pino', { diametro: 40 });
    const g = verificarContato(grosso);
    expect(g.resultado).toBe('reprovado');
    expect(g.achados.some((a) => a.tipo === 'colisao' && a.pecas.includes('pino') && a.pecas.includes('amortecedor'))).toBe(true);
    const sem = perna();
    sem.opcoes[0].formas = sem.opcoes[0].formas.filter((f) => f.id !== 'eixoDaRoda');
    const solta = verificarContato(sem);
    expect(solta.achados.some((a) => (a.tipo === 'voando' || a.tipo === 'longe') && a.pecas.includes('roda'))).toBe(true);
  }, 60_000);

  it('as medidas do plano saem dos parâmetros da família e das âncoras das portas, e a blocagem as lê igual', () => {
    const e = perna();
    const x = expandirEsboco(e);
    const r = conferirPlano(x, visiveisDoEsboco(x));
    expect(r.achados).toEqual([]);
    expect(r.opcoes[0].medidas.map((m) => [m.nome, Math.round(m.medido_mm * 1000) / 1000])).toEqual([['comprimentoRecolhido', 470], ['diametroDaRoda', 500], ['larguraDaRoda', 100], ['alturaDaPerna', 825], ['vaoDoPinoAoEixo', 470]]);
    const b = medidasDoAndaime(e);
    expect(b.naBlocagem.medidas.every((m) => m.lida && m.ok && m.desvio_mm === 0)).toBe(true);
    /* a roda do trem a 480 mm de diâmetro sai da tolerância de 1 mm do plano */
    const menor = comForma(e, 'roda', { parametros: { diametroPneu: 480, diametroFuroCentral: 0.0658 } });
    const y = expandirEsboco(menor);
    expect(conferirPlano(y, visiveisDoEsboco(y)).achados.map((a) => a.texto).join('\n')).toMatch(/diametroDaRoda/);
  }, 60_000);

  it('o --descrever diz a família, o perfil, os ajustes, as partes, o volume, as portas com o eixo no mundo e as âncoras', () => {
    const e = perna();
    const m = medirEsboco(e);
    const texto = formatarDescricao(m.descricao);
    expect(texto).toMatch(/família amortecedor: 8 partes \(tubo, cabeca, olhal-traseiro, pescoco-traseiro, embolo, haste, olhal-dianteiro, terminal\), volume 1172144 mm3; portas eixo-da-haste \(trilho, deslizador, eixo \[0 -1 0\]\); guia-da-haste \(trilho, guia, eixo \[0 -1 0\]\); olhal-dianteiro \(anel, recebe, eixo \[0 0 1\]\); olhal-traseiro \(anel, recebe, eixo \[0 0 1\]\)/);
    expect(texto).toMatch(/família roda \(perfil trem\): 4 partes \(cubo, pneu, aro, disco\), volume \d+ mm3; portas assento-do-pneu \(anel, ocupa, eixo \[0 0 1\]\); eixo \(anel, recebe, eixo \[0 0 1\]\); furos-de-fixacao \(padraoFuros, recebe, eixo \[0 0 1\]\)/);
    expect(texto).toMatch(/âncoras amortecedor: centro \[0 690 15,8\]; eixo-da-haste \[0 537,1 15,8\]; guia-da-haste \[0 537,1 15,8\]; olhal-dianteiro \[0 455 0\]; olhal-traseiro \[0 925 0\]/);
    expect(texto).toMatch(/relação: família roda-pneu, perfil trem, ajustes diametroPneu 500 diametroFuroCentral 0.0632/);
    const so = formatarForma(m.descricao, m.divergencias, 'roda');
    expect(so).toMatch(/família roda/);
    expect(so).not.toMatch(/família amortecedor/);
    expect(formatarDescricao(medirEsboco(e).descricao)).toBe(texto);
  }, 60_000);

  it('o Envelope da unidade lê a caixa da família e a porta que a roda usa, e o detalhe que move a porta não confere', () => {
    const e = perna();
    const unidades = planoDeDetalhe(e).unidades;
    expect(unidades.map((u) => u.id).sort()).toEqual(['fuselagem', 'roda', 'suspensao']);
    const suspensao = unidades.find((u) => u.id === 'suspensao');
    perto(suspensao.envelope.caixa.y, [420.4, 970], 1);
    expect(suspensao.envelope.portas).toEqual([{ forma: 'amortecedor', ancora: 'olhal-dianteiro', ponto: [0, 455, 0], usadaPor: ['roda'] }]);
    /* o detalhe da unidade com o mesmo amortecedor cabe no Envelope e mantém a porta */
    const estado = { unidades, atual: 'detalhe-por-unidade', opcao: 'Perna' };
    const igual = detalharUnidade(e, estado, 'suspensao');
    expect(conferirEnvelope(e, estado, 'suspensao', igual)).toMatchObject({ ok: true, portas: [{ forma: 'amortecedor', ancora: 'olhal-dianteiro', ok: true, desvio_mm: 0 }] });
    /* o comprimento recolhido de 440 mm leva o olhal da frente 30 mm para cima: a porta sai do lugar */
    const curto = comForma(igual, 'amortecedor', { parametros: { curso: 250, comprimentoRecolhido: 440 } });
    const r = conferirEnvelope(e, estado, 'suspensao', curto);
    expect(r.ok).toBe(false);
    expect(r.portas[0]).toMatchObject({ forma: 'amortecedor', ancora: 'olhal-dianteiro', ok: false });
    expect(r.portas[0].desvio_mm).toBeCloseTo(30, 0);
    expect(r.falta.join('\n')).toMatch(/a porta amortecedor\.olhal-dianteiro \(usada por roda\) saiu do lugar/);
  }, 60_000);

  it('a blocagem do nível zero traduz as famílias como casco por seções, declara a perda, e as quatro vistas dão a silhueta do desenho', () => {
    const e = perna();
    const { andaime, tabela, perdas, naoTraduzidas } = andaimeDoEsboco(e);
    expect(naoTraduzidas).toEqual([]);
    expect(andaime.volumes).toHaveLength(7);
    expect(perdas.map((p) => [p.id, p.tipo, p.aproximacao]).sort()).toEqual([['amortecedor', 'familia', 'familia-como-casco'], ['roda', 'familia', 'familia-como-casco']]);
    for (const p of perdas) {
      expect(p.perdido[0].codigo).toBe('superficie');
      expect(p.erroEnvelope.mm).toBeLessThan(1);
      expect(p.erroVolume.relativo).toBeGreaterThan(0);
    }
    expect(andaime.volumes.find((v) => v.id === tabela.roda)).toMatchObject({ tipo: 'casco-secoes', eixoPercurso: 'z' });
    /* a silhueta pela blocagem contra a do desenho das formas: o casco é a roda inteira e o cilindro com os olhais, e por isso o mínimo é
       o do casco por seções (a vista de lado do amortecedor, de olhais estreitos, é a pior), e não o 0,998 das formas exatas */
    const b = blocagemDoEsboco(e);
    const x = expandirEsboco(e);
    for (const vista of VISTAS_DA_ANALISE) {
      const novo = desenharBlocagem({ vista, paineis: [b.paineis[0]] }, { camada: true });
      const atual = desenharEsboco(variante({ ...x, opcoes: [x.opcoes[0]], ladosPorEscala: false }, { vista, legendas: false, centros: false }), { camada: true });
      const r = iou(mascaraDaCamada(novo.camada), mascaraDaCamada(atual.camada));
      expect(r.iou, vista).toBeGreaterThanOrEqual(0.94);
    }
  }, 120_000);

  it('o Portão da Maquete do Condutor passa com a perna, lendo as medidas na blocagem e mostrando as famílias como aproximadas', () => {
    const e = perna();
    const p = portaoDoEstagio(e, criarEstado(e, 'perna'), { nivelZero: nivelZeroDoEsboco });
    expect(p.falta).toEqual([]);
    expect(p.passa).toBe(true);
    const o = p.nivelZero.opcoes[0];
    expect(o).toMatchObject({ titulo: 'Perna', volumes: 7, aproximadas: 2, semEquivalente: 0 });
    expect(o.linhas.join('\n')).toMatch(/aproximado amortecedor \(familia, familia-como-casco\)/);
    expect(nivelZeroDoEsboco(e).opcoes[0].medidas.every((m) => m.lida)).toBe(true);
  }, 60_000);

  it('o --ajuda familia traz a seção, e o esboço sem o provedor recusa dizendo o que falta', () => {
    const r = ajuda('familia', readFileSync(README_DO_ESBOCO, 'utf8'));
    expect(r.codigo).toBe(0);
    expect(r.texto).toMatch(/^### Família/);
    expect(r.texto).toContain('"tipo": "familia"');
    expect(r.texto).toContain('mecanifica.malha@1');
    expect(() => desenharEsboco(comForma(perna(), 'roda', { familia: 'roda-quadrada' }))).toThrow(ErroDeEsboco);
  });
});

