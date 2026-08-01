#!/usr/bin/env node
/* validar-pacote.mjs — porta fail-closed do marco 1. Lê, exige bytes canônicos
   e confere o alvo com a régua headless assim que a fonte canônica existir. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ErroDePacote, RAIZ_PACOTES, RAIZ_REPOSITORIO, alvoExiste, caminhoPacote, conferirBytesCanonicos, descreverAlvo, validarPacote,
} from './formato-pacote.mjs';

function uso(mensagem) {
  console.error(`validar:modelagem: ${mensagem}`);
  process.exit(2);
}
function ler(argv) {
  if (argv.length !== 1 || argv[0].startsWith('--')) uso('use: npm run validar:modelagem -- <pacote>.');
  return argv[0];
}
function json(arquivo, nome) {
  let texto;
  try { texto = readFileSync(arquivo, 'utf8'); } catch { throw new ErroDePacote(`${nome} não existe.`); }
  try { return { texto, valor: JSON.parse(texto) }; } catch (erro) {
    throw new ErroDePacote(`${nome} não contém JSON válido: ${erro.message}`);
  }
}

export async function validarPacoteNoDisco(id, {
  raizPacotes = RAIZ_PACOTES,
  raizRepositorio = RAIZ_REPOSITORIO,
} = {}) {
  const pasta = caminhoPacote(id, { raizPacotes });
  const briefing = json(join(pasta, 'briefing.json'), 'briefing.json');
  const referencias = json(join(pasta, 'referencias.json'), 'referencias.json');
  conferirBytesCanonicos(briefing.texto, briefing.valor, 'briefing.json');
  conferirBytesCanonicos(referencias.texto, referencias.valor, 'referencias.json');
  /* Primeiro valida o contrato sem importar a fonte: no modo criacao ela pode
     ainda não existir. Assim que a rota canônica aparece, a mesma porta passa a
     exigir descrição semanticamente íntegra e todas as partes declaradas. */
  const estrutural = validarPacote(briefing.valor, referencias.valor, { raizRepositorio });
  const deveDescrever = estrutural.modo === 'refinamento' || alvoExiste(estrutural.peca, { raizRepositorio });
  const alvo = deveDescrever ? await descreverAlvo(estrutural.peca, { raizRepositorio }) : null;
  const resultado = alvo
    ? validarPacote(briefing.valor, referencias.valor, { partesDisponiveis: alvo.partes, raizRepositorio })
    : estrutural;
  if (briefing.valor.id !== id) throw new ErroDePacote(`briefing.id '${briefing.valor.id}' diverge da pasta '${id}'.`);
  return { ...resultado, alvo };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const id = ler(process.argv.slice(2));
  try {
    const resultado = await validarPacoteNoDisco(id);
    const estadoAlvo = resultado.alvo
      ? `alvo ${resultado.peca}, ${resultado.partes.length} partes esperadas`
      : `criação pendente do alvo ${resultado.peca}, ${resultado.partes.length} partes declaradas`;
    console.log(`pacote válido: ${id} (${resultado.bytes} bytes, ${estadoAlvo})`);
  } catch (erro) {
    console.error(`validar:modelagem: ${erro.message}`);
    process.exit(erro instanceof ErroDePacote ? 1 : 1);
  }
}
