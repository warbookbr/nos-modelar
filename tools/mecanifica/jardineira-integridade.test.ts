/* jardineira-integridade.test.ts — a prova NÃO AUTOMOTIVA do contrato de autoria:
   O-6 (`origem` universal), O-12 (portas semânticas) e, desde o ciclo Endereços
   semânticos v1, A-18 (grade citável em `cone`, `plano` e `chamferBox`), A-19
   (eixo que acompanha a contagem) e A-20 (porta visível fora do núcleo).

   Toda evidência anterior de O-6 e O-12 era freio ou roda; o contrato podia ter
   sido desenhado em volta do caso automotivo sem ninguém perceber. A fixture
   `prototipos/fps/v3/pecas/_jardineira.js` é jardinagem — caixa, terra, bulbo,
   caule, folhagem e botão de flor — e este teste afirma o MESMO contrato lá.

   COMO ELE FALA DE PORTA (mudou neste ciclo). Antes o núcleo não devolvia as
   portas, então provar que `sel:{porta}` resolve depois das transformações
   exigia que a PEÇA marcasse cada porta com um material próprio e o teste lesse
   `f.material` de volta: 15 leituras de material como procuração de porta.
   Agora o teste faz duas coisas diretas:

   - lê `neutro.portas` (A-20) para afirmar o que a peça DECLARA;
   - monta a peça com UM passo de sonda a mais — `['material', {sel:{porta}}]`
     no fim da lista — para afirmar o que a porta ALCANÇA. A citação é do teste,
     por `sel:{porta}`, depois de todas as transformações. Nenhuma afirmação
     depende mais de material escrito na peça.

   O que ele afirma é RELAÇÃO e IDENTIDADE, nunca coordenada solta:
   - toda face tem identidade, as seis partes existem e só elas;
   - cada gerador que ganhou `origem` na R4 publica a primitiva INTEIRA, e a
     contagem acompanha o TOPO em vez de uma lista congelada de ids;
   - cada porta alcança exatamente a região que o nome promete, depois de
     `rotaciona`/`transladar`: o colo do bulbo entrega o caule onde ele nasce, o
     botão apoia onde o caule termina, e o par pé/coroa mede o caule inteiro
     mesmo com a haste pendida;
   - os eixos escritos como `'ultima'` seguem a CONTAGEM: mudar `bulboAneis` ou
     `terraSeg` não muda qual região a porta alcança;
   - inserir um passo no começo da lista renumera TODA a malha e não muda nada
     do que a peça afirma. É a prova de que nada aqui é posicional.

   Régua headless da mesma peça: `npm run descrever -- _jardineira --estrito`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as jardineira from '../../prototipos/fps/v3/pecas/_jardineira.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — módulo novo em JavaScript, neutro (não importa Three.js).
import { portasPublicadas } from '../../src/autoria/descrever-partes.js';

const PARTES = ['botao', 'bulbo', 'caixa', 'caule', 'folhagem', 'terra'];

/* as cinco paredes/soleira usam `chamferBox`, cuja topologia é FIXA: 24
   vértices e 26 faces, sem parâmetro TOPO nenhum. */
const FACES_CHAMFERBOX = 26;
const CORPOS_DA_CAIXA = 5;

/* as oito portas da peça, com a origem que cada uma DECLARA — o mesmo texto que
   `npm run descrever` imprime. */
const PORTAS = {
  assentoDoBotao: 'cone:405 tampa=fundo',
  bordaDaFrenteDaSoleira: 'chamferBox:400 aresta=3',
  coloDoBulbo: 'esfera:401 faixa=ultima',
  coroaDoCaule: 'cilindro:404 tampa=topo',
  faixaDaFrenteDaTerra: 'plano:402 faixa=ultima',
  leitoDaTerra: 'plano:402',
  peDoCaule: 'cilindro:404 tampa=fundo',
  soleiraDaJardineira: 'chamferBox:400',
};

function montar(topo: any = jardineira.TOPO) {
  return nucleo(jardineira.PASSOS, jardineira.PARAMS, topo, jardineira.MATERIAIS, null, jardineira.ALIASES);
}

