/* rodadas-com-critico.mjs — as rodadas entre quem produz e o crítico gravadas
 * em disco, com a regra do módulo `contorno-da-imagem`: nota 9 fecha, abaixo
 * volta, até três rodadas, e depois a pessoa decide. Servem a mapear as
 * partes (pasta `<imagem>.regioes.rodadas/`) e à prancha
 * (`<imagem>.prancha.rodadas/`). */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validarRodada, proximaAcao } from '../../modulos/contorno-da-imagem/src/index.js';

export function lerRodadas(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).filter((n) => /^rodada-\d+\.json$/.test(n)).sort()
    .map((n) => JSON.parse(readFileSync(join(pasta, n), 'utf8')));
}

export function lerAceite(pasta) {
  const arquivo = join(pasta, 'aceite.json');
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : null;
}

export const acaoDaPasta = (pasta) => proximaAcao(lerRodadas(pasta), lerAceite(pasta));

/* Aceite humano: só a pessoa fecha uma série com defeito aberto, e o faz por
   escrito. Grava `aceite.json` com quem, quando, a última nota, os defeitos
   abertos do último veredito e as pendências. Vale também sobre série que já
   fechou com nota 9, para registrar o que a pessoa reabriu. Um aceite por
   série; outro exige `--nova-serie`. */
export function aceitar(pasta, { por, pendencias = '', quando = new Date().toISOString() } = {}) {
  if (!por || !String(por).trim()) throw new Error('aceite humano exige --por="<quem, data: motivo>".');
  const rodadas = lerRodadas(pasta);
  if (!rodadas.length) throw new Error('aceite humano exige ao menos uma rodada registrada.');
  if (lerAceite(pasta)) throw new Error('esta série já tem aceite; outro só depois de --nova-serie.');
  const ultima = rodadas.at(-1);
  const aceite = {
    por: String(por).trim(), quando, rodada: ultima.numero, nota: ultima.veredito.nota,
    defeitos: ultima.veredito.defeitos, pendencias: String(pendencias).trim(),
  };
  const arquivo = join(pasta, 'aceite.json');
  writeFileSync(arquivo, `${JSON.stringify(aceite, null, 1)}\n`);
  return { aceite, arquivo, proxima: proximaAcao(rodadas, aceite) };
}

export function registrarRodada(pasta, { campo, julgado }, veredito) {
  const rodadas = lerRodadas(pasta);
  const decisao = proximaAcao(rodadas, lerAceite(pasta));
  if (decisao.acao !== 'desenhar') throw new Error(`não cabe rodada nova: ${decisao.acao} — ${decisao.motivo}`);
  const rodada = validarRodada({ numero: rodadas.length + 1, [campo]: julgado, veredito });
  mkdirSync(pasta, { recursive: true });
  const arquivo = join(pasta, `rodada-${String(rodada.numero).padStart(2, '0')}.json`);
  writeFileSync(arquivo, `${JSON.stringify(rodada, null, 1)}\n`);
  return { rodada, arquivo, proxima: proximaAcao([...rodadas, rodada]) };
}

/* Só depois da decisão humana: as rodadas vão para `serie-NN/`, com quem
   autorizou, e a contagem recomeça. */
export function novaSerie(pasta, por) {
  if (!por || !String(por).trim()) throw new Error('nova série exige --por com quem decidiu.');
  const aceite = lerAceite(pasta);
  const decisao = proximaAcao(lerRodadas(pasta));
  if (decisao.acao !== 'humano' && !aceite) throw new Error(`nova série só depois da decisão humana ou de um aceite; a ação agora é ${decisao.acao}.`);
  const numero = readdirSync(pasta).filter((n) => /^serie-\d+$/.test(n)).length + 1;
  const destino = join(pasta, `serie-${String(numero).padStart(2, '0')}`);
  mkdirSync(destino);
  for (const n of readdirSync(pasta).filter((x) => /^rodada-\d+\.json$/.test(x))) renameSync(join(pasta, n), join(destino, n));
  if (aceite) renameSync(join(pasta, 'aceite.json'), join(destino, 'aceite.json'));
  writeFileSync(join(destino, 'decisao.json'), `${JSON.stringify({ por: String(por).trim(), acao: 'nova-serie' }, null, 1)}\n`);
  return destino;
}
