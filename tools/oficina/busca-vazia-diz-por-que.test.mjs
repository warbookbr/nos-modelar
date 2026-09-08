/* Busca que volta vazia diz por quê.
 *
 * O caso que abriu isto: modelando a bicicleta, `texto: 'tubo cilindro caminho'`
 * devolveu zero e `texto: 'cilindro'` devolveu um. O `texto` é casado como UMA
 * substring do corpus, então frase de mais de uma palavra praticamente nunca
 * casa — e a resposta vazia é idêntica à de um catálogo que de fato não tem
 * nada. Zero é resposta legítima; zero sem motivo, quando a ferramenta sabe o
 * motivo, é a mesma família do no-op silencioso. */
import { describe, expect, it } from 'vitest';
import { criarServicoDescobertaProcedural } from '../../prototipos/procedural/v3/servicos/descoberta.js';

const servico = criarServicoDescobertaProcedural();

describe('busca de capacidade que volta vazia', () => {
  it('explica que a frase é casada inteira, e diz qual palavra acha sozinha', () => {
    const r = servico.buscar({ texto: 'tubo cilindro caminho' });
    expect(r.total).toBe(0);
    expect(r.diagnostico.motivo).toBe('texto-casa-como-frase-inteira');

    const porTermo = Object.fromEntries(r.diagnostico.termos.map(({ termo, operacoes }) => [termo, operacoes]));
    expect(porTermo).toEqual({ tubo: 0, cilindro: 1, caminho: 1 });
    expect(r.diagnostico.sugestao).toBe('cilindro');
    expect(r.diagnostico.explicacao).toContain('frase única');
    expect(r.diagnostico.explicacao).toContain("'tubo' não está no índice");
  });

  it('a sugestão funciona de verdade quando seguida', () => {
    /* Sugestão que não achasse nada seria pior que silêncio: mandaria a próxima
       rodada para o mesmo lugar com confiança. */
    const vazia = servico.buscar({ texto: 'tubo cilindro caminho' });
    const seguindo = servico.buscar({ texto: vazia.diagnostico.sugestao });
    expect(seguindo.total).toBeGreaterThan(0);
    expect(seguindo.diagnostico).toBeNull();
  });

  it('não diagnostica o que não precisa: busca com resultado sai limpa', () => {
    const r = servico.buscar({ texto: 'cilindro' });
    expect(r.total).toBe(1);
    expect(r.diagnostico).toBeNull();
  });

  it('uma palavra só que não existe não vira lição sobre frases', () => {
    /* Aqui não há palavra a mais para culpar: o termo simplesmente não está no
       índice, e inventar uma explicação sobre casamento de frase seria ruído. */
    const r = servico.buscar({ texto: 'palavraquenaoexiste' });
    expect(r.total).toBe(0);
    expect(r.diagnostico).toMatchObject({ motivo: 'sem-correspondencia', sugestao: null });
    expect(r.diagnostico.termos).toEqual([]);
  });

  it('quando nenhuma palavra existe, diz isso em vez de sugerir uma', () => {
    const r = servico.buscar({ texto: 'jabuticaba quiabo' });
    expect(r.total).toBe(0);
    expect(r.diagnostico.sugestao).toBeNull();
    expect(r.diagnostico.explicacao).toContain('nem sozinha');
  });

  it('não mudou o casamento: quem achava, continua achando o mesmo', () => {
    /* Trocar substring por conjunção mudaria o que TODA consulta existente
       devolve. O diagnóstico informa a decisão em vez de tomá-la. */
    expect(servico.buscar({ texto: 'cubo' }).operacoes).toHaveLength(1);
    expect(servico.buscar({ texto: 'revolucionar' }).operacoes.map(({ nome }) => nome)).toContain('lathe');
  });
});
