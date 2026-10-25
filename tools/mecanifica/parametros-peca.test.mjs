/* Prova de R00: liberdade declarada não é liberdade real, e a diferença é
   conferível. O total do acervo é conferido contra a soma dos alvos que o
   acervo lista, medidos um a um, e não contra um número fixo: peça nova no
   acervo mudava o total e quebrava o teste sem que nenhuma ligação tivesse
   mudado.

   O alvo nomeado do describe "acervo real" já não é `cadeira-de-madeira`: essa
   peça (e chapa-de-fixacao, e as três prensas) era acervo publicado que o
   commit `33fde6a6` moveu para `tools/fixtures/acervo/` em vez de apagar, e de
   lá passou a aparecer na bancada como se fosse acervo. Este teste mede
   ENCANAMENTO — se `diagnosticarParametros` acha vivo o que deriva PASSOS e
   inerte o que fica ao lado — e não a forma de nenhuma peça, então o alvo
   nomeado é a menor receita paramétrica escrita aqui mesmo, e o retrato do
   acervo inteiro é medido de novo depois da remoção, não copiado do que a
   suíte dizia antes dela. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  assinaturaMedida,
  caminhosNumericos,
  comCaminho,
  diagnosticarParametros,
  formaDasPartes,
  formatarDiagnostico,
  lerCaminho,
  receitaComParametros,
} from '../../src/autoria/parametros-vivos.js';
import { descreverPeca } from '../../src/autoria/descrever-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import carenagem, { TABELA as TABELA_DA_CARENAGEM } from '../../procedural/pecas/carenagem-de-prova/receita.js';
import { montarAcervoReduzido } from './acervo-reduzido.mjs';
import { alvosDoAcervo, parametrosReutilizavel } from './parametros-peca.mjs';
import { REPO } from './resolver-caminho-receita.mjs';

/* Receita mínima paramétrica: os passos DERIVAM dos parâmetros. */
function receitaViva() {
  return {
    PARAMS: { corpo: { larg: 0.2, alt: 0.1 }, folgas: [0.01, 0.02], nome: 'x' },
    MATERIAIS: { aco: { cor: '#888888' } },
    get PASSOS() {
      const { larg, alt } = this.PARAMS.corpo;
      return [
        ['cubo', { origemId: 1, larg, alt, prof: 0.1, em: [0, alt / 2, 0] }],
        ['parte', { nome: 'corpo', sel: { tudo: true } }],
        ['material', { usa: 'aco', sel: { grupo: 'corpo' } }],
      ];
    },
  };
}

/* Mesma peça, passos com números literais: PARAMS não está ligado a nada. */
function receitaDecorativa() {
  return {
    PARAMS: { corpo: { larg: 0.2, alt: 0.1 } },
    MATERIAIS: { aco: { cor: '#888888' } },
    PASSOS: [
      ['cubo', { origemId: 1, larg: 0.2, alt: 0.1, prof: 0.1, em: [0, 0.05, 0] }],
      ['parte', { nome: 'corpo', sel: { tudo: true } }],
      ['material', { usa: 'aco', sel: { grupo: 'corpo' } }],
    ],
  };
}

/* Executa, mas não publica identidade semântica: não há o que medir. */
function receitaSemParte() {
  return {
    PARAMS: { corpo: { larg: 0.2, alt: 0.1 } },
    MATERIAIS: { aco: { cor: '#888888' } },
    get PASSOS() {
      const { larg, alt } = this.PARAMS.corpo;
      return [['cubo', { origemId: 1, larg, alt, prof: 0.1, em: [0, alt / 2, 0] }]];
    },
  };
}

describe('caminhos de parâmetro', () => {
  it('encontra número aninhado e coordenada, ignora curva, texto e objeto vazio', () => {
    const params = {
      a: 1,
      b: { c: 2, d: 'texto' },
      e: [3, 4],
      curva: [[0, 1], [1, 2]],
      f: {},
    };
    /* Lista de NÚMEROS é coordenada, e cada casa é liberdade: o ponto de solda
       medido da bicicleta mora assim. Lista de LISTAS é curva, e sondar as suas
       dezenas de números um a um produz ruído em vez de resposta. */
    expect(caminhosNumericos(params).map((c) => c.join('.'))).toEqual(['a', 'b.c', 'e.0', 'e.1']);
  });

  it('troca uma casa de coordenada sem transformar o array em objeto', () => {
    const params = { ponto: [-134, 716] };
    const novo = comCaminho(params, ['ponto', '1'], 700);
    expect(Array.isArray(novo.ponto)).toBe(true);
    expect(novo.ponto).toEqual([-134, 700]);
    expect(params.ponto).toEqual([-134, 716]);
  });

  it('troca um caminho sem tocar no original', () => {
    const params = { corpo: { larg: 0.2, alt: 0.1 } };
    const novo = comCaminho(params, ['corpo', 'larg'], 0.5);
    expect(lerCaminho(novo, ['corpo', 'larg'])).toBe(0.5);
    expect(lerCaminho(novo, ['corpo', 'alt'])).toBe(0.1);
    expect(params.corpo.larg).toBe(0.2);
  });
});

