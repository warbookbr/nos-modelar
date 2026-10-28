/* reduzir-em-paralelo.mjs — `reduzirPorMedia` numa thread à parte, para a captura seguinte não esperar a redução da anterior.
 *
 * Reduzir o PNG de uma captura (decodificar, tirar a média de cada bloco e codificar de novo) leva de 0,3 a 0,7 s de uma só thread, e
 * a `vistas:critica` faz 51 por peça. Enquanto o Node reduz, o navegador, que é outro processo, fica parado esperando a próxima
 * ordem. Aqui a mesma função, sem nenhuma mudança, roda numa thread e devolve os mesmos bytes; quem chama segue para a próxima
 * vista e espera as promessas só no fim. A thread é uma por processo, sobe na primeira chamada e não segura o processo aberto. */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { reduzirPorMedia } from './capturar-montagem.mjs';

if (!isMainThread) {
  parentPort.on('message', ({ id, dados }) => {
    try {
      const reduzido = reduzirPorMedia(Buffer.from(dados.buffer, dados.byteOffset, dados.byteLength));
      parentPort.postMessage({ id, dados: new Uint8Array(reduzido.buffer, reduzido.byteOffset, reduzido.byteLength).slice() });
    } catch (erro) {
      parentPort.postMessage({ id, erro: erro?.message ?? String(erro) });
    }
  });
}

let trabalhador = null;
let proximoId = 0;
const pendentes = new Map();

function falharTodas(erro) {
  for (const { rejeitar } of pendentes.values()) rejeitar(erro);
  pendentes.clear();
  trabalhador = null;
}

function abrir() {
  const novo = new Worker(new URL(import.meta.url));
  novo.on('message', ({ id, dados, erro }) => {
    const espera = pendentes.get(id);
    if (!espera) return;
    pendentes.delete(id);
    if (erro) espera.rejeitar(new Error(erro));
    else espera.resolver(Buffer.from(dados.buffer, dados.byteOffset, dados.byteLength));
  });
  novo.on('error', falharTodas);
  novo.on('exit', () => falharTodas(new Error('a thread que reduz as imagens terminou antes de responder.')));
  /* sem isto a thread, parada à espera de mensagem, seguraria o processo aberto depois da última captura */
  novo.unref();
  return novo;
}

/** O mesmo que `reduzirPorMedia(dadosPng)`, numa thread à parte; devolve uma promessa do PNG reduzido. */
export function reduzirEmParalelo(dadosPng) {
  trabalhador ??= abrir();
  const id = proximoId++;
  return new Promise((resolver, rejeitar) => {
    pendentes.set(id, { resolver, rejeitar });
    const copia = new Uint8Array(dadosPng.buffer, dadosPng.byteOffset, dadosPng.byteLength).slice();
    trabalhador.postMessage({ id, dados: copia }, [copia.buffer]);
  });
}
