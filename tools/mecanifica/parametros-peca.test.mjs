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
  it('encontra número aninhado, ignora array, texto e objeto vazio', () => {
    const params = { a: 1, b: { c: 2, d: 'texto' }, e: [3, 4], f: {} };
    expect(caminhosNumericos(params).map((c) => c.join('.'))).toEqual(['a', 'b.c']);
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
    expect(viva.totais).toEqual({ declarados: 2, vivos: 2, inertes: 0 });
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

  it('trava o retrato do acervo: 267 declarados e 114 vivos', async () => {
    /* Este número é a razão de existir do plano. Se ele mudar sem alguém ter
       ligado uma receita aos seus parâmetros de propósito, algo regrediu.
       Mudou de 189/47 para 234/91 quando `bicicleta-prova` entrou: ela é a peça
       do gate de fechamento do plano "o que nenhuma vista mostra", modelada por
       um agente frio a partir das skills, e trouxe 45 declarados com 44 vivos.
       É a mudança que o comentário acima autoriza — receita ligada aos próprios
       parâmetros de propósito — e não regressão. Subiu de 234/91 para 244/101
       quando `cavalete-de-serra` entrou: dez declarados, dez vivos, porque a
       receita deriva PASSOS de PARAMS e nenhuma medida está digitada. Subiu de
       244/101 para 267/122 quando o quadro da bicicleta e o estudo de seção de
       tubo entraram: o quadro traz vinte declarados vivos, porque a tabela de
       geometria chega como argumento e a derivação roda a cada chamada, e o
       estudo traz dois inertes por ser fixture de comparação visual. Foi para
       269/119 quando as juntas do quadro viraram ponto medido: o número de
       declarados sobe com os pontos novos e o de vivos CAI, porque ângulo e
       comprimento do tubo do selim deixaram de mover geometria quando a solda
       passou a ser coordenada. É perda de parâmetro vivo aceita em troca de
       erro que não acumula ao longo da corrente de juntas. Foi para 267/114
       quando o tubo inferior passou a ser descrito pelas duas bordas medidas:
       o perfil por fração e as duas pontas saíram da tabela e deram lugar a
       duas polilinhas, que são dado medido e não parâmetro de projeto. */
    const r = await parametrosReutilizavel({ acervo: true });
    expect(r.ok).toBe(true);
    expect(r.resultado.totais).toEqual({ declarados: 267, vivos: 114, inertes: 153 });

    const porAlvo = Object.fromEntries(r.resultado.registros.map((x) => [x.alvo, x.totais]));
    expect(porAlvo['cadeira-de-madeira']).toEqual({ declarados: 21, vivos: 13, inertes: 8 });
    expect(porAlvo['prensa-mecanica-industrial']).toEqual({ declarados: 14, vivos: 0, inertes: 14 });
    expect(porAlvo['prensa-progressiva']).toEqual({ declarados: 15, vivos: 0, inertes: 15 });
    /* A bicicleta entrou depois e derivou PASSOS de PARAMS como a skill manda:
       34 dos 36 vivos. Ela sozinha leva o acervo de 13% para 34% de liberdade
       real, e é a contraprova de que o 13% não era limite do motor. */
    expect(porAlvo['bicicleta-urbana']).toEqual({ declarados: 36, vivos: 34, inertes: 2 });
    expect(porAlvo['bicicleta-prova']).toEqual({ declarados: 45, vivos: 44, inertes: 1 });
    /* `armas/` so entrou na conta no R00 deste plano: ate ali o comando dizia
       "acervo inteiro" varrendo duas das quatro pastas de receita. */
    expect(porAlvo['espada-curta']).toEqual({ declarados: 13, vivos: 0, inertes: 13 });

    expect(r.resultado.registros.every((x) => x.carregou)).toBe(true);
    expect(r.resultado.registros.every((x) => x.determinismo.estavel)).toBe(true);
    /* 90 s: o retrato reexecuta o acervo inteiro, 139 parâmetros × até três
       sondas cada, e a bicicleta sozinha custa 36 deles numa malha de mil
       faces. O orçamento é do tamanho do trabalho,
       não do padrão do runner — a lição do R01 do plano anterior. */
  }, 90_000);

  it('recusa uso ambíguo em vez de escolher por conta própria', async () => {
    expect((await parametrosReutilizavel({})).codigo).toBe(2);
    expect((await parametrosReutilizavel({ alvo: 'cadeira-de-madeira', acervo: true })).codigo).toBe(2);
    const inexistente = await parametrosReutilizavel({ alvo: 'peca-que-nao-existe' });
    expect(inexistente.codigo).toBe(1);
    expect(inexistente.stderr).toContain('não encontrada');
  }, 20_000);
});
