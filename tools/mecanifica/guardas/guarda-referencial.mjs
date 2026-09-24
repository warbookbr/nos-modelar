#!/usr/bin/env node
/* guarda-referencial.mjs — confere que toda peça do acervo usa o MESMO
 * referencial e está apoiada acima do chão.
 *
 * POR QUE ELA EXISTE. Um braço robótico passou em tudo deitado no chão. Os seis
 * pontos declarados ficaram entre 0 e 2 mm do alvo, os cinco contatos se
 * tocavam, `guarda:acervo` deu ok, e a peça estava virada noventa graus. A
 * causa é que toda medida compara a peça contra a declaração da própria peça:
 * quando a declaração adota um referencial e o acervo adota outro, as duas
 * concordam entre si e discordam do mundo, e nenhuma régua percebe. Medida que
 * só se compara consigo mesma não tem como acusar isso.
 *
 * O ACERVO É Y PARA CIMA. Não por gosto: é o que a bancada desenha, é o que o
 * visor compatível espera e é o que a bicicleta já declarava antes de existir
 * qualquer outra peça. Convenção que vive só no exemplo mais antigo não
 * sobrevive à segunda peça, e não sobreviveu.
 *
 * DUAS CONFERÊNCIAS, E ELAS PEGAM COISAS DIFERENTES.
 *
 * A primeira é textual: `TOPO.origem` tem de existir e tem de dizer que y é o
 * eixo vertical. Ela reprova antes de existir geometria, que é onde o conserto
 * custa uma linha em vez de uma rodada inteira de modelagem.
 *
 * A segunda é geométrica: nada da peça pode ficar abaixo do chão. Ela não
 * exige que a peça ENCOSTE no chão, porque módulo de conjunto maior
 * legitimamente flutua — o quadro da bicicleta começa a 296 mm do solo, já que
 * quem toca o chão são as rodas, que são outra peça. Afundar, porém, nenhuma
 * peça do acervo tem motivo para fazer.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from '../importar-receita.mjs';
import { resolverCaminhoReceita } from '../resolver-caminho-receita.mjs';
import { DECLARACAO_DE_VAZIO, etapaQueEspera, pecasDoAcervo, vazioDeclarado } from './guarda-acervo.mjs';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

/* Tolerância do chão, em metro. Um micrômetro abaixo de zero é ruído de ponto
   flutuante acumulado numa rotação, e não peça afundada; um milímetro já é
   geometria que alguém escreveu. */
export const FOLGA_DO_CHAO = 1e-4;

const VERTICAL_DECLARADA = /\b([xyz])\s+para\s+cima\b/i;
export const EIXO_VERTICAL = 'y';

/* Quem é o eixo vertical segundo a própria peça. `null` quando ela não diz. */
export function verticalDeclarada(topo) {
  const origem = typeof topo?.origem === 'string' ? topo.origem : '';
  const achado = VERTICAL_DECLARADA.exec(origem);
  return achado ? achado[1].toLowerCase() : null;
}

/* O ponto mais baixo da peça no eixo vertical do acervo. */
export function fundoDaPeca(neutro, eixo = 1) {
  let fundo = Infinity;
  for (const v of neutro.V.values()) if (v[eixo] < fundo) fundo = v[eixo];
  return fundo;
}

export function primeiraEtapaOuSolta(peca, { raiz = ACERVO } = {}) {
  const [objeto, parte] = peca.split('/');
  if (!parte) return true;
  const arquivo = join(raiz, objeto, 'montagem.json');
  if (!existsSync(arquivo)) return true;
  const montagem = JSON.parse(readFileSync(arquivo, 'utf8'));
  const instancia = (montagem.instancias ?? []).find((item) => item.alvo?.ref === peca);
  if (!instancia || !(montagem.etapas ?? []).includes(instancia.id)) return true;
  return montagem.etapas[0] === instancia.id;
}