describe('cópia de receita', () => {
  it('preserva o acessor, e o espalhamento não — que é o defeito que ele evita', () => {
    const receita = receitaViva();
    const outros = { corpo: { larg: 0.9, alt: 0.1 }, folgas: [], nome: 'x' };

    const copia = receitaComParametros(receita, outros);
    expect(copia.PASSOS[0][1].larg).toBe(0.9);

    /* `{ ...receita }` AVALIA o getter uma vez e congela o resultado: a cópia
       ficaria com os passos do PARAMS antigo, e toda receita paramétrica seria
       diagnosticada como inerte. O contrário da verdade, em silêncio. */
    const espalhada = { ...receita, PARAMS: outros };
    expect(espalhada.PASSOS[0][1].larg).toBe(0.2);
  });

  it('não altera a receita original', () => {
    const receita = receitaViva();
    receitaComParametros(receita, { corpo: { larg: 9, alt: 9 } });
    expect(receita.PARAMS.corpo.larg).toBe(0.2);
    expect(receita.PASSOS[0][1].larg).toBe(0.2);
  });
});

describe('diagnóstico de parâmetro vivo', () => {
  it('acha vivo o que deriva os passos, e inerte o que fica ao lado deles', () => {
    const viva = diagnosticarParametros(receitaViva());
    /* Quatro declarados: as duas medidas do corpo e as duas casas de `folgas`,
       que a peça não usa — coordenada declarada e não usada é inerte, e a
       contagem precisa dizer isso. */
    expect(viva.totais).toEqual({ declarados: 4, vivos: 2, inertes: 2 });
    expect(viva.determinismo.estavel).toBe(true);

    const decorativa = diagnosticarParametros(receitaDecorativa());
    expect(decorativa.totais).toEqual({ declarados: 2, vivos: 0, inertes: 2 });
    expect(decorativa.parametros.map((p) => p.caminho)).toEqual(['corpo.larg', 'corpo.alt']);
  });

  it('sem sondas, confere carga e determinismo e só conta os declarados', () => {
    let medidas = 0;
    const d = diagnosticarParametros(receitaViva(), { sondar: false, medir: (r) => { medidas += 1; const { neutro } = executarReceita(r); return { descricao: descreverPeca(neutro), forma: formaDasPartes(neutro) }; } });
    expect(medidas).toBe(2);
    expect(d).toMatchObject({ carregou: true, parametros: [], determinismo: { estavel: true }, totais: { declarados: 4, vivos: null, inertes: null } });
  });

  it('conta como vivo o parâmetro que o motor RECUSA, não como inerte', () => {
    /* Recusa prova ligação: o valor chegou ao motor e foi julgado. Chamar isso
       de inerte mandaria a IA procurar o efeito em outro lugar. */
    const receita = {
      PARAMS: { larg: 0.2 },
      MATERIAIS: { aco: { cor: '#888888' } },
      get PASSOS() {
        if (this.PARAMS.larg > 0.21) throw new Error('largura fora do limite do gabarito');
        return [
          ['cubo', { origemId: 1, larg: this.PARAMS.larg, alt: 0.1, prof: 0.1, em: [0, 0.05, 0] }],
          ['parte', { nome: 'corpo', sel: { tudo: true } }],
          ['material', { usa: 'aco', sel: { grupo: 'corpo' } }],
        ];
      },
    };
    const d = diagnosticarParametros(receita);
    expect(d.totais.vivos).toBe(1);
    expect(d.parametros[0]).toMatchObject({ efeito: 'recusa' });
    expect(d.parametros[0].mensagem).toContain('gabarito');
  });

  it('não chama de inerte o parâmetro que ninguém conseguiu sondar', () => {
    /* Sem parte medida, toda sonda compara vazio com vazio. Relatar "2 inertes"
       aqui seria uma afirmação que a medição não sustenta, e mandaria quem lê
       procurar o defeito nos parâmetros em vez de nos passos. */
    const d = diagnosticarParametros(receitaSemParte());
    expect(d.carregou).toBe(true);
    expect(d.indiagnosticavel).toContain('parte medível');
    expect(d.totais).toEqual({ declarados: 2, vivos: 0, inertes: 0 });
    expect(formatarDiagnostico(d, { alvo: 'teste' })).toContain('nenhum diagnosticado');
  });

  it('diz em voz alta quando não há o que varrer', () => {
    const texto = formatarDiagnostico(diagnosticarParametros(receitaDecorativa()), { alvo: 'teste' });
    expect(texto).toContain('NÃO HÁ O QUE VARRER');
    expect(texto).toContain('PASSOS');
  });
});

