/* vigia.mjs — o vigia contínuo: um processo em segundo plano que roda os gates que a edição afeta enquanto o trabalho acontece.
 *
 * Medido em 2026-10-27: a bateria antes do envio só começa a rodar no fim, e o seletor só poupa o que já passou. O vigia usa o
 * mesmo seletor e o mesmo `tmp/gates/verdes.json`: a cada gravação espera um instante de silêncio, tira a foto do repositório,
 * pergunta ao seletor o que precisa rodar e roda, um gate por vez, com prioridade baixa. O que passa é guardado como a bateria
 * guarda, então a bateria antes do envio, que continua sendo a prova, encontra tudo verde e sai em segundos. Um arquivo que muda no
 * meio da rodada cancela o gate em curso e a rodada recomeça depois do silêncio. Sem vigia, nada muda: a bateria confere a foto
 * contra o guardado e roda o que falta.
 *
 * Só entram os gates cujo verde o seletor sabe guardar (os testes e os que declaram o que leem): os outros rodariam a cada rodada
 * sem que a bateria ganhasse nada com isso. Os que dependem do `build` não rodam se ele falhou.
 *
 * Uso: `npm run gates:vigiar`. O resumo de cada rodada vai a `tmp/gates/vigia.json` e a uma linha no terminal. */
import { mkdirSync, watch, writeFileSync } from 'node:fs';
import { setPriority } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEPENDE_DE, GATES, rodarGate } from '../gates.mjs';
import { decidir, fotografar, gravarVerdes, lerVerdes, registroVerde } from './seletor.mjs';

export const ARQUIVO_DO_ESTADO = join('tmp', 'gates', 'vigia.json');
export const SILENCIO_PADRAO_MS = 1500;
const IGNORADOS = new Set(['node_modules', '.git', 'tmp', 'dist']);

/* Caminho relativo ao repositório que o vigia ignora: as pastas de saída e os repositórios de trabalho isolados. */
export function ignorado(caminho) {
  const partes = caminho.split(/[\\/]/).filter(Boolean);
  return partes.length === 0 || IGNORADOS.has(partes[0]) || (partes[0] === '.claude' && partes[1] === 'worktrees');
}

export const GATES_DO_VIGIA = GATES.filter((g) => registroVerde(g, {}) !== null);

export function criarVigia({
  raiz = '.',
  gates = GATES_DO_VIGIA,
  silencioMs = SILENCIO_PADRAO_MS,
  rodar = (gate, { testes, sinal }) => rodarGate(gate, { silencioso: true, testes, sinal }),
  aoTerminar = () => {},
} = {}) {
  let temporizador = null;
  let controle = null;
  let rodando = null;
  let rodadas = 0;
  let parado = false;

  const gravarEstado = (estado) => {
    const caminho = join(raiz, ARQUIVO_DO_ESTADO);
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, JSON.stringify(estado, null, 2));
  };

  async function rodada() {
    const numero = ++rodadas;
    const sinal = (controle = new AbortController()).signal;
    const foto = fotografar(raiz);
    const resumo = { rodada: numero, estado: 'rodando', inicio: new Date().toISOString(), rodaram: [], passaram: [], falharam: [], guardados: [], cancelada: false };
    gravarEstado(resumo);
    const falhos = new Set();
    for (const gate of gates) {
      if (sinal.aborted) break;
      if (DEPENDE_DE[gate] && falhos.has(DEPENDE_DE[gate])) continue;
      const decisao = decidir(gate, foto, lerVerdes(raiz));
      if (!decisao.rodar) { resumo.guardados.push(gate); continue; }
      resumo.rodaram.push(gate);
      const resultado = await rodar(gate, { testes: decisao.testes ?? null, sinal });
      if (sinal.aborted || resultado.cancelado) break;
      if (resultado.codigo === 0) {
        resumo.passaram.push(gate);
        const registro = registroVerde(gate, foto);
        if (registro) gravarVerdes(raiz, { ...lerVerdes(raiz), [gate]: registro });
      } else {
        falhos.add(gate);
        resumo.falharam.push({ gate, saida: resultado.arquivo ?? null });
      }
    }
    resumo.cancelada = sinal.aborted;
    resumo.estado = resumo.cancelada ? 'cancelada' : 'ocioso';
    resumo.fim = new Date().toISOString();
    gravarEstado(resumo);
    aoTerminar(resumo);
    return resumo;
  }

  function iniciar() {
    temporizador = null;
    if (parado) return;
    rodando = rodada().finally(() => { rodando = null; });
  }

  /* Uma gravação: cancela o que roda e reinicia a espera de silêncio. */
  function mudou(caminho = '') {
    if (parado || ignorado(caminho)) return;
    controle?.abort();
    clearTimeout(temporizador);
    /* A nova rodada só começa depois de a anterior ter largado os processos. */
    temporizador = setTimeout(() => { (rodando ?? Promise.resolve()).then(iniciar); }, silencioMs);
  }

  return {
    mudou,
    /* Resolve quando não há espera nem rodada pendente. */
    async ocioso() {
      for (;;) {
        if (temporizador) await new Promise((r) => { setTimeout(r, 10); });
        else if (rodando) await rodando;
        else return;
      }
    },
    parar() { parado = true; clearTimeout(temporizador); controle?.abort(); },
  };
}

export function linhaDaRodada(r) {
  if (r.cancelada) return `vigia — rodada ${r.rodada} cancelada por uma gravação (rodou: ${r.rodaram.join(', ') || 'nada'}).`;
  const falhas = r.falharam.length ? `; FALHARAM: ${r.falharam.map((f) => `${f.gate} (${f.saida ?? 'sem saída'})`).join(', ')}` : '';
  return `vigia — rodada ${r.rodada}: ${r.passaram.length}/${r.rodaram.length} passaram, ${r.guardados.length} guardados${falhas}.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  process.chdir(raiz);
  try { setPriority(0, 19); } catch { /* sem permissão para baixar a prioridade, segue na normal */ }
  const vigia = criarVigia({ raiz: '.', aoTerminar: (r) => console.log(linhaDaRodada(r)) });
  const olho = watch('.', { recursive: true }, (_evento, nome) => vigia.mudou(String(nome ?? '')));
  const sair = () => { olho.close(); vigia.parar(); process.exit(0); };
  process.on('SIGINT', sair);
  process.on('SIGTERM', sair);
  console.log('vigia — vigiando o repositório; uma rodada começa depois de 1,5 s de silêncio. Ctrl+C para sair.');
  vigia.mudou('inicio');
}