export async function conferirUmaPeca(peca, { raiz = REPO } = {}) {
  const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca, { raiz })));
  const declarada = verticalDeclarada(receita.TOPO);

  if (declarada === null) {
    return {
      peca,
      motivo: 'REFERENCIAL NÃO DECLARADO\n'
        + "  `TOPO.origem` não diz qual eixo aponta para cima, então nada confere se\n"
        + '  esta peça usa o mesmo referencial do resto do acervo. Escreva a origem e\n'
        + `  o sentido dos eixos, dizendo '${EIXO_VERTICAL} para cima'.`,
    };
  }
  if (declarada !== EIXO_VERTICAL) {
    return {
      peca,
      motivo: 'REFERENCIAL DIFERENTE DO ACERVO\n'
        + `  A peça declara '${declarada} para cima' e o acervo inteiro usa\n`
        + `  '${EIXO_VERTICAL} para cima', que é o que a bancada desenha. Uma peça virada\n`
        + '  passa em toda medida, porque cada régua compara a peça com a declaração\n'
        + '  dela mesma; só a comparação entre peças acusa.',
    };
  }

  /* Parte planejada que espera a etapa: o referencial declarado já foi
     conferido acima, e o chão só pode ser medido quando houver geometria. A
     dispensa é a mesma de `guarda:acervo`. */
  if (receita.PASSOS?.length === 0 && etapaQueEspera(peca)) return null;

  /* PARTE QUE SE ENCAIXA EM OUTRA NÃO TEM O CHÃO NA ORIGEM. Numa montagem, a
     origem de cada parte depois da primeira é o encaixe dela na parte de
     baixo, e não o chão: o tambor do ombro desce 15 mm abaixo da face do
     colar, à frente do anel, e reprovava aqui sem tocar em nada. O chão
     continua cobrado na peça solta e na primeira etapa de cada montagem, que
     é a que se apoia nele. */
  if (!primeiraEtapaOuSolta(peca)) return null;

  const { neutro } = executarReceita(receita);
  const fundo = fundoDaPeca(neutro);
  if (!Number.isFinite(fundo)) {
    return { peca, motivo: 'PEÇA SEM VÉRTICE\n  A receita não produziu geometria alguma.' };
  }
  if (fundo < -FOLGA_DO_CHAO) {
    return {
      peca,
      motivo: 'PEÇA ABAIXO DO CHÃO\n'
        + `  O ponto mais baixo está em ${(fundo * 1000).toFixed(1)} mm, abaixo do plano do chão.\n`
        + '  Peça pode flutuar, porque módulo de conjunto maior flutua de propósito,\n'
        + '  mas afundar não: quem toca o chão o toca em zero.',
    };
  }
  return null;
}

export async function conferirReferencial(pecas = pecasDoAcervo(ACERVO)) {
  const reprovadas = [];
  for (const peca of pecas) {
    try {
      const falha = await conferirUmaPeca(peca);
      if (falha) reprovadas.push(falha);
    } catch (erro) {
      reprovadas.push({ peca, motivo: `NÃO CONSEGUI LER A PEÇA\n  ${erro.message}` });
    }
  }
  return { pecas, reprovadas };
}

if (process.argv[1] && process.argv[1].endsWith('guarda-referencial.mjs')) {
  const { pecas, reprovadas } = await conferirReferencial();
  if (pecas.length === 0) {
    if (!vazioDeclarado()) {
      console.error('guarda:referencial — o acervo está vazio e nada foi conferido.\n'
        + `  Declare em '${DECLARACAO_DE_VAZIO}' se ficar sem peça é o estado pretendido.`);
      process.exit(1);
    }
    console.log(`guarda:referencial ok — acervo sem peça, declarado em ${DECLARACAO_DE_VAZIO}.`);
    process.exit(0);
  }
  for (const { peca, motivo } of reprovadas) {
    console.error(`guarda:referencial — ${peca} REPROVOU\n${motivo}\n`);
  }
  if (reprovadas.length) process.exit(1);
  console.log(`guarda:referencial ok — ${pecas.length} peça(s) no mesmo referencial: ${pecas.join(', ')}.`);
}
