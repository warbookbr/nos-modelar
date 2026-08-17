/* alterar-montagem.test.ts — alteração semântica compacta de montagem.

   O ATRITO, como o relatório de grandes melhorias o descreve: "hoje o agente
   envia o documento completo para mudar um parâmetro".

   O custo de contexto é o motivo visível. O motivo caro é outro, e é o que
   estas provas defendem: quem reenvia o documento inteiro está AFIRMANDO cada
   byte dele. Uma chave reordenada, um número rearredondado ou um campo perdido
   na serialização vira alteração de conteúdo que o serviço não tem como
   distinguir de uma alteração deliberada — o documento é aceito porque é
   VÁLIDO, não porque é o pretendido. Isso é a mesma família de falha silenciosa
   que o resto do repositório persegue.

   A alteração compacta inverte a garantia: o que não foi declarado permanece
   idêntico POR CONSTRUÇÃO, e não por disciplina de quem serializou o JSON. É a
   afirmação central deste arquivo, e a primeira prova mede exatamente isso.

   O endereço é identidade, nunca posição — a restrição que o próprio relatório
   impôs ao recorte: "índice de array ou JSON Patch posicional não deve virar
   identidade persistida". */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript, exercitado pela API pública.
import { alterarMontagem } from '../../src/autoria/alterar-montagem.js';

const DOC = Object.freeze({
  formato: 'mecanifica.montagem',
  versao: 3,
  id: 'gabarito-separacao-direcional',
  instancias: [
    {
      id: 'movel',
      alvo: { tipo: 'peca', ref: 'bloco-gabarito' },
      pose: { deslocamento: [0, 1.02, 0], rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
    },
    { id: 'referencia', alvo: { tipo: 'peca', ref: 'bloco-gabarito' } },
  ],
  relacoes: [
    {
      id: 'vaoEntreBlocos',
      tipo: 'mantemSeparacaoDirecional',
      referencia: { caminho: ['referencia'], parte: 'superficie' },
      movel: { caminho: ['movel'] },
      especificacao: { eixo: [0, 2, 0], separacaoMinima: 0.02, toleranciaNumerica: 0.000001 },
    },
  ],
});

const partir = () => JSON.parse(JSON.stringify(DOC));
const erroDe = (fn: () => unknown) => { try { fn(); } catch (e) { return e as any; } return null; };

describe('o que não foi declarado permanece idêntico', () => {
  it('só o campo citado muda; todo o resto sai byte a byte igual', () => {
    const antes = partir();
    const { montagem } = alterarMontagem(antes, [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.025, 0] },
    ]);

    /* a prova forte: reverter APENAS o campo alterado devolve o documento
       original, byte a byte. Se qualquer outra coisa tivesse mudado — ordem de
       chave, arredondamento, campo perdido —, esta igualdade quebraria. */
    const revertido = JSON.parse(JSON.stringify(montagem));
    revertido.instancias[0].pose.deslocamento = [0, 1.02, 0];
    expect(JSON.stringify(revertido)).toBe(JSON.stringify(DOC));

    expect(montagem.instancias[0].pose.deslocamento).toEqual([0, 1.025, 0]);
  });

  it('não muta o documento de entrada', () => {
    const entrada = partir();
    const congelado = JSON.stringify(entrada);
    alterarMontagem(entrada, [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 9, 0] },
    ]);
    expect(JSON.stringify(entrada)).toBe(congelado);
  });

  it('o valor novo é copiado, não compartilhado com quem chamou', () => {
    const valor = [0, 1.025, 0];
    const { montagem } = alterarMontagem(partir(), [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor },
    ]);
    valor[1] = 999;
    expect(montagem.instancias[0].pose.deslocamento).toEqual([0, 1.025, 0]);
  });
});

describe('o endereço é identidade', () => {
  it('alcança instância, relação e a raiz pelo nome', () => {
    const { montagem, diff } = alterarMontagem(partir(), [
      { alvo: { instancia: 'movel' }, campo: 'alvo.ref', valor: 'outro-bloco' },
      { alvo: { relacao: 'vaoEntreBlocos' }, campo: 'especificacao.separacaoMinima', valor: 0.03 },
      { alvo: { raiz: true }, campo: 'id', valor: 'gabarito-renomeado' },
    ]);
    expect(montagem.instancias[0].alvo.ref).toBe('outro-bloco');
    expect(montagem.relacoes[0].especificacao.separacaoMinima).toBe(0.03);
    expect(montagem.id).toBe('gabarito-renomeado');
    expect(diff.map((d: any) => d.alvo)).toEqual(["instancia 'movel'", "relacao 'vaoEntreBlocos'", 'raiz']);
  });

  it('a ordem das instâncias no documento não é o endereço', () => {
    /* citar 'referencia' alcança a segunda instância; se o endereço fosse
       posicional, esta prova mudaria de alvo ao reordenar a lista. */
    const doc = partir();
    doc.instancias.reverse();
    const { montagem } = alterarMontagem(doc, [
      { alvo: { instancia: 'referencia' }, campo: 'alvo.ref', valor: 'apoio' },
    ]);
    const alterada = montagem.instancias.find((i: any) => i.id === 'referencia');
    const intacta = montagem.instancias.find((i: any) => i.id === 'movel');
    expect(alterada.alvo.ref).toBe('apoio');
    expect(intacta.alvo.ref).toBe('bloco-gabarito');
  });

  it('o diff diz o que era e o que passou a ser', () => {
    const { diff } = alterarMontagem(partir(), [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.025, 0] },
    ]);
    expect(diff).toEqual([{
      alvo: "instancia 'movel'",
      campo: 'pose.deslocamento',
      de: [0, 1.02, 0],
      para: [0, 1.025, 0],
    }]);
  });
});

