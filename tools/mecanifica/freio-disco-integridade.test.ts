/* freio-disco-integridade.test.ts — testes de integridade do primeiro sistema
   mecânico da Mecanifica (Fase 3). Não medem beleza: medem as relações que o
   domínio exige e que uma mudança de parâmetro pode romper em silêncio — a
   pinça abraçando o disco, a folga de repouso das duas pastilhas, o pistão
   encostado na costa da pastilha interna — e o critério de saída da fase:
   toda face tem identidade e toda parte é alcançável pelo NOME.
   Referência das medidas: docs/mecanifica/PRANCHA-FREIO-DISCO.md. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as freio from '../../prototipos/procedural/v3/pecas/freio-disco.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — módulo neutro de medição em JavaScript.
import { caixaDaParte, corposDaParte, descreverPeca } from '../../src/autoria/descrever-partes.js';
// @ts-expect-error — a mesma gramática aritmética que o núcleo usa para os PARAMS derivados.
import { criarResolverNumerico } from '../../prototipos/procedural/v3/motor/expressoes.js';

const PARTES = [
  'disco', 'cubo', 'pinca', 'suporte',
  'pistao', 'pastilhaInterna', 'pastilhaExterna', 'flexivel',
];

function montar() {
  const neutro = nucleo(
    freio.PASSOS,
    freio.PARAMS,
    freio.TOPO,
    freio.MATERIAIS,
    null,
    freio.ALIASES,
  );
  /* caixa delimitadora POR NOME de parte — é assim que um agente posterior mede
     o conjunto sem tocar em índice de vértice ou de face. A medição não mora
     mais aqui: saiu para `src/autoria/descrever-partes.js` (módulo neutro, sem
     Three.js), que o CLI `npm run descrever` e a bancada também consomem. */
  const caixa = (parte: string) => caixaDaParte(neutro, parte);
  return { neutro, caixa };
}

const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

/* Medida DERIVADA em número. `PARAMS.cuboFaceRodaX` é a string '= …': a peça
   guarda a RELAÇÃO, não o valor calculado fora (A-5). Reescrever a conta aqui
   faria o teste repetir a fórmula da peça — o defeito que este arquivo já
   nomeia mais abaixo —, então quem avalia é a mesma gramática do núcleo. */
const medida = (() => {
  const { num } = criarResolverNumerico({ ...freio.PARAMS, ...freio.TOPO });
  return (nome: string): number => num(nome);
})();