/* A SONDA: a peça é montada com um passo a mais no FIM da lista, citando a porta
   por `sel:{porta}` — depois de toda transformação. É o teste que cita, não a
   peça que marca; nenhum material da peça serve de procuração. */
const SONDA = 'sondaDePorta';
function sondar(porta: string, topo: any = jardineira.TOPO) {
  const materiais = { ...jardineira.MATERIAIS, [SONDA]: { cor: '#ff00ff' } };
  const neutro = nucleo(
    [...jardineira.PASSOS, ['material', { sel: { porta }, usa: SONDA }]],
    jardineira.PARAMS, topo, materiais, null, jardineira.ALIASES,
  );
  expect(neutro.orfaos, `sonda em ${porta}`).toEqual([]);
  const faces = [...neutro.F.values()].filter((f: any) => f.material === SONDA);
  expect(faces.length, `a porta '${porta}' não alcançou nenhuma face`).toBeGreaterThan(0);
  return { neutro, faces };
}

function facesDaParte(neutro: any, parte: string) {
  return [...neutro.F.values()].filter((f: any) => f.parte === parte);
}
function centro(neutro: any, face: any) {
  let x = 0, y = 0, z = 0;
  for (const v of face.vs) { const p = neutro.V.get(v); x += p[0]; y += p[1]; z += p[2]; }
  return [x / face.vs.length, y / face.vs.length, z / face.vs.length];
}
function pontos(neutro: any, faces: any[]) {
  return faces.flatMap((f: any) => f.vs).map((v: number) => neutro.V.get(v));
}
const eixoDe = (ps: number[][], k: number) => ({ min: Math.min(...ps.map((p) => p[k])), max: Math.max(...ps.map((p) => p[k])) });
/* o vértice que TODAS as faces de um leque compartilham — o polo da esfera. Se
   a porta tivesse resolvido para outra faixa, não haveria vértice comum. */
function verticeComum(faces_: any[]) {
  let comum = new Set<number>(faces_[0].vs);
  for (const f of faces_.slice(1)) comum = new Set([...comum].filter((v) => f.vs.includes(v)));
  return [...comum];
}
const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);
/* as medidas DERIVADAS da peça são expressões (`'= caixaAltura - terraRebaixo'`),
   resolvidas pelo núcleo — o teste não recalcula nenhuma: quando precisa do
   nível da terra, ele MEDE o leito. `P` só serve para as medidas independentes. */
const P = jardineira.PARAMS;
function nivelDaTerra(topo: any = jardineira.TOPO) {
  const leito = sondar('leitoDaTerra', topo);
  const alturas = new Set(pontos(leito.neutro, leito.faces).map((p: number[]) => p[1]));
  expect(alturas.size, 'o leito da terra é plano').toBe(1);
  return [...alturas][0] as number;
}

describe('_jardineira — identidade semântica fora do vocabulário automotivo', () => {
  it('não tem órfão e nenhuma face fica sem identidade', () => {
    const neutro = montar();
    expect(neutro.orfaos).toEqual([]);
    expect([...neutro.F.values()].filter((f: any) => !f.parte)).toEqual([]);
  });

  it('expõe as seis partes pelo nome, e só elas, também depois do adaptador', () => {
    const neutro = montar();
    const nomes = new Set<string>();
    for (const face of neutro.F.values()) nomes.add(face.parte);
    expect([...nomes].sort()).toEqual(PARTES);

    const convertido = adaptarThree(neutro, { nome: jardineira.meta.nome });
    expect(convertido.diagnosticos).toEqual({ facesSemParte: [], semanticaIntegra: true });
    for (const parte of PARTES) expect(convertido.partes.has(parte)).toBe(true);
  });

  it('nenhum passo endereça geometria por id posicional', () => {
    /* as seis formas de COLEÇÃO de id cru que o gate `npm run id-cru` conta.
       `de` é a de `mescla` — uma LISTA de ids; o `de:{op,id}` do
       `publicarPorta` é o oposto disso (origem estrutural declarada). */
    const proibidas = ['faces', 'vs', 'pontos'];
    for (const [op, args] of jardineira.PASSOS as any[]) {
      for (const chave of proibidas) expect(args?.[chave], `${op}.${chave}`).toBeUndefined();
      expect(Array.isArray(args?.de), `${op}.de como lista de ids`).toBe(false);
      expect(args?.sel?.f, `${op}.sel.f`).toBeUndefined();
      expect(args?.sel?.v, `${op}.sel.v`).toBeUndefined();
    }
  });
});

