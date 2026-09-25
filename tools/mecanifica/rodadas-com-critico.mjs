/* rodadas-com-critico.mjs — as rodadas entre quem produz e o crítico gravadas
 * em disco, com a regra do módulo `contorno-da-imagem`: nota 9 fecha, abaixo
 * volta, até três rodadas, e depois a pessoa decide. Servem à separação das
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

export function registrarRodada(pasta, { campo, julgado }, veredito) {
  const rodadas = lerRodadas(pasta);
  const decisao = proximaAcao(rodadas);
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
  const decisao = proximaAcao(lerRodadas(pasta));
  if (decisao.acao !== 'humano') throw new Error(`nova série só depois da decisão humana; a ação agora é ${decisao.acao}.`);
  const numero = readdirSync(pasta).filter((n) => /^serie-\d+$/.test(n)).length + 1;
  const destino = join(pasta, `serie-${String(numero).padStart(2, '0')}`);
  mkdirSync(destino);
  for (const n of readdirSync(pasta).filter((x) => /^rodada-\d+\.json$/.test(x))) renameSync(join(pasta, n), join(destino, n));
  writeFileSync(join(destino, 'decisao.json'), `${JSON.stringify({ por: String(por).trim(), acao: 'nova-serie' }, null, 1)}\n`);
  return destino;
}