describe('integridade do freio a disco', () => {
  it('não tem órfão e nenhuma face fica sem identidade', () => {
    const { neutro } = montar();
    expect(neutro.orfaos).toEqual([]);
    const semParte = [...neutro.F.values()].filter((f: any) => !f.parte);
    expect(semParte).toEqual([]);
  });

  it('expõe as oito partes do sistema pelo nome, e só elas', () => {
    const { neutro } = montar();
    const nomes = new Set<string>();
    for (const face of neutro.F.values()) nomes.add(face.parte);
    expect([...nomes].sort()).toEqual([...PARTES].sort());

    const convertido = adaptarThree(neutro, { nome: freio.meta.nome });
    expect(convertido.diagnosticos).toEqual({ facesSemParte: [], semanticaIntegra: true });
    for (const parte of PARTES) expect(convertido.partes.has(parte)).toBe(true);
  });

  it('a pinça abraça o disco: a ponte passa por fora do raio e as garras ficam nos dois lados', () => {
    const { caixa } = montar();
    const disco = caixa('disco');
    const pinca = caixa('pinca');
    const P = freio.PARAMS;

    // a ponte passa POR CIMA do topo do disco, com a folga declarada
    perto(disco.max[1], P.discoRaio);
    perto(pinca.max[1], P.discoRaio + P.folgaPonte + P.pincaPonteAltura);
    expect(pinca.max[1]).toBeGreaterThan(disco.max[1]);

    // e a pinça atravessa o plano do disco de lado a lado
    expect(pinca.min[0]).toBeLessThan(-P.discoEspessura / 2);
    expect(pinca.max[0]).toBeGreaterThan(P.discoEspessura / 2);
  });

  it('as pastilhas ficam uma de cada lado do disco, com a folga de repouso', () => {
    const { caixa } = montar();
    const P = freio.PARAMS;
    const faceInterna = -P.discoEspessura / 2;
    const faceExterna = P.discoEspessura / 2;
    const interna = caixa('pastilhaInterna');
    const externa = caixa('pastilhaExterna');

    perto(faceInterna - interna.max[0], P.folgaPastilha);
    perto(externa.min[0] - faceExterna, P.folgaPastilha);
    perto(interna.max[0] - interna.min[0], P.pastilhaEspessura);
    perto(externa.max[0] - externa.min[0], P.pastilhaEspessura);

    // mesma faixa radial nos dois lados, e ela cabe dentro do disco
    perto(interna.min[1], externa.min[1]);
    perto(interna.max[1], externa.max[1]);
    expect(interna.max[1]).toBeLessThan(P.discoRaio);
  });

  it('o pistão empurra a pastilha interna: encosta na costa dela e vem de dentro', () => {
    const { caixa } = montar();
    const pistao = caixa('pistao');
    const interna = caixa('pastilhaInterna');

    perto(pistao.max[0], interna.min[0]);          // encosta, sem vão e sem invadir
    expect(pistao.min[0]).toBeLessThan(interna.min[0]);   // vem do lado de dentro
    // e está centrado na altura da pastilha
    perto((pistao.min[1] + pistao.max[1]) / 2, (interna.min[1] + interna.max[1]) / 2);
  });

  it('o suporte fica atrás da garra interna, do lado de dentro do carro', () => {
    const { caixa } = montar();
    const suporte = caixa('suporte');
    const pinca = caixa('pinca');
    perto(suporte.max[0], pinca.min[0]);
    expect(suporte.min[0]).toBeLessThan(pinca.min[0]);
  });

  /* As asserções acima afirmam COORDENADA (`perto(pistao.max[0], interna.min[0])`)
     e por isso passam verdes por construção: elas repetem a fórmula da peça em
     vez de julgar a montagem. As três abaixo afirmam RELAÇÃO, medida corpo a
     corpo pela mesma régua do `npm run descrever`, e é essa régua que acusou
     peça fixa atravessando peça rotativa em código já shipado. */
  const relacoes = () => {
    const { neutro } = montar();
    const mapa = new Map<string, any>();
    for (const r of descreverPeca(neutro).relacoes) mapa.set(`${r.a}~${r.b}`, r);
    return mapa;
  };

  it('nenhuma peça FIXA atravessa peça que GIRA com a roda', () => {
    const P = freio.PARAMS;
    const r = relacoes();
    /* o suporte é parafusado na manga de eixo; o cubo e o disco giram com a
       roda. Interpenetração aqui não é montagem apertada, é impossibilidade
       física — e uma demonstração que existe para ensinar o freio ensinaria
       errado. A folga vem do parâmetro, não de um número digitado no teste. */
    for (const par of ['cubo~suporte', 'disco~suporte']) {
      expect([par, r.get(par).tipo]).toEqual([par, 'folga']);
    }
    /* o chapéu é o maior raio que gira ao lado da placa: é ele que decide */
    perto(r.get('disco~suporte').distancia, P.folgaSuporte);
    expect(r.get('cubo~suporte').distancia).toBeGreaterThan(P.folgaSuporte);
  });

  it('nada que GIRA encosta no que deveria estar livre dele em repouso', () => {
    const P = freio.PARAMS;
    const r = relacoes();
    /* A conversão do suporte não bastava. `perto(faceInterna - interna.max[0],
       P.folgaPastilha)` afirma que a peça obedece ao próprio parâmetro — é
       verdade por construção e continua verde com `folgaPastilha: 0`, isto é,
       com a pastilha ARRASTANDO no disco. Justamente a falha que esta
       demonstração existe para explicar ao cliente.
       A lei que faltava não é a igualdade, é a POSITIVIDADE: em repouso o disco
       gira livre, então pastilha e ponte não podem tocá-lo. Afirmamos as duas —
       o tipo e o sinal — para que nem a montagem nem o parâmetro possam mentir. */
    for (const par of ['disco~pastilhaInterna', 'disco~pastilhaExterna']) {
      expect([par, r.get(par).tipo]).toEqual([par, 'folga']);
      expect([par, r.get(par).distancia > 0]).toEqual([par, true]);
      perto(r.get(par).distancia, P.folgaPastilha);
    }
    /* a ponte passa POR FORA do raio do disco: se raspar, o freio trava */
    expect(['disco~pinca', r.get('disco~pinca').tipo]).toEqual(['disco~pinca', 'folga']);
    expect(r.get('disco~pinca').distancia).toBeGreaterThan(0);
    perto(r.get('disco~pinca').distancia, P.folgaPonte);
  });

  it('o suporte continua sustentando a garra interna inteira, e não só a evitando', () => {
    const P = freio.PARAMS;
    /* a placa é escolhida pelo que ela É — o único corpo do suporte que cruza o
       plano central do eixo; as duas orelhas ficam nos lados. Nada de índice. */
    const noPlanoCentral = corposDaParte(montar().neutro, 'suporte')
      .filter((c: any) => c.min[2] <= 0 && c.max[2] >= 0);
    expect(noPlanoCentral).toHaveLength(1);
    const [placa] = noPlanoCentral;
    const garraTopo = P.pincaGarraBaseY + P.pincaGarraAltura;

    // afastar a placa do eixo não pode soltar a pinça no ar: a placa cobre toda
    // a faixa radial da garra que ela ancora, nos dois extremos
    expect(placa.min[1]).toBeLessThanOrEqual(P.pincaGarraBaseY);
    expect(placa.max[1]).toBeGreaterThanOrEqual(garraTopo);
    perto(placa.max[1] - garraTopo, P.suporteSobraGarra);
    // e continua encostada atrás dela, sustentando de fato
    expect(relacoes().get('pinca~suporte').tipo).toBe('encosta');
  });

  it('as sobreposições que RESTAM são montagem, e cada uma tem um porquê mecânico', () => {
    const r = relacoes();
    /* Registradas como intencionais para que a próxima rodada não as "conserte":
       o pistão mora no alojamento da garra; a mangueira entra na pinça pelo
       banjo; o cubo fica dentro do chapéu porque nem o chapéu tem cavidade nem
       o disco tem furo central neste modelo — e o flange precisa atravessar o
       plano do disco para chegar à roda. */
    for (const par of ['pinca~pistao', 'flexivel~pinca', 'cubo~disco']) {
      expect([par, r.get(par).tipo]).toEqual([par, 'interpenetra']);
    }
    // e nenhum outro par se invade
    const invasores = [...r.values()].filter((x: any) => x.tipo === 'interpenetra')
      .map((x: any) => `${x.a}~${x.b}`).sort();
    expect(invasores).toEqual(['cubo~disco', 'flexivel~pinca', 'pinca~pistao']);
  });

  it('o conjunto é determinístico: a mesma entrada dá a mesma malha', () => {
    const a = montar().neutro;
    const b = montar().neutro;
    expect(a.V.size).toBe(b.V.size);
    expect(a.F.size).toBe(b.F.size);
    for (const [id, p] of a.V) expect(b.V.get(id)).toEqual(p);
  });
});