describe('_jardineira — A-20: as portas existem fora do núcleo', () => {
  it('o núcleo devolve as oito portas declaradas, em ordem de nome', () => {
    const neutro = montar();
    expect([...neutro.portas.keys()]).toEqual(Object.keys(PORTAS).sort());
    for (const [nome, porta] of neutro.portas) {
      expect(porta.nome).toBe(nome);
      // o passo apontado é MESMO o `publicarPorta` daquele nome
      const passo = (jardineira.PASSOS as any[])[porta.passo];
      expect(passo[0], nome).toBe('publicarPorta');
      expect(passo[1].nome, nome).toBe(nome);
      expect(porta.de, nome).toEqual(passo[1].de);
      expect(porta.de, `${nome}: 'de' precisa sair clonado`).not.toBe(passo[1].de);
    }
  });

  it('a régua headless lê a origem declarada de cada porta', () => {
    const lidas = portasPublicadas(montar());
    expect(Object.fromEntries(lidas.map((p: any) => [p.nome, p.origem]))).toEqual(PORTAS);
  });
});

describe('_jardineira — O-6: os geradores da R4 publicam a primitiva inteira', () => {
  /* Se `origem` cobrisse menos que a primitiva, a `parte` nomeada por ela
     cobriria menos e sobrariam faces sem identidade. Aqui a contagem é amarrada
     ao TOPO, não a uma lista de ids: é a topologia declarada do gerador. */
  const esperado = (topo: any) => ({
    caixa: (1 + 4) * FACES_CHAMFERBOX,          // chamferBox: soleira + 4 paredes
    terra: topo.terraSeg * topo.terraSeg,        // plano: grade seg × seg
    bulbo: topo.bulboAneis * topo.bulboLados,    // esfera: faixas × lados
    caule: topo.cauleLados + 2,                  // cilindro: laterais + 2 tampas
    botao: topo.botaoLados + 1,                  // cone: laterais + tampa da base
  });

  it('chamferBox, plano, esfera, cone e cilindro entregam todas as suas faces à parte', () => {
    const neutro = montar();
    const contas = esperado(jardineira.TOPO);
    for (const [parte, quantas] of Object.entries(contas)) {
      expect(facesDaParte(neutro, parte).length, parte).toBe(quantas);
    }
    // `inflate` não tem fórmula fechada (o volume sai de um scan de voxels), mas
    // a origem precisa cobrir tudo o que ele produziu.
    const folhagem = facesDaParte(neutro, 'folhagem').length;
    expect(folhagem).toBeGreaterThan(0);
    const total: number = Object.values(contas).reduce((a: number, b: number) => a + b, 0) + folhagem;
    expect(total).toBe(neutro.F.size);
  });

  it('a caixa é cinco chamferBox distintos sob uma identidade só', () => {
    const neutro = montar();
    const daCaixa = facesDaParte(neutro, 'caixa');
    expect(daCaixa.length).toBe(CORPOS_DA_CAIXA * FACES_CHAMFERBOX);
    // cada chamferBox nasce num BLOCO de ids próprio: cinco blocos distintos
    const blocos = new Set(daCaixa.map((f: any) => Math.floor(f.id / 1000)));
    expect(blocos.size).toBe(CORPOS_DA_CAIXA);
  });

  it('mudar o TOPO muda a contagem pela fórmula do gerador, sem perder identidade', () => {
    const outro = { ...jardineira.TOPO, terraSeg: 6, bulboAneis: 5, bulboLados: 16, cauleLados: 14, botaoLados: 9 };
    const neutro = montar(outro);
    expect(neutro.orfaos).toEqual([]);
    expect([...neutro.F.values()].filter((f: any) => !f.parte)).toEqual([]);
    const contas = esperado(outro);
    for (const [parte, quantas] of Object.entries(contas)) {
      expect(facesDaParte(neutro, parte).length, parte).toBe(quantas);
    }
  });
});

