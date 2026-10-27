/* guarda-acervo.test.mjs — a polaridade do veredito de contato.
 *
 * O defeito que este arquivo guarda tem duas faces, e só uma estava coberta.
 * Peça que se atravessa sem declarar já reprovava. Peça que DECLARA solda e
 * entrega espaço entre as partes passava com código zero, e foi assim que uma
 * bicicleta saiu com os balancos soltos no ar sem nada acusar. Declarar um
 * contato é prometer geometria; promessa não cumprida é defeito, não folga.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from '../descrever-peca.mjs';
import {
  conferirAcervo, DECLARACAO_DE_VAZIO, emArquivoSolto, pecasDoAcervo, vazioDeclarado,
  faltasDaCadeia,
} from './guarda-acervo.mjs';

const MOTIVO = 'as duas metades são soldadas uma na outra';
const ACERVO = resolve(fileURLToPath(new URL('../../..', import.meta.url)), 'procedural/pecas');

/* Dois cubos no eixo x, com a distância entre eles como parâmetro: em 0.4 eles
   se encostam, em 3 há um vão de um metro. */
function duasPartes({ distancia, contatos }) {
  return {
    default: {
      meta: { nome: 'par de ensaio' },
      PASSOS: [
        ['cubo', { origemId: 10, larg: 0.4, alt: 0.4, prof: 0.4 }],
        ['cubo', { origemId: 20, larg: 0.4, alt: 0.4, prof: 0.4, em: [distancia, 0, 0] }],
        ['parte', { nome: 'esquerda', sel: { origem: { op: 'cubo', id: 10 } } }],
        ['parte', { nome: 'direita', sel: { origem: { op: 'cubo', id: 20 } } }],
      ],
      ...(contatos ? { contatos } : {}),
    },
  };
}

const medir = (modulo) => descreverPecaReutilizavel({ peca: 'par-de-ensaio', modulo });

