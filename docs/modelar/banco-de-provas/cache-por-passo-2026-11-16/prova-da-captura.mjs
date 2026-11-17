/* prova-da-captura.mjs — a captura da bancada com a página lendo o neutro que a ativação gravou é igual, pixel a pixel, à captura com a
 * página executando a receita (plano do cache por passo, fatia 4). Faz três capturas em memória, nas mesmas vistas: a de antes (a página
 * executa), a de agora (a página lê o neutro) e a de antes outra vez, que diz se a captura de antes já é a mesma entre duas rodadas.
 * Uso, da raiz: node --max-old-space-size=8192 <este arquivo> <peça> [--vistas=a,b]; imprime uma linha JSON com os pixels diferentes de
 * cada vista e o tempo de cada captura. */
import { loadavg } from 'node:os';
import { PNG } from 'pngjs';
import { olharBancada } from '../../../../tools/modelar/olhar-bancada.mjs';
import { ativarReceitaBancada } from '../../../../tools/modelar/ativar-bancada.mjs';

const [peca, ...resto] = process.argv.slice(2);
const vistas = (resto.find((a) => a.startsWith('--vistas=')) ?? '--vistas=isometrica,direita,superior').slice('--vistas='.length);
const capturar = async (estadoParaPagina) => {
  const t = performance.now();
  const r = await olharBancada({
    peca, vistas, capturarEmMemoria: true, auditoria: true, prazoDeCargaMs: 600_000,
    dependencias: { ativarReceitaBancada: (o) => ativarReceitaBancada({ ...o, estadoParaPagina }) },
  });
  if (!r?.ok) throw new Error(`a captura falhou: ${String(r?.erro?.message ?? r?.stderr ?? '').slice(0, 300)}`);
  return { s: Number(((performance.now() - t) / 1000).toFixed(1)), capturas: r.resultado?.capturas ?? r.capturas };
};
const diferentes = (a, b) => {
  const x = PNG.sync.read(Buffer.from(a.dados)), y = PNG.sync.read(Buffer.from(b.dados));
  if (x.width !== y.width || x.height !== y.height) return { tamanho: [x.width, x.height, y.width, y.height] };
  let n = 0;
  for (let k = 0; k < x.data.length; k += 4) if (x.data[k] !== y.data[k] || x.data[k + 1] !== y.data[k + 1] || x.data[k + 2] !== y.data[k + 2] || x.data[k + 3] !== y.data[k + 3]) n += 1;
  return n;
};
const carga = loadavg().map((v) => Number(v.toFixed(2)));
const antes = await capturar(false);
const agora = await capturar(true);
const antesDeNovo = await capturar(false);
const porVista = antes.capturas.map((c, i) => ({ vista: c.nome, agoraContraAntes: diferentes(c, agora.capturas[i]), antesContraAntes: diferentes(c, antesDeNovo.capturas[i]) }));
console.log(JSON.stringify({ peca, carga, segundos: { antes: antes.s, agora: agora.s, antesDeNovo: antesDeNovo.s }, porVista }));
process.exit(0);
