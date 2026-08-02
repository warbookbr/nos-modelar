#!/usr/bin/env node
/* exportar.mjs — a linha de comando do A-60.

     npm run exportar          grava as peças publicadas em pecas-resolvidas/
     npm run exportar:check    reprova se algum arquivo estiver desatualizado

   O `:check` existe para o CI. Ele é o único ponto do repositório que percebe
   a peça ter mudado sem o arquivo ter sido gerado de novo — o defeito mora
   entre este repositório e o do produto, e nenhum dos dois lados o vê sozinho. */
import { relative } from 'node:path';
import { conferirPublicadas, gravarPublicadas, DESTINO, PUBLICADAS } from './exportar-peca.mjs';

const args = process.argv.slice(2);
const conferir = args.includes('--check');
const nomes = args.filter((a) => !a.startsWith('--'));

/* A publicação é um CONJUNTO ATÔMICO. O manifesto descreve todas as peças que
   atravessam para o outro repositório; aceitar um nome posicional regravava o
   manifesto com um subconjunto e deixava a pasta real deliberadamente
   inconsistente. Quando houver necessidade medida de publicação parcial, ela
   precisa preservar o manifesto inteiro e ganhar contrato próprio. */
if (nomes.length > 0) {
  console.error(
    `exportar: publicação parcial não é suportada (recebi: ${nomes.join(', ')}). `
    + 'Rode sem nomes para gravar ou conferir o conjunto PUBLICADAS inteiro.',
  );
  process.exit(2);
}
const alvo = PUBLICADAS;

const curto = (p) => relative(process.cwd(), p).replace(/\\/g, '/');

if (conferir) {
  const problemas = await conferirPublicadas(alvo);
  if (problemas.length === 0) {
    console.log(`exportar:check ok — ${alvo.length} peça(s) publicada(s) em dia com a receita`);
    process.exit(0);
  }
  console.error(`exportar:check FALHOU — ${problemas.length} peça(s) fora de dia:`);
  for (const p of problemas) console.error(`  ${p.nome}: ${p.motivo}`);
  process.exit(1);
}

const feitas = await gravarPublicadas(alvo);
console.log(`exportar — ${feitas.length} peça(s) gravada(s) em ${curto(DESTINO)}/`);
for (const f of feitas) console.log(`  ${f.nome.padEnd(24)} ${f.bytes} bytes`);