describe('_jardineira — O-12 e A-18: cada porta alcança o que o nome promete', () => {
  it('a soleira inteira é a primitiva toda; a borda da frente é UMA aresta do chanfro', () => {
    const inteira = sondar('soleiraDaJardineira');
    expect(inteira.faces.length).toBe(FACES_CHAMFERBOX);
    expect(new Set(inteira.faces.map((f: any) => f.parte))).toEqual(new Set(['caixa']));

    const borda = sondar('bordaDaFrenteDaSoleira');
    expect(borda.faces.length).toBe(1);
    expect(borda.faces[0].vs.length).toBe(4);            // retângulo de aresta, não triângulo de canto
    expect(borda.faces[0].parte).toBe('caixa');
    // é subconjunto da soleira, e é a aresta COMPRIDA: corre a largura inteira,
    // menos um chanfro em cada ponta
    expect(inteira.faces.map((f: any) => f.id)).toContain(borda.faces[0].id);
    const ps = pontos(borda.neutro, borda.faces);
    const x = eixoDe(ps, 0), y = eixoDe(ps, 1), z = eixoDe(ps, 2);
    perto(x.max - x.min, P.caixaLargura - 2 * P.caixaChanfro);
    // entre `topo` e `frente`: encosta no alto da soleira e na face da frente
    perto(y.max, P.paredeEspessura);
    perto(y.min, P.paredeEspessura - P.caixaChanfro);
    perto(z.max, P.caixaProfundidade / 2);
    perto(z.min, P.caixaProfundidade / 2 - P.caixaChanfro);
  });

  it('o leito é a grade toda; a faixa da frente é a última LINHA em z dela', () => {
    const T = jardineira.TOPO;
    const leito = sondar('leitoDaTerra');
    expect(leito.faces.length).toBe(T.terraSeg * T.terraSeg);
    expect(new Set(leito.faces.map((f: any) => f.parte))).toEqual(new Set(['terra']));

    const faixa = sondar('faixaDaFrenteDaTerra');
    expect(faixa.faces.length).toBe(T.terraSeg);
    // exatamente as células do leito com o maior z: uma linha, a da frente
    const zDe = (n: any, f: any) => centro(n, f)[2];
    const maiorZ = Math.max(...leito.faces.map((f: any) => zDe(leito.neutro, f)));
    const daFrente = leito.faces.filter((f: any) => Math.abs(zDe(leito.neutro, f) - maiorZ) < 1e-9);
    expect(faixa.faces.map((f: any) => f.id).sort()).toEqual(daFrente.map((f: any) => f.id).sort());
    // e ela cobre a largura inteira da terra, como uma linha deve cobrir
    const x = eixoDe(pontos(faixa.neutro, faixa.faces), 0);
    const xDaTerra = eixoDe(pontos(faixa.neutro, facesDaParte(faixa.neutro, 'terra')), 0);
    perto(x.max - x.min, xDaTerra.max - xDaTerra.min);
  });

  it('o assento do botão é a tampa da base do cone, e ele apoia na coroa do caule', () => {
    const T = jardineira.TOPO;
    const assento = sondar('assentoDoBotao');
    expect(assento.faces.length).toBe(1);
    expect(assento.faces[0].vs.length).toBe(T.botaoLados);
    expect(assento.faces[0].parte).toBe('botao');
    /* a coroa é do CAULE e o assento é do BOTÃO; as duas portas foram publicadas
       antes de a haste pender, e depois da inclinação continuam no mesmo ponto. */
    const coroa = sondar('coroaDoCaule');
    const a = centro(assento.neutro, assento.faces[0]);
    const c = centro(coroa.neutro, coroa.faces[0]);
    perto(a[0], c[0]); perto(a[1], c[1]); perto(a[2], c[2]);
  });

  it('pé e coroa são as duas tampas do cilindro, uma face cada', () => {
    const T = jardineira.TOPO;
    for (const nome of ['peDoCaule', 'coroaDoCaule']) {
      const { faces } = sondar(nome);
      expect(faces.length, nome).toBe(1);
      expect(faces[0].vs.length, nome).toBe(T.cauleLados);
      expect(faces[0].parte, nome).toBe('caule');
    }
  });

  it('o colo do bulbo é o leque de um polo da esfera', () => {
    const T = jardineira.TOPO;
    const { faces } = sondar('coloDoBulbo');
    expect(faces.length).toBe(T.bulboLados);
    for (const f of faces) expect(f.vs.length).toBe(3);
    expect(verticeComum(faces)).toHaveLength(1);
  });
});

