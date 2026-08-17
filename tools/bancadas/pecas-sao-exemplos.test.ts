/* pecas-sao-exemplos.test.ts — o selo que impede a peça de exemplo de ser lida
   como base de projeto.

   O ATRITO QUE ISSO CONSERTA. Os nomes das peças deste repositório soam
   definitivos: `roda-dianteira`, `freio-disco`, `moto`, `drone-inspecao`. Duas
   delas são exportadas para `pecas-resolvidas/` e lidas por outro repositório.
   Nada disso as torna referência de engenharia — elas existem para exercitar e
   provar capacidades do núcleo —, mas nada no arquivo dizia isso, e um leitor
   (humano ou IA) que abrisse `roda-dianteira.js` não tinha como saber.

   O custo de errar aqui não é estético: tratar a geometria de exemplo como
   contrato faz a pessoa preservar medida que nunca foi projetada, hesitar em
   corrigir o núcleo por medo de "quebrar a peça", e recusar mudança boa por
   uma razão que não existe.

   POR QUE UM GATE, E NÃO SÓ UM COMENTÁRIO. Um selo aplicado uma vez envelhece
   na primeira peça nova: quem copia `_modelo.js` leva o selo junto, quem
   escreve do zero não leva, e em pouco tempo o padrão vira "algumas peças
   avisam". Este teste é o que faz o selo ser PADRÃO em vez de decoração — peça
   nova sem selo reprova aqui, no mesmo lugar onde o resto do acervo é medido.

   O selo é o PRIMEIRO conteúdo do arquivo de propósito: um aviso que aparece
   depois de trinta linhas de receita não é aviso, é nota de rodapé. */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PECAS = resolve(AQUI, '../../prototipos/procedural/v3/pecas');

/* A primeira linha é a assinatura do selo: curta, gritada e estável. As frases
   seguintes podem ser reescritas sem quebrar o gate; esta linha, não. */
const ASSINATURA = '/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.';

/* As três afirmações que o selo precisa carregar, cada uma por um motivo
   diferente: que é exemplo, que não é referência aprovada, e que pode sumir.
   A comparação é feita sobre o texto com espaços normalizados, senão reflowar
   um parágrafo do selo quebraria o gate sem que nada de fato mudasse. */
const EXIGIDAS = [
  { trecho: 'são exemplos', razão: 'dizer o que a peça É' },
  { trecho: 'nunca a geometria daqui', razão: 'dizer o que o repositório sustenta no lugar dela' },
  { trecho: 'ser removida a qualquer momento', razão: 'dizer que ninguém deve depender desta geometria' },
];

/* tira a moldura do comentário (` * `) e junta as quebras: o que sobra é a
   frase como ela é lida, não como ela foi quebrada no arquivo. */
const comoFrase = (texto: string) => texto.replace(/^\s*\*\s?/gm, ' ').replace(/\s+/g, ' ').trim();

const arquivos = readdirSync(PECAS).filter((nome) => nome.endsWith('.js')).sort();

describe('toda peça se identifica como exemplo, no topo do arquivo', () => {
  it('não transforma a existência do acervo em contrato de produto', () => {
    /* O diretório pode estar vazio: conteúdo experimental não é dependência
       do motor nem prova de que a aplicação publicou uma peça. A validade da
       publicação é cobrada pelo contrato explícito de catálogo, em outro
       teste; este gate só audita arquivos que de fato existirem. */
    expect(arquivos).toEqual([...arquivos].sort());
  });

  it.each(arquivos)('%s abre com o selo', (nome) => {
    const texto = readFileSync(join(PECAS, nome), 'utf8');
    expect(
      texto.startsWith(ASSINATURA),
      `${nome} não começa com o selo de peça de exemplo.\n`
      + `Copie o bloco que abre qualquer peça de ${'prototipos/procedural/v3/pecas/'} — ou o de _modelo.js — `
      + 'para as primeiras linhas deste arquivo, antes do comentário próprio da peça.',
    ).toBe(true);
  });

  it.each(arquivos)('%s carrega as três afirmações do selo', (nome) => {
    const frase = comoFrase(readFileSync(join(PECAS, nome), 'utf8'));
    for (const { trecho, razão } of EXIGIDAS) {
      expect(frase.includes(trecho), `${nome}: o selo perdeu a parte de ${razão} ("${trecho}")`).toBe(true);
    }
  });
});

describe('o selo é o mesmo em todas as peças', () => {
  /* Um selo que varia por arquivo deixa de ser reconhecível de relance, e a
     primeira variação convida a próxima. O gate compara byte a byte. */
  it('nenhuma peça reescreve o selo por conta própria', () => {
    if (arquivos.length === 0) return;
    const seloDe = (texto: string) => texto.slice(0, texto.indexOf('*/') + 3);
    const referencia = seloDe(readFileSync(join(PECAS, '_modelo.js'), 'utf8'));
    expect(referencia.startsWith(ASSINATURA)).toBe(true);

    const divergentes = arquivos.filter((nome) => seloDe(readFileSync(join(PECAS, nome), 'utf8')) !== referencia);
    expect(divergentes, `estas peças têm um selo diferente do de _modelo.js: ${divergentes.join(', ')}`).toEqual([]);
  });
});

describe('o README explica o selo', () => {
  /* O selo aponta para o README; se a seção sumir, o aviso vira referência
     quebrada e o leitor fica sem o texto longo. */
  it('a seção "Peças são exemplos" existe e diz que nada ali é homologado', () => {
    const readme = readFileSync(resolve(AQUI, '../../README.md'), 'utf8');
    expect(readme).toContain('## Peças são exemplos');
    expect(readme).toContain('Nenhuma peça deste repositório é homologada');
    /* A seção precisa dizer o que fazer quando a peça atrapalha o núcleo —
       sem isso ela avisa e não orienta. */
    expect(comoFrase(readme)).toContain('ela nunca foi o contrato');
  });
});