describe('as recusas', () => {
  it('índice de array como endereço é recusado, com a razão', () => {
    const erro = erroDe(() => alterarMontagem(partir(), [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento.1', valor: 1.025 },
    ]));
    expect(erro.codigo).toBe('campo-posicional');
    expect(erro.message).toMatch(/índice de array não é identidade/);
  });

  it('campo inexistente é recusado: alteração não cria contrato', () => {
    const erro = erroDe(() => alterarMontagem(partir(), [
      { alvo: { instancia: 'referencia' }, campo: 'pose.deslocamento', valor: [0, 1, 0] },
    ]));
    expect(erro.codigo).toBe('campo-inexistente');
    expect(erro.message).toMatch(/'pose' não existe no alvo/);
  });

  it('alvo inexistente é recusado nomeando os disponíveis', () => {
    const erro = erroDe(() => alterarMontagem(partir(), [
      { alvo: { instancia: 'fantasma' }, campo: 'alvo.ref', valor: 'x' },
    ]));
    expect(erro.codigo).toBe('alvo-nao-encontrado');
    expect(erro.message).toMatch(/'movel', 'referencia'/);
  });

  it('alteração sem efeito é recusada: revisão não afirma mudança que não houve', () => {
    const erro = erroDe(() => alterarMontagem(partir(), [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.02, 0] },
    ]));
    expect(erro.codigo).toBe('alteracao-sem-efeito');
  });

  it('duas alterações no mesmo endereço são recusadas: o resultado dependeria da ordem', () => {
    const erro = erroDe(() => alterarMontagem(partir(), [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.03, 0] },
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.04, 0] },
    ]));
    expect(erro.codigo).toBe('alteracao-duplicada');
  });

  it('lista vazia é recusada', () => {
    expect(erroDe(() => alterarMontagem(partir(), [])).codigo).toBe('alteracoes-vazias');
  });

  it('alvo com mais de uma entidade é recusado', () => {
    const erro = erroDe(() => alterarMontagem(partir(), [
      { alvo: { instancia: 'movel', relacao: 'vaoEntreBlocos' }, campo: 'id', valor: 'x' },
    ]));
    expect(erro.codigo).toBe('alvo-invalido');
  });

  it('forma diferente de {alvo, campo, valor} é recusada', () => {
    expect(erroDe(() => alterarMontagem(partir(), [
      { alvo: { raiz: true }, campo: 'id' } as any,
    ])).codigo).toBe('alteracao-invalida');
    expect(erroDe(() => alterarMontagem(partir(), [
      { alvo: { raiz: true }, campo: 'id', valor: 'x', extra: 1 } as any,
    ])).codigo).toBe('alteracao-invalida');
  });

  /* Uma recusa no meio da lista não pode deixar as anteriores aplicadas: meia
     proposta publicada é pior que nenhuma, porque ninguém pediu por ela. */
  it('recusa no meio não deixa alteração parcial no documento de entrada', () => {
    const entrada = partir();
    const congelado = JSON.stringify(entrada);
    erroDe(() => alterarMontagem(entrada, [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.03, 0] },
      { alvo: { instancia: 'fantasma' }, campo: 'alvo.ref', valor: 'x' },
    ]));
    expect(JSON.stringify(entrada)).toBe(congelado);
  });
});

describe('o ganho de contexto é real, e medido', () => {
  it('a proposta compacta é uma fração do documento que ela substitui', () => {
    const alteracoes = [
      { alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.025, 0] },
    ];
    const documentoInteiro = JSON.stringify(DOC).length;
    const propostaCompacta = JSON.stringify(alteracoes).length;
    expect(propostaCompacta).toBeLessThan(documentoInteiro / 4);
    /* e ela produz exatamente o mesmo documento que o caminho longo produziria */
    const { montagem } = alterarMontagem(partir(), alteracoes);
    const longo = partir();
    longo.instancias[0].pose.deslocamento = [0, 1.025, 0];
    expect(JSON.stringify(montagem)).toBe(JSON.stringify(longo));
  });
});