/* A carenagem de prova só com dois parâmetros declarados, a nitidez do ombro e a espessura, e o resto da TABELA fixo:
   o diagnóstico da receita inteira sonda 27 parâmetros a cerca de 2 s por execução. */
function carenagemSo(campos) {
  const topo = Object.getOwnPropertyDescriptor(carenagem, 'TOPO').get;
  const passos = Object.getOwnPropertyDescriptor(carenagem, 'PASSOS').get;
  return {
    meta: carenagem.meta,
    MATERIAIS: carenagem.MATERIAIS,
    PARAMS: Object.fromEntries(campos.map((campo) => [campo, TABELA_DA_CARENAGEM[campo]])),
    get TOPO() { return topo.call({ PARAMS: { ...TABELA_DA_CARENAGEM, ...this.PARAMS } }); },
    get PASSOS() { return passos.call({ PARAMS: { ...TABELA_DA_CARENAGEM, ...this.PARAMS } }); },
  };
}

describe('forma por dentro da caixa', () => {
  /* A assinatura comparava só a caixa e a contagem de faces de cada parte, e dava como inertes sete parâmetros da
     carenagem que mudam a malha, entre eles a nitidez do ombro e a espessura. Com a área, o volume e as posições
     arredondadas na assinatura, os dois saem vivos. Desde que a carenagem mede todos os pontos da gaiola, a nitidez
     também move a caixa por frações de mícron, e a espessura continua invisível para a caixa e a contagem. */
  it('vê a nitidez do ombro e a espessura da carenagem, que a caixa e a contagem de faces não veem', () => {
    const receita = carenagemSo(['ombro_nitidez', 'espessura']);
    const d = diagnosticarParametros(receita);
    expect(d.determinismo.estavel).toBe(true);
    expect(d.parametros.map((p) => [p.caminho, p.estado, p.efeito])).toEqual([
      ['ombro_nitidez', 'vivo', 'geometria'],
      ['espessura', 'vivo', 'geometria'],
    ]);
    const medir = (params) => executarReceita(receitaComParametros(receita, params)).neutro;
    const base = medir(receita.PARAMS);
    const formaBase = formaDasPartes(base);
    for (const campo of ['ombro_nitidez', 'espessura']) {
      const sondada = medir({ ...receita.PARAMS, [campo]: receita.PARAMS[campo] * 1.1 + 1e-6 });
      if (campo === 'espessura') expect(assinaturaMedida(descreverPeca(sondada))).toBe(assinaturaMedida(descreverPeca(base)));
      const forma = formaDasPartes(sondada);
      expect(forma[0].posicoes, campo).not.toBe(formaBase[0].posicoes);
      if (campo === 'espessura') expect(Number(forma[0].volume) / Number(formaBase[0].volume)).toBeCloseTo(1.1, 2);
    }
  }, 120_000);

  it('não muda com o id dos vértices nem com a ordem das faces, só com a posição', () => {
    const quadrado = (ids, faces) => ({
      V: new Map(ids.map((id, k) => [id, [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]][k]])),
      F: new Map(faces.map((vs, k) => [k + 1, { id: k + 1, vs, parte: 'placa' }])),
    });
    const a = formaDasPartes(quadrado([1, 2, 3, 4], [[1, 2, 3], [1, 3, 4]]));
    const b = formaDasPartes(quadrado([9, 8, 7, 6], [[9, 7, 6], [9, 8, 7]]));
    expect(b).toEqual(a);
    expect(a).toEqual([{ nome: 'placa', area: '1.000000', volume: '0.000000000', posicoes: a[0].posicoes }]);
    const deslocado = quadrado([1, 2, 3, 4], [[1, 2, 3], [1, 3, 4]]);
    deslocado.V.set(3, [1, 1, 2e-6]);
    expect(formaDasPartes(deslocado)[0].posicoes).not.toBe(a[0].posicoes);
  });
});

/* Entrada mínima, visível na mesma tela das asserções que a usam: dois
   parâmetros vivos (`corpo.larg`, `corpo.alt`, usados em PASSOS) e três
   inertes (`decorativo`, e as duas casas de `coord`, declarados mas nunca
   lidos). Precisa existir como arquivo de verdade porque `parametrosReutilizavel`
   resolve o alvo por caminho, então fica sob `tmp/`, escrita e apagada só por
   esta suíte. */
function fonteReceitaMinima() {
  return `
export const receita = {
  meta: { nome: 'Fixture Parâmetros Mínima', versao: '1.0.0' },
  PARAMS: { corpo: { larg: 0.2, alt: 0.1 }, decorativo: 0.05, coord: [1, 2] },
  MATERIAIS: { aco: { cor: '#888888' } },
  get PASSOS() {
    const { larg, alt } = this.PARAMS.corpo;
    return [
      ['cubo', { origemId: 1, larg, alt, prof: 0.1, em: [0, 0, 0] }],
      ['parte', { nome: 'corpo', sel: { tudo: true } }],
      ['material', { usa: 'aco', sel: { grupo: 'corpo' } }],
    ];
  },
};
export default receita;
`;
}