describe('veredito de contato do acervo', () => {
  it('REPROVA contato declarado que não acontece, e nomeia o par', async () => {
    const medida = await medir(duasPartes({
      distancia: 3,
      contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }],
    }));
    expect(medida.ok).toBe(false);
    expect(medida.codigo).toBe(1);
    expect(medida.stderr).toMatch(/DECLARADO\(S\) QUE NÃO ACONTECEM/);
    expect(medida.stderr).toMatch(/direita ↔ esquerda/);
  });

  it('APROVA o mesmo par quando a geometria cumpre a declaração', async () => {
    const medida = await medir(duasPartes({
      distancia: 0.4,
      contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }],
    }));
    expect(medida.ok).toBe(true);
    expect(medida.resultado.contatos.declaradosSemContato).toEqual([]);
  });

  it('continua reprovando contato que acontece sem ter sido declarado', async () => {
    const medida = await medir(duasPartes({ distancia: 0.4, contatos: null }));
    expect(medida.ok).toBe(false);
    expect(medida.stderr).toMatch(/NÃO DECLARADO/);
  });

  it('REPROVA parte prometida no plano e não entregue pela peça', async () => {
    const modulo = duasPartes({ distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }] });
    modulo.default.PLANO = {
      objeto: 'par de ensaio com tres partes prometidas',
      referencias: ['docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md'],
      escala: { medida: 'lado do cubo', milimetros: 400 },
      partes: [
        { nome: 'esquerda', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' },
        { nome: 'direita', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' },
        { nome: 'meio', forma: 'cubo que deveria existir entre os dois outros', tecnica: 'cubo' },
      ],
      criteriosDeReprovacao: ['alguma das tres partes ausente da peça'],
    };
    const medida = await medir(modulo);
    expect(medida.ok).toBe(false);
    expect(medida.stderr).toMatch(/PROMETIDA\(S\) E NÃO ENTREGUE/);
    expect(medida.stderr).toMatch(/meio/);
  });

  it('REPROVA parte entregue que o plano não prometeu', async () => {
    const modulo = duasPartes({ distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }] });
    modulo.default.PLANO = {
      objeto: 'par de ensaio com uma parte prometida a menos',
      referencias: ['docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md'],
      escala: { medida: 'lado do cubo', milimetros: 400 },
      partes: [{ nome: 'esquerda', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' }],
      criteriosDeReprovacao: ['peça com parte que o plano não descreve'],
    };
    const medida = await medir(modulo);
    expect(medida.ok).toBe(false);
    expect(medida.stderr).toMatch(/SEM PROMESSA/);
    expect(medida.stderr).toMatch(/direita/);
  });

  it('a parte solta que não toca nenhuma outra sai no aviso da receita de ensaio, e a ilha declarada com o motivo não', async () => {
    /* Fora do acervo, a receita de ensaio só recebe o aviso; a peça do acervo reprova, e o acervo de hoje passa. */
    const solta = await medir(duasPartes({ distancia: 3, contatos: null }));
    expect(solta.stdout).toMatch(/PARTE\(S\) OU GRUPO\(S\) SOLTO\(S\) \(aviso; a guarda do acervo reprova\)[\s\S]*não toca nenhuma parte/);
    const { ilhasDaPeca } = await import('../descrever-peca.mjs');
    const contatos = { partes: ['a', 'b'], paresEmContato: [], cobertura: { inconclusivos: [] } };
    expect(ilhasDaPeca(contatos).problemas).toEqual(["a parte b não toca nenhuma parte de a; encoste as partes, ou declare a ilha em `ilhas` da receita com { contem: <uma parte dela>, motivo }."]);
    const declarada = duasPartes({ distancia: 3, contatos: null });
    declarada.default.ilhas = [{ contem: 'direita', motivo: 'a direita se liga à esquerda por outra peça da montagem' }];
    expect((await medir(declarada)).stdout).not.toMatch(/SOLTO/);
    const ficcao = duasPartes({ distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }] });
    ficcao.default.ilhas = [{ contem: 'direita', motivo: 'x' }];
    expect((await medir(ficcao)).stdout).toContain("a ilha declarada por 'direita' não está solta");
  });

  it('peça de ensaio sem plano continua mensurável; o acervo é que exige plano', async () => {
    const medida = await medir(duasPartes({
      distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }],
    }));
    expect(medida.ok).toBe(true);
    expect(medida.resultado.plano).toBe(null);
    /* Que o acervo exige plano e que o de hoje passa é o teste de varredura logo abaixo: este repetia a varredura inteira,
       que com as peças do avião passou de 88 s sozinha, e estourava o prazo quando a bateria roda em paralelo. */
  });

  it('REPROVA peça do acervo que não exporta plano nenhum', async () => {
    /* A peça é escrita no acervo de verdade e apagada depois: a guarda mede o
       que está na pasta, e provar isso com um dublê mediria outra coisa. */
    /* A peça de ensaio nasce JÁ NA PASTA: em arquivo solto ela reprovaria pela
       forma antes de chegar ao plano, e o teste mediria outra coisa. */
    const nome = 'ensaio-sem-plano-temporario';
    const pasta = join(ACERVO, nome);
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'receita.js'), 'export default { meta: { nome: "ensaio" }, '
      + 'PASSOS: [["cubo", { origemId: 10, larg: 0.4, alt: 0.4, prof: 0.4 }], '
      + '["parte", { nome: "unica", sel: { origem: { op: "cubo", id: 10 } } }]] };\n', 'utf8');
    try {
      expect(pecasDoAcervo()).toContain(nome);
      const { reprovadas } = await conferirAcervo([nome]);
      expect(reprovadas).toHaveLength(1);
      expect(reprovadas[0].motivo).toMatch(/SEM PLANO DE MODELAGEM/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
    expect(pecasDoAcervo()).not.toContain(nome);
  });

  it('REPROVA peça em arquivo solto, e diz qual é a forma certa', async () => {
    /* A recusa entra agora porque a forma antiga ficou sem ocupante: a bicicleta
       já é pasta. Enquanto as duas formas conviviam, permitir era o certo. */
    const nome = 'ensaio-em-arquivo-solto';
    const caminho = join(ACERVO, `${nome}.js`);
    writeFileSync(caminho, 'export default { meta: { nome: "ensaio" }, PASSOS: [] };\n', 'utf8');
    try {
      expect(emArquivoSolto(nome)).toBe(true);
      const { reprovadas } = await conferirAcervo([nome]);
      expect(reprovadas).toHaveLength(1);
      expect(reprovadas[0].motivo).toMatch(/PEÇA EM ARQUIVO SOLTO/);
      expect(reprovadas[0].motivo).toMatch(new RegExp(`${nome}/receita.js`));
    } finally {
      rmSync(caminho, { force: true });
    }
  });

  it('REPROVA a receita cujos PASSOS não saem da tabela a cada leitura, e aceita a cadeia inteira', () => {
    const gerarPassos = (t) => [['cubo', { larg: t.lado / 1000 }]];
    const base = { TABELA: { lado: 400 }, derivar: (t) => t, gerarPassos };
    const inteira = { ...base, default: { PARAMS: base.TABELA, get PASSOS() { return gerarPassos(this.PARAMS); } } };
    expect(faltasDaCadeia(inteira)).toEqual([]);
    const congelada = { ...base, default: { PARAMS: base.TABELA, PASSOS: gerarPassos(base.TABELA) } };
    expect(faltasDaCadeia(congelada).join('\n')).toContain('`PASSOS` é um valor calculado uma vez');
    expect(faltasDaCadeia({ default: { PARAMS: {} } }).join('\n')).toMatch(/não exporta `TABELA`[\s\S]*`derivar\(\)`[\s\S]*`gerarPassos\(\)`/);
  });

  it('a regra da identidade que a guarda aplica acha o id posicional por passo e não conta a gaiola da subdivisão', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'acervo-idcru-'));
    mkdirSync(join(pasta, 'cubo-cru'));
    const receita = join(pasta, 'cubo-cru', 'receita.js');
    writeFileSync(receita, `export const TABELA = { lado: 400 };
export function derivar(t) { return { lado: t.lado / 1000 }; }
export function gerarPassos(t) { const d = derivar(t); return [['cubo', { origemId: 1, larg: d.lado, alt: d.lado, prof: d.lado }], ['material', { faces: [0, 1], usa: 'a' }]]; }
export default { PARAMS: TABELA, get PASSOS() { return gerarPassos(this.PARAMS); } };
`);
    const { ocorrenciasPosicionais } = await import('../../../procedural/nucleo/referencia-posicional.js');
    const modulo = await import(receita);
    expect(ocorrenciasPosicionais(modulo.default.PASSOS)).toEqual([{ passo: 1, forma: 'faces', rotulo: 'faces:[ids]', ids: 2 }]);
    expect(ocorrenciasPosicionais([['subdivisao', { pontos: [[0, 0, 0]], faces: [[0, 1, 2, 3]] }]])).toEqual([]);
    rmSync(pasta, { recursive: true, force: true });
  });

  /* AS TRÊS REGRAS NUMA PEÇA DO ACERVO DE VERDADE. Os casos acima provam cada regra pela função; estes escrevem uma peça na
     pasta do acervo, com plano válido, e provam que a guarda a reprova pelo motivo da regra e por nenhum outro. Sem eles,
     um ramo da guarda que deixasse de chamar a função passaria com o acervo de hoje inteiro limpo. */
  async function reprovacaoDe(nome, corpo) {
    const pasta = join(ACERVO, nome);
    mkdirSync(join(pasta, 'referencias'), { recursive: true });
    writeFileSync(join(pasta, 'referencias', 'alvo.md'), '# alvo de ensaio\n', 'utf8');
    writeFileSync(join(pasta, 'receita.js'), corpo, 'utf8');
    try {
      const { reprovadas } = await conferirAcervo([nome]);
      return reprovadas.map((r) => r.motivo).join('\n');
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  }
  const PLANO_DE_ENSAIO = (partes) => `PLANO: { objeto: 'peça de ensaio da guarda do acervo', referencias: ['referencias/alvo.md'], escala: { medida: 'lado', milimetros: 400 }, partes: ${JSON.stringify(partes.map((nome) => ({ nome, forma: `cubo de ensaio ${nome}`, tecnica: 'cubo do núcleo' })))}, criteriosDeReprovacao: ['a peça não sai como dois cubos de ensaio'] }`;
  const CONTATO = "contatos: [{ par: ['base', 'tampa'], motivo: 'os dois cubos de ensaio se apoiam lado a lado' }],";
  const cadeia = (passos, extra = CONTATO) => `export const TABELA = { lado: 400, vao: 0 };
export function derivar(t) { return { lado: t.lado, vao: t.vao }; }
const m = (mm) => mm / 1000;
export function gerarPassos(t) { const d = derivar(t); return ${passos}; }
export default { meta: { nome: 'ensaio' }, PARAMS: TABELA, MATERIAIS: { a: { tipo: 'liso', cor: '#888888' } }, ${PLANO_DE_ENSAIO(['base', 'tampa'])}, ${extra} get PASSOS() { return gerarPassos(this.PARAMS); } };
`;
  const DOIS_CUBOS = (vao) => `[['cubo', { origemId: 1, larg: m(d.lado), alt: m(d.lado), prof: m(d.lado), em: [0, m(d.lado) / 2, 0] }], ['cubo', { origemId: 2, larg: m(d.lado), alt: m(d.lado), prof: m(d.lado), em: [m(d.lado + ${vao}), m(d.lado) / 2, 0] }], ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }], ['parte', { nome: 'tampa', sel: { origem: { op: 'cubo', id: 2 } } }]]`;

  it('REPROVA no acervo a receita com PASSOS calculado uma vez, a que endereça por id posicional e a de parte solta', async () => {
    const congelada = cadeia(DOIS_CUBOS(0)).replace("get PASSOS() { return gerarPassos(this.PARAMS); }", 'PASSOS: gerarPassos(TABELA)');
    expect(await reprovacaoDe('ensaio-guarda-cadeia', congelada)).toMatch(/CADEIA DA RECEITA INCOMPLETA/);
    const posicional = cadeia(`[...${DOIS_CUBOS(0)}, ['material', { faces: [0, 1], usa: 'a' }]]`);
    expect(await reprovacaoDe('ensaio-guarda-posicional', posicional)).toMatch(/REFERÊNCIA\(S\) POR ID POSICIONAL/);
    expect(await reprovacaoDe('ensaio-guarda-solta', cadeia(DOIS_CUBOS(300), ''))).toMatch(/PARTE\(S\) OU GRUPO\(S\) SOLTO\(S\)/);
    /* A mesma peça com os cubos encostados e por nome passa: o motivo é a regra, e não o resto da peça de ensaio. */
    expect(await reprovacaoDe('ensaio-guarda-limpa', cadeia(DOIS_CUBOS(0)))).toBe('');
  }, 120000);

  it('peça em pasta não é acusada de forma antiga', () => {
    for (const peca of pecasDoAcervo()) expect(emArquivoSolto(peca), peca).toBe(false);
    /* Peça que não existe não é acusada: quem reclama de nome inexistente é o
       resolvedor, com a mensagem dele. */
    expect(emArquivoSolto('peca-que-nunca-existiu')).toBe(false);
  });

  it('a guarda varre o acervo e o acervo de hoje passa', async () => {
    /* Quantas peças e quais é assunto do acervo, não deste teste: com peça ou
       sem, o que ele afirma é que nada do que está lá reprova. */
    /* O ACERVO É LIDO, E NÃO NOMEADO. Fixar o nome de uma peça aqui faz este teste depender de conteúdo: o dia em que essa
       peça sair do acervo, o teste quebra por um motivo que nada tem a ver com o que ele afirma. */
    const { reprovadas } = await conferirAcervo(pecasDoAcervo());
    expect(reprovadas).toEqual([]);
  /* Lê o acervo inteiro, e o tempo cresce com ele: passou de 20 s quando o ombro ganhou uma variação e de 88 s sozinho com as
     oito peças do avião em 2026-10-16; o prazo é o dobro disso, para a bateria em paralelo. Em 2026-10-21 o CI estourou
     180 s em sete execuções seguidas, com a bateria lenta em paralelo na máquina do CI, enquanto a local levava 124 s;
     o prazo subiu para 600 s, e a medida por etapa fica para o retrato do acervo do plano de ajustes no núcleo. */
  }, 600000);

  /* ACERVO VAZIO PRECISA SER DECLARADO. Varredura vazia sai igual quando o
     acervo está sem peça de propósito e quando a listagem quebrou, e aprovar
     calada no segundo caso é gate que passa sem medir. Quem esvazia declara;
     quem põe peça nova apaga a declaração, senão ela mente em silêncio. */
  it('recusa acervo vazio sem declaração e aceita com ela', () => {
    const declaracao = join(ACERVO, DECLARACAO_DE_VAZIO);
    const tinha = existsSync(declaracao);
    const vazio = mkdtempSync(join(tmpdir(), 'acervo-vazio-'));
    try {
      expect(pecasDoAcervo(vazio)).toEqual([]);
      expect(vazioDeclarado({ raiz: vazio })).toBe(false);
      writeFileSync(join(vazio, DECLARACAO_DE_VAZIO), 'sem peça\n', 'utf8');
      expect(vazioDeclarado({ raiz: vazio })).toBe(true);
    } finally {
      rmSync(vazio, { recursive: true, force: true });
    }
    /* O acervo de verdade: ou tem peça e não declara vazio, ou está sem peça e
       declara. Os dois ao mesmo tempo é a declaração mentindo. */
    expect(tinha).toBe(pecasDoAcervo().length === 0);
  });
});
