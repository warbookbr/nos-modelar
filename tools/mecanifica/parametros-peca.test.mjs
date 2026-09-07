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

  it('trava o retrato do acervo: 103 declarados e só 13 vivos', async () => {
    /* Este número é a razão de existir do plano. Se ele mudar sem alguém ter
       ligado uma receita aos seus parâmetros de propósito, algo regrediu. */
    const r = await parametrosReutilizavel({ acervo: true });
    expect(r.ok).toBe(true);
    expect(r.resultado.totais).toEqual({ declarados: 103, vivos: 13, inertes: 90 });

    const porAlvo = Object.fromEntries(r.resultado.registros.map((x) => [x.alvo, x.totais]));
    expect(porAlvo['cadeira-de-madeira']).toEqual({ declarados: 21, vivos: 13, inertes: 8 });
    expect(porAlvo['prensa-mecanica-industrial']).toEqual({ declarados: 14, vivos: 0, inertes: 14 });
    expect(porAlvo['prensa-progressiva']).toEqual({ declarados: 15, vivos: 0, inertes: 15 });

    expect(r.resultado.registros.every((x) => x.carregou)).toBe(true);
    expect(r.resultado.registros.every((x) => x.determinismo.estavel)).toBe(true);
    /* 60 s: o retrato reexecuta o acervo inteiro, 103 parâmetros × até três
       sondas cada, e leva ~9 s sozinho. O orçamento é do tamanho do trabalho,
       não do padrão do runner — a lição do R01 do plano anterior. */
  }, 60_000);

  it('recusa uso ambíguo em vez de escolher por conta própria', async () => {
    expect((await parametrosReutilizavel({})).codigo).toBe(2);
    expect((await parametrosReutilizavel({ alvo: 'cadeira-de-madeira', acervo: true })).codigo).toBe(2);
    const inexistente = await parametrosReutilizavel({ alvo: 'peca-que-nao-existe' });
    expect(inexistente.codigo).toBe(1);
    expect(inexistente.stderr).toContain('não encontrada');
  }, 20_000);
});