/* ---------------------------------------------------------------------------
   FLANGE DE RODA — UM disco com o círculo de prisioneiros furado nele
   (rodada "Flange de uma peça só").

   O QUE MUDOU. O ciclo "Corte e orientação de seção v1" fechou a omissão do
   plano — "o cubo do freio continua sem prisioneiro" — com um RESSALTO quadrado
   por prisioneiro, posto pelo `arranja` radial e furado um a um. Os ressaltos
   não vinham do desenho mecânico: vinham de um passo de `furo` consumir a face
   de entrada, então cada furo precisava de uma face só dele. Com o `centros` da
   rodada "Furo v2" os quatro furos saem da MESMA face num passo só, e o flange
   virou o que um flange de roda é.

   ESTAS AFIRMAÇÕES AFIRMAM MAIS, NÃO MENOS. As de antes continuam todas, com o
   nome novo do parâmetro: um furo por prisioneiro, cada um um corpo separado,
   passante de lado a lado, no círculo declarado, com o diâmetro do parâmetro
   que o nomeia e os anéis em fase. Entraram três: o flange é UM corpo (era um
   por prisioneiro), cada furo continua endereçável SOZINHO, e a superfície de
   apoio da roda passou a ser a borda MAIS o preenchimento — que só existe
   porque há mais de um anel na face.

   Contar face não basta: um furo no lugar errado, um furo cego no lugar de um
   passante ou um assento sem furo dariam a MESMA contagem, e a foto do conjunto
   inteiro é pequena demais para acusar 13 mm.
   --------------------------------------------------------------------------- */