describe('_jardineira — O-12: a porta sobrevive à transformação', () => {
  it('o colo do bulbo entrega o caule exatamente onde o caule nasce', () => {
    /* As duas portas foram publicadas ANTES de os corpos irem para o lugar e
       ANTES de a haste pender. Se `sel:{porta}` reresolvesse por posição em vez
       de pela origem local, esta coincidência não sobreviveria. */
    const colo = sondar('coloDoBulbo');
    const pe = sondar('peDoCaule');
    const polo = colo.neutro.V.get(verticeComum(colo.faces)[0]);
    const centroDoPe = centro(pe.neutro, pe.faces[0]);
    perto(polo[0], centroDoPe[0]);
    perto(polo[1], centroDoPe[1]);
    perto(polo[2], centroDoPe[2]);
  });

  it('o colo é o ponto mais alto do bulbo, que fica enterrado', () => {
    const colo = sondar('coloDoBulbo');
    const polo = colo.neutro.V.get(verticeComum(colo.faces)[0]);
    const alturas = pontos(colo.neutro, facesDaParte(colo.neutro, 'bulbo')).map((p: number[]) => p[1]);
    perto(polo[1], Math.max(...alturas));
    expect(polo[1]).toBeGreaterThan(Math.min(...alturas));
    // enterrado: o colo está no nível da terra e o resto do corpo, abaixo dele
    perto(polo[1], nivelDaTerra());
  });

  it('o pé do caule fica plantado no leito da terra', () => {
    const pe = sondar('peDoCaule');
    const leito = sondar('leitoDaTerra');
    const alturasDoLeito = new Set(pontos(leito.neutro, leito.faces).map((p: number[]) => p[1]));
    expect(alturasDoLeito.size).toBe(1);   // o leito é plano
    perto(centro(pe.neutro, pe.faces[0])[1], [...alturasDoLeito][0] as number);
  });

  it('pé e coroa medem o caule inteiro mesmo com a haste pendida', () => {
    const daPorta = (nome: string) => { const s = sondar(nome); return centro(s.neutro, s.faces[0]); };
    const pe = daPorta('peDoCaule');
    const coroa = daPorta('coroaDoCaule');
    // a distância entre as duas portas É o comprimento declarado do caule
    perto(Math.hypot(coroa[0] - pe[0], coroa[1] - pe[1], coroa[2] - pe[2]), P.cauleComprimento);
    // e a muda pende para +X, sem sair do plano do giro (eixo z)
    expect(coroa[0]).toBeGreaterThan(pe[0]);
    expect(coroa[1]).toBeGreaterThan(pe[1]);
    perto(coroa[2], pe[2]);
    // pendida de verdade: a coroa não está na vertical do pé
    expect(coroa[1] - pe[1]).toBeLessThan(P.cauleComprimento);
  });
});