mkdirSync(resolve(REPO, 'tmp'), { recursive: true });
const AREA_MINIMA = mkdtempSync(resolve(REPO, 'tmp', 'teste-parametros-peca-'));
const CAMINHO_MINIMA = resolve(AREA_MINIMA, 'minima.js');
writeFileSync(CAMINHO_MINIMA, fonteReceitaMinima(), 'utf8');
const MINIMA = CAMINHO_MINIMA.slice(REPO.length + 1).replace(/\\/g, '/');

/* Acervo reduzido (3 peças pequenas): o custo do teste de conta não depende de
   quantas peças o acervo real tem. O real inteiro é conferido por `acervo-real.test.mjs`. */
const REDUZIDO = montarAcervoReduzido();

describe('acervo', () => {
  afterAll(() => {
    rmSync(AREA_MINIMA, { recursive: true, force: true });
    rmSync(REDUZIDO.absoluta, { recursive: true, force: true });
  });

  it('mede a fixture mínima: 5 declarados, 2 vivos, e a saída cabe numa tela', async () => {
    const r = await parametrosReutilizavel({ alvo: MINIMA });
    expect(r.ok).toBe(true);
    expect(r.resultado.registro.totais).toEqual({ declarados: 5, vivos: 2, inertes: 3 });
    expect(r.resultado.registro.determinismo.estavel).toBe(true);
    expect(r.resultado.registro.parametros.find((p) => p.caminho === 'corpo.larg').estado)
      .toBe('vivo');
    expect(Buffer.byteLength(r.stdout)).toBeLessThan(2_000);
  }, 30_000);

  it('conta o acervo a partir dos alvos que ele lista, medidos um a um', async () => {
    /* O total sai da soma dos alvos que `alvosDoAcervo` lista, cada um medido
       sozinho, e não de um número escrito aqui: o acervo cresce e encolhe com as
       peças, e o que o teste prova é que a varredura inteira e a medida de cada
       alvo dão a mesma conta, sem alvo ausente nem a mais. */
    const raiz = REDUZIDO.raiz;
    const alvos = alvosDoAcervo({ raiz }).map((a) => a.nome);
    expect(alvos).toEqual(['curta', 'minima', 'peca-de-prova']);
    const individuais = [];
    for (const alvo of alvos) {
      const um = await parametrosReutilizavel({ alvo, raiz });
      expect(um.ok, alvo).toBe(true);
      individuais.push([alvo, um.resultado.registro.totais]);
    }
    const soma = (campo) => individuais.reduce((total, [, t]) => total + t[campo], 0);

    const r = await parametrosReutilizavel({ acervo: true, raiz });
    expect(r.ok).toBe(true);
    expect(r.resultado.registros.map((x) => x.alvo)).toEqual(alvos);
    expect(r.resultado.totais).toEqual({ declarados: soma('declarados'), vivos: soma('vivos'), inertes: soma('inertes') });
    expect(r.resultado.totais.declarados).toBeGreaterThan(0);

    const porAlvo = Object.fromEntries(r.resultado.registros.map((x) => [x.alvo, x.totais]));
    expect(Object.fromEntries(individuais)).toEqual(porAlvo);
    /* A PEÇA DE PROVA É O ALVO NOMEADO, e não conteúdo do acervo: os sete
       números dela existem para atender requisito de guarda, e cada um move
       geometria, então os sete são vivos e nenhum é inerte. */
    expect(porAlvo['peca-de-prova']).toEqual({ declarados: 7, vivos: 7, inertes: 0 });

    expect(r.resultado.registros.every((x) => x.carregou)).toBe(true);
    expect(r.resultado.registros.every((x) => x.determinismo.estavel)).toBe(true);
  }, 60_000);

  it('recusa uma raiz de acervo fora do repositório', async () => {
    const r = await parametrosReutilizavel({ acervo: true, raiz: '../fora' });
    expect(r.codigo).toBe(2);
    expect(r.stderr).toContain('fora do repositório');
  });

  it('recusa uso ambíguo em vez de escolher por conta própria', async () => {
    expect((await parametrosReutilizavel({})).codigo).toBe(2);
    expect((await parametrosReutilizavel({ alvo: MINIMA, acervo: true })).codigo).toBe(2);
    const inexistente = await parametrosReutilizavel({ alvo: 'peca-que-nao-existe' });
    expect(inexistente.codigo).toBe(1);
    expect(inexistente.stderr).toContain('não encontrada');
  }, 20_000);
});