describe('flange de roda: um disco, um passo de corte, quatro prisioneiros', () => {
  /* as famílias do corte, endereçadas pelos ALIASES que a peça publica — nada
     de id de face. A sonda reatribui `parte`, por isso `substituir`. */
  const comSonda = () => nucleo(
    [
      ...freio.PASSOS,
      ['parte', { nome: 'paredesSonda', sel: { alias: 'paredesDosPrisioneiros' }, substituir: true }],
      ['parte', { nome: 'assentosSonda', sel: { alias: 'assentosDeRoda' }, substituir: true }],
    ],
    freio.PARAMS, freio.TOPO, freio.MATERIAIS, null, freio.ALIASES,
  );

  it('há um furo por prisioneiro declarado, e cada um é um corpo separado', () => {
    const neutro = comSonda();
    expect(neutro.orfaos).toEqual([]);
    const paredes = [...neutro.F.values()].filter((f: any) => f.parte === 'paredesSonda');
    /* uma parede por lado do anel, em cada furo. Mudar `prisioneiros` derruba
       esta conta — e, ao contrário de antes, é a ÚNICA coisa que precisa
       mudar na peça para o flange acompanhar. */
    expect(paredes.length).toBe(freio.TOPO.prisioneiros * freio.TOPO.ladosFuroPrisioneiro);
    expect(corposDaParte(neutro, 'paredesSonda').length).toBe(freio.TOPO.prisioneiros);
  });

  it('UM passo de corte abre os quatro: o flange deixou de ser uma chapa por prisioneiro', () => {
    /* A afirmação central da rodada, e a que morre se alguém devolver os
       ressaltos. Antes: 4 passos de `furo` e 5 corpos no `cubo` (o barril mais
       um ressalto por prisioneiro). Agora: 1 passo, flange único e o terceiro
       corpo do cubo é o piloto declarado pelo AUT-2026-06. */
    const cortes = freio.PASSOS.filter((p: any) => p[0] === 'furo');
    expect(cortes.length).toBe(1);
    expect((cortes[0] as any)[1].centros.total).toBe('prisioneiros');
    expect(corposDaParte(comSonda(), 'cubo').length).toBe(3);
    // e nenhum `arranja` sobrou na peça: o círculo de furos não é mais cópia de sólido
    expect(freio.PASSOS.some((p: any) => p[0] === 'arranja')).toBe(false);
  });

  it('trocar `prisioneiros` muda o desenho e MAIS NADA na peça', () => {
    /* A promessa que o ressalto por prisioneiro não conseguia cumprir. Com ele,
       mudar 4 para 5 deixava o quinto assento sem furo até alguém escrever à
       mão o corte dele — e o corte a 72° exigia cosseno como PARAM (A-29). Com
       `centros:{volta:360, total:'prisioneiros'}` o número é a única coisa a
       mudar, e o passo angular sai da divisão. */
    for (const total of [3, 5, 6, 8]) {
      const neutro = nucleo(
        [...freio.PASSOS, ['parte', { nome: 'paredesSonda', sel: { alias: 'paredesDosPrisioneiros' }, substituir: true }]],
        freio.PARAMS, { ...freio.TOPO, prisioneiros: total }, freio.MATERIAIS, null, freio.ALIASES,
      );
      expect([total, neutro.orfaos]).toEqual([total, []]);
      expect([total, corposDaParte(neutro, 'paredesSonda').length]).toEqual([total, total]);
      // e todos no círculo declarado, sem uma coordenada de furo na peça
      for (const corpo of corposDaParte(neutro, 'paredesSonda')) {
        const y = (corpo.min[1] + corpo.max[1]) / 2, z = (corpo.min[2] + corpo.max[2]) / 2;
        expect(Math.hypot(y, z)).toBeCloseTo(medida('prisioneiroOrbita'), 9);
      }
    }
  });

  it('cada furo continua endereçável SOZINHO, e não é um borrão de 48 paredes', () => {
    /* sem o eixo `furo` na origem, `segundoPrisioneiro` pediria as 48 paredes e
       receberia as 48 — o passo único teria custado a identidade individual,
       que é exatamente o que a op se recusou a perder. */
    const neutro = nucleo(
      [...freio.PASSOS, ['parte', { nome: 'umSo', sel: { alias: 'segundoPrisioneiro' }, substituir: true }]],
      freio.PARAMS, freio.TOPO, freio.MATERIAIS, null, freio.ALIASES,
    );
    expect(neutro.orfaos).toEqual([]);
    const so = [...neutro.F.values()].filter((f: any) => f.parte === 'umSo');
    expect(so.length).toBe(freio.TOPO.ladosFuroPrisioneiro);
    expect(corposDaParte(neutro, 'umSo').length).toBe(1);
    /* e é o SEGUNDO do círculo, não um qualquer: `volta:360` com `total:4`
       começa em +Y (a `orientacao` declarada) e anda 90° por furo, então o
       furo 1 está no eixo Z. Trocar `furo: 1` por outro índice mata isto. */
    const caixa = corposDaParte(neutro, 'umSo')[0];
    const y = (caixa.min[1] + caixa.max[1]) / 2, z = (caixa.min[2] + caixa.max[2]) / 2;
    perto(Math.hypot(y, z), medida('prisioneiroOrbita'));
    expect(Math.abs(y)).toBeLessThan(1e-9);
    expect(Math.abs(z)).toBeCloseTo(medida('prisioneiroOrbita'), 9);
  });

  it('cada furo ATRAVESSA o flange de lado a lado — é passante, não cego', () => {
    for (const corpo of corposDaParte(comSonda(), 'paredesSonda')) {
      perto(corpo.min[0], medida('cuboFaceRodaX'));
      perto(corpo.max[0], medida('flangeFaceRodaX'));
    }
  });

  it('os furos ficam no círculo de prisioneiros, a 90° um do outro', () => {
    const centros = corposDaParte(comSonda(), 'paredesSonda')
      .map((c: any) => [(c.min[1] + c.max[1]) / 2, (c.min[2] + c.max[2]) / 2]);
    // todos no MESMO raio, e é o raio que o parâmetro nomeia
    for (const [y, z] of centros) perto(Math.hypot(y, z), medida('prisioneiroOrbita'));
    // e nos quatro pontos cardeais: é isso que `volta:360` com `total:4` promete
    const chave = (p: number[]) => p.map((n) => +n.toFixed(9)).join(',');
    const R = +medida('prisioneiroOrbita').toFixed(9);
    expect(centros.map(chave).sort()).toEqual(
      [[R, 0], [-R, 0], [0, R], [0, -R]].map(chave).sort(),
    );
  });

  it('o furo tem o diâmetro do parâmetro que o nomeia, e sobra flange em volta', () => {
    const P = freio.PARAMS;
    for (const corpo of corposDaParte(comSonda(), 'paredesSonda')) {
      perto(corpo.max[1] - corpo.min[1], 2 * P.prisioneiroFuroRaio);
      perto(corpo.max[2] - corpo.min[2], 2 * P.prisioneiroFuroRaio);
    }
    /* e o furo não come o flange inteiro. Antes a folga era contra a largura do
       ressalto; agora é contra o RAIO do flange, dos dois lados do círculo de
       prisioneiros — é a relação que um flange de verdade tem. A conta usa o
       apótema do polígono de `ladosCubo` lados, não o raio: é o apótema que a
       malha entrega, e é nele que o anel encosta primeiro. */
    const apotema = medida('flangeRaio') * Math.cos(Math.PI / freio.TOPO.ladosCubo);
    expect(medida('prisioneiroOrbita') + P.prisioneiroFuroRaio).toBeLessThan(apotema);
    expect(P.prisioneiroFuroRaio).toBeLessThan(medida('prisioneiroOrbita'));
  });

  it('os quatro anéis saem EM FASE: a parede 0 de cada furo é sempre a de cima', () => {
    /* `orientacao:[0,1,0]` diz para onde aponta o vértice 0 de TODO anel do
       passo. O CONJUNTO de vértices do anel é o mesmo com qualquer fase, mas
       QUEM é a parede 0 muda: com a orientação declarada, o vértice 0 aponta
       para +Y a partir do centro do próprio furo, então a parede 0 é a mais
       distante do eixo naquela direção. Sem a chave, a fase vem do quadro
       interno da face e `{op:'furo', id, furo:k, parede:0}` deixa de nomear a
       mesma região física em furos diferentes. */
    const centro = (i: number) => {
      const passo = 2 * Math.PI * i / freio.TOPO.prisioneiros;
      return [medida('prisioneiroOrbita') * Math.cos(passo), medida('prisioneiroOrbita') * Math.sin(passo)];
    };
    // a identidade do corte vem da peça, nunca copiada à mão para o teste
    const idDoCorte = (freio.PASSOS.find((p: any) => p[0] === 'furo') as any)[1].origemId;
    for (let k = 0; k < freio.TOPO.prisioneiros; k++) {
      const neutro = nucleo(
        [...freio.PASSOS, ['parte', { nome: 'sonda', sel: { origem: { op: 'furo', id: idDoCorte, furo: k, parede: 0 } }, substituir: true }]],
        freio.PARAMS, freio.TOPO, freio.MATERIAIS, null, freio.ALIASES,
      );
      expect(neutro.orfaos).toEqual([]);
      const faces = [...neutro.F.values()].filter((f: any) => f.parte === 'sonda');
      expect(faces).toHaveLength(1);
      /* a parede 0 é a aresta 0→1 do anel, e o vértice 0 está a
         `prisioneiroFuroRaio` do centro do furo NA DIREÇÃO +Y. */
      const [cy, cz] = centro(k);
      const pontos = faces[0].vs.map((v: number) => neutro.V.get(v)!);
      const desloc = pontos.map((p: number[]) => [p[1] - cy, p[2] - cz]);
      const topo = desloc.reduce((m: number[], p: number[]) => (p[0] > m[0] ? p : m), [-Infinity, 0]);
      perto(topo[0], freio.PARAMS.prisioneiroFuroRaio);
      expect(Math.abs(topo[1])).toBeLessThan(1e-9);
    }
  });

  it('o piloto é menor que o flange: a roda centraliza antes de apoiar', () => {
    const P = freio.PARAMS;
    const neutro = comSonda();
    const cubo = caixaDaParte(neutro, 'cubo');
    // piloto avança para fora do flange, mas é radialmente menor.
    perto(cubo.max[0], medida('pilotoFimX'));
    expect(medida('pilotoInicioX')).toBeCloseTo(medida('flangeFaceRodaX'), 9);
    expect(medida('pilotoFimX')).toBeGreaterThan(medida('flangeFaceRodaX'));
    expect(P.pilotoRaio).toBeLessThan(P.cuboRaio);
    /* O flange continua no raio do barril para sustentar a face da roda; agora
       isso não é o mesmo diâmetro que a centraliza. */
    perto(cubo.max[1], P.cuboRaio);
    perto(medida('flangeRaio'), P.cuboRaio);
  });

  it('a face em que a roda encosta é a borda MAIS o preenchimento', () => {
    /* o corte CONSOME a face de entrada. Com UM furo por face o que sobrava era
       só a borda, que dava a volta inteira; com quatro anéis na mesma face a
       borda deixa de fechar a volta e o resto do flange é o PREENCHIMENTO. Os
       dois juntos são a superfície de apoio da roda — se o alias esquecesse um
       deles, a peça perderia superfície sem perder uma única face. */
    const neutro = comSonda();
    const assentos = [...neutro.F.values()].filter((f: any) => f.parte === 'assentosSonda');
    const bordas = freio.TOPO.prisioneiros * freio.TOPO.ladosFuroPrisioneiro;
    // preenchimento: `n + 2M − 2` faces, com n cantos do contorno e M anéis
    const preenchimento = freio.TOPO.ladosCubo + 2 * freio.TOPO.prisioneiros - 2;
    expect(assentos.length).toBe(bordas + preenchimento);
    for (const f of assentos) expect(f.material).toBe('acoCubo');
    // e é UMA superfície contínua, não quatro ilhas soltas
    expect(corposDaParte(neutro, 'assentosSonda').length).toBe(1);
  });
});
