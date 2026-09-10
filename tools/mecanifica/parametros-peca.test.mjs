/* Prova de R00: liberdade declarada não é liberdade real, e a diferença é
   conferível. O número do acervo fica travado aqui de propósito — se alguém
   ligar uma receita aos seus parâmetros, ou desligar, o teste avisa. */
import { describe, expect, it } from 'vitest';
import {
  caminhosNumericos,
  comCaminho,
  diagnosticarParametros,
  formatarDiagnostico,
  lerCaminho,
  receitaComParametros,
} from '../../src/autoria/parametros-vivos.js';
import { parametrosReutilizavel } from './parametros-peca.mjs';

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

describe('acervo real', () => {
  it('mede a cadeira: 21 declarados, 13 vivos, e a saída cabe numa tela', async () => {
    const r = await parametrosReutilizavel({ alvo: 'cadeira-de-madeira' });
    expect(r.ok).toBe(true);
    expect(r.resultado.registro.totais).toEqual({ declarados: 21, vivos: 13, inertes: 8 });
    expect(r.resultado.registro.determinismo.estavel).toBe(true);
    expect(r.resultado.registro.parametros.find((p) => p.caminho === 'perna.secaoTopo').estado)
      .toBe('vivo');
    expect(Buffer.byteLength(r.stdout)).toBeLessThan(2_000);
  }, 30_000);

  it('trava o retrato do acervo: 96 declarados e 32 vivos', async () => {
    /* Este número é a razão de existir do plano. Se ele mudar sem alguém ter
       ligado uma receita aos seus parâmetros de propósito, algo regrediu.
       Caiu de 267/114 para 90/26 quando o acervo publicado passou a ser só o
       quadro da bicicleta: cadeira, chapa e as três prensas saíram de
       `prototipos/procedural/v3/` e viraram fixture de ferramenta em
       `tools/fixtures/acervo/`, e as armas, a barricada, as duas outras
       bicicletas e o resto foram apagados. A varredura continua alcançando as
       fixtures porque ela lê `PASTAS_BUSCA`, então o retrato mede tudo que
       ainda é receita executável no repositório. A queda não é regressão de
       autoria: nenhuma receita perdeu parâmetro vivo, o conjunto é que
       encolheu.

       Subiu de 90/26 para 96/32 quando a leitura passou a descer em coordenada:
       lista de NÚMEROS é ponto medido e cada casa é liberdade, lista de LISTAS
       é curva e continua fora. Os seis números novos são os três pontos de
       solda da bicicleta, e os seis são VIVOS — nenhum ruído entrou. */
    const r = await parametrosReutilizavel({ acervo: true });
    expect(r.ok).toBe(true);
    expect(r.resultado.totais).toEqual({ declarados: 96, vivos: 32, inertes: 64 });

    const porAlvo = Object.fromEntries(r.resultado.registros.map((x) => [x.alvo, x.totais]));
    expect(porAlvo['cadeira-de-madeira']).toEqual({ declarados: 21, vivos: 13, inertes: 8 });
    expect(porAlvo['prensa-mecanica-industrial']).toEqual({ declarados: 14, vivos: 0, inertes: 14 });
    expect(porAlvo['prensa-progressiva']).toEqual({ declarados: 15, vivos: 0, inertes: 15 });
    /* O quadro é a única receita do acervo publicado, e dezenove dos seus vinte
       e nove declarados movem geometria.

       A explicação anterior aqui estava ERRADA, e a leitura por coordenada a
       desmentiu: dizia que os pontos de solda eram inertes porque coordenada
       lida da referência não seria parâmetro. Eles nunca foram inertes — eles
       eram INVISÍVEIS, porque a busca não descia em lista. Assim que passou a
       descer, os seis números dos três pontos apareceram e os seis são vivos.

       Os dez inertes de verdade são outra coisa: `garfoEixoACoroa`,
       `garfoAvanco`, `meiaLarguraGuidao` e companhia estão declarados neste
       módulo para os módulos do garfo e do guidão, que ainda não existem. */
    expect(porAlvo['bicicleta-quadro']).toEqual({ declarados: 29, vivos: 19, inertes: 10 });

    expect(r.resultado.registros.every((x) => x.carregou)).toBe(true);
    expect(r.resultado.registros.every((x) => x.determinismo.estavel)).toBe(true);
  }, 90_000);

  it('recusa uso ambíguo em vez de escolher por conta própria', async () => {
    expect((await parametrosReutilizavel({})).codigo).toBe(2);
    expect((await parametrosReutilizavel({ alvo: 'cadeira-de-madeira', acervo: true })).codigo).toBe(2);
    const inexistente = await parametrosReutilizavel({ alvo: 'peca-que-nao-existe' });
    expect(inexistente.codigo).toBe(1);
    expect(inexistente.stderr).toContain('não encontrada');
  }, 20_000);
});