describe('_jardineira — A-19: o eixo acompanha a contagem', () => {
  /* O `coloDoBulbo` é "a última faixa da esfera" e a `faixaDaFrenteDaTerra` é "a
     última linha da grade". Enquanto o eixo só aceitava inteiro literal, a peça
     era remodelada para a porta cair na faixa 0 — a ferramenta escolhendo a
     forma da peça. Agora a intenção está escrita, e um TOPO diferente prova que
     ela é intenção, não coincidência. */
  const outro = { ...jardineira.TOPO, terraSeg: 6, bulboAneis: 5, bulboLados: 16, cauleLados: 14, botaoLados: 9 };

  it('a peça declara as duas extremidades por palavra, não por índice', () => {
    const portas = montar().portas;
    expect(portas.get('coloDoBulbo').de).toEqual({ op: 'esfera', id: 401, faixa: 'ultima' });
    expect(portas.get('faixaDaFrenteDaTerra').de).toEqual({ op: 'plano', id: 402, faixa: 'ultima' });
  });

  it('com outro TOPO, o colo continua sendo o polo de cima do bulbo', () => {
    const { neutro, faces } = sondar('coloDoBulbo', outro);
    expect(faces.length).toBe(outro.bulboLados);           // acompanha `lados`
    const polo = neutro.V.get(verticeComum(faces)[0]);
    const alturas = pontos(neutro, facesDaParte(neutro, 'bulbo')).map((p: number[]) => p[1]);
    perto(polo[1], Math.max(...alturas));
    perto(polo[1], nivelDaTerra(outro));
  });

  it('com outro TOPO, a faixa da terra continua sendo a linha da frente', () => {
    const { neutro, faces } = sondar('faixaDaFrenteDaTerra', outro);
    expect(faces.length).toBe(outro.terraSeg);             // acompanha `seg`
    const zDaFaixa = eixoDe(pontos(neutro, faces), 2);
    const zDaTerra = eixoDe(pontos(neutro, facesDaParte(neutro, 'terra')), 2);
    perto(zDaFaixa.max, zDaTerra.max);                     // encostada na frente
    perto(zDaFaixa.max - zDaFaixa.min, (zDaTerra.max - zDaTerra.min) / outro.terraSeg);
  });

  it('a porta do botão não depende de contagem: a base é sempre uma face só', () => {
    const { faces } = sondar('assentoDoBotao', outro);
    expect(faces.length).toBe(1);
    expect(faces[0].vs.length).toBe(outro.botaoLados);
  });
});

describe('_jardineira — nada aqui é posicional', () => {
  it('inserir um passo no começo renumera a malha e não muda o que a peça afirma', () => {
    /* Um `transladar` de zero sobre a peça ainda vazia é no-op de verdade, mas
       empurra a BASE de todo passo seguinte em um bloco de ids: cada vértice e
       cada face trocam de número. Se alguma referência fosse posicional, a peça
       mudaria de forma, de identidade ou de material. */
    const semDeslocar = montar();
    const deslocado = nucleo(
      [['transladar', { d: [0, 0, 0], sel: { tudo: true } }], ...jardineira.PASSOS],
      jardineira.PARAMS, jardineira.TOPO, jardineira.MATERIAIS, null, jardineira.ALIASES,
    );

    expect(deslocado.orfaos).toEqual([]);
    expect(deslocado.F.size).toBe(semDeslocar.F.size);
    expect(deslocado.V.size).toBe(semDeslocar.V.size);
    // os ids REALMENTE mudaram — senão o teste não estaria provando nada
    expect([...deslocado.F.keys()].sort((a: number, b: number) => a - b))
      .not.toEqual([...semDeslocar.F.keys()].sort((a: number, b: number) => a - b));
    // e as portas continuam apontando para as mesmas origens, um passo adiante
    for (const [nome, porta] of semDeslocar.portas) {
      expect(deslocado.portas.get(nome).de, nome).toEqual(porta.de);
      expect(deslocado.portas.get(nome).passo, nome).toBe(porta.passo + 1);
    }

    const fixo = (n: number) => (n.toFixed(9) === '-0.000000000' ? '0.000000000' : n.toFixed(9));
    const impressao = (neutro: any) => [...neutro.F.values()]
      .map((f: any) => {
        const c = centro(neutro, f);
        return [f.parte, f.material ?? '-', f.liso ? 'liso' : '-', f.solido ? 'solido' : '-', f.vs.length, ...c.map(fixo)].join('|');
      })
      .sort();
    expect(impressao(deslocado)).toEqual(impressao(semDeslocar));
  });
});
