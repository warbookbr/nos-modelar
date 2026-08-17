/* capturar-montagem.mjs — serviço importável de vistas de montagem em memória. */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const VISTAS_MONTAGEM = Object.freeze(['isometrica', 'frontal', 'direita', 'superior']);

class ErroCapturaMontagem extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.name = 'ErroCapturaMontagem';
    this.codigo = codigo;
  }
}

const prefixo = (a, b) => a.length <= b.length && a.every((segmento, indice) => segmento === b[indice]);

function validarCaminho(caminho) {
  if (!Array.isArray(caminho) || caminho.some((segmento) => typeof segmento !== 'string' || !segmento)) {
    throw new ErroCapturaMontagem('caminho-invalido', 'caminho precisa ser uma lista de IDs semânticos não vazios.');
  }
  return caminho.slice();
}

export function serializarMontagemVisual(montagem, caminho = []) {
  if (!montagem?.id || !Array.isArray(montagem.instancias)) {
    throw new ErroCapturaMontagem('montagem-invalida', 'montagem resolvida é obrigatória.');
  }
  const foco = validarCaminho(caminho);
  let pecas = 0;
  const serializar = (atual) => ({
    id: atual.id,
    instancias: atual.instancias
      .filter((instancia) => foco.length === 0 || prefixo(foco, instancia.caminho) || prefixo(instancia.caminho, foco))
      .map((instancia) => {
        if (instancia.alvo.tipo === 'montagem') {
          return {
            id: instancia.id,
            caminho: instancia.caminho.slice(),
            alvo: { ...instancia.alvo },
            poseMundo: instancia.poseMundo,
            montagem: serializar(instancia.montagem),
          };
        }
        pecas += 1;
        return {
          id: instancia.id,
          caminho: instancia.caminho.slice(),
          alvo: { ...instancia.alvo },
          poseMundo: instancia.poseMundo,
          definicao: {
            neutro: {
              ...instancia.definicao.neutro,
              V: [...instancia.definicao.neutro.V],
              F: [...instancia.definicao.neutro.F],
              portas: [...instancia.definicao.neutro.portas],
            },
          },
        };
      }),
  });
  const dados = serializar(montagem);
  if (foco.length > 0 && pecas === 0) {
    throw new ErroCapturaMontagem('caminho-ausente', 'o caminho semântico não encontrou peça visível.');
  }
  return dados;
}

function falha(erro) {
  const conhecida = erro instanceof ErroCapturaMontagem;
  return {
    ok: false,
    codigo: conhecida && ['caminho-invalido', 'caminho-ausente', 'vista-invalida'].includes(erro.codigo) ? 2 : 1,
    erro: {
      categoria: conhecida ? 'uso' : 'execucao',
      codigo: erro?.codigo ?? 'falha-captura-montagem',
      mensagem: erro?.message ?? 'A captura de montagem falhou.',
    },
  };
}

async function fechar(instancia) {
  try { await instancia?.close(); } catch { /* fechamento é melhor esforço */ }
}

export async function capturarMontagem({
  montagem,
  caminho = [],
  vistas = ['isometrica', 'direita'],
  largura = 1280,
  espera = 100,
  timeoutMs = 45_000,
  dependencias = {},
} = {}) {
  let vite;
  let browser;
  let temporizador;
  let expirou = false;
  try {
    const dados = serializarMontagemVisual(montagem, caminho);
    if (!Array.isArray(vistas) || vistas.length === 0 || vistas.some((vista) => !VISTAS_MONTAGEM.includes(vista))) {
      throw new ErroCapturaMontagem('vista-invalida', `vistas aceitas: ${VISTAS_MONTAGEM.join(', ')}.`);
    }
    if (new Set(vistas).size !== vistas.length) {
      throw new ErroCapturaMontagem('vista-invalida', 'não repita vistas na mesma captura.');
    }
    if (!Number.isSafeInteger(largura) || largura < 640 || largura > 2560) {
      throw new ErroCapturaMontagem('captura-invalida', 'largura precisa ser inteiro entre 640 e 2560.');
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new ErroCapturaMontagem('captura-invalida', 'timeoutMs precisa ser número positivo.');
    }
    temporizador = setTimeout(() => {
      expirou = true;
      void fechar(browser);
      void fechar(vite);
    }, timeoutMs);
    const garantirPrazo = () => {
      if (expirou) throw new ErroCapturaMontagem('tempo-esgotado', `a captura excedeu ${timeoutMs} ms.`);
    };
    const criarServidor = dependencias.criarServidor
      ?? (async (...args) => (await import('vite')).createServer(...args));
    vite = await criarServidor({
      root: REPO,
      configFile: join(REPO, 'vite.config.js'),
      server: { host: '127.0.0.1', port: 0 },
      logLevel: 'error',
    });
    await vite.listen();
    garantirPrazo();
    const carregarPlaywright = dependencias.carregarPlaywright
      ?? (async () => (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default);
    const playwright = await carregarPlaywright();
    browser = await playwright.chromium.launch({
      args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    garantirPrazo();
    const altura = Math.round(largura * 9 / 16);
    const page = await browser.newPage({ viewport: { width: largura, height: altura } });
    const errosPagina = [];
    page.on('pageerror', (erro) => errosPagina.push(erro.message));
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') errosPagina.push(mensagem.text());
    });
    const porta = vite.httpServer.address().port;
    await page.goto(`http://127.0.0.1:${porta}/nos-mecanifica/tools/mecanifica/visor-montagem.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__mecanificaVisorMontagem === 'function');
    garantirPrazo();
    const capturas = [];
    for (const vista of vistas) {
      const metadados = await page.evaluate(([entrada, nome]) => window.__mecanificaVisorMontagem(entrada, nome), [dados, vista]);
      if (espera > 0) await page.waitForTimeout(espera);
      garantirPrazo();
      const dadosPng = await page.screenshot({ type: 'png' });
      capturas.push({
        nome: vista,
        mimeType: 'image/png',
        largura,
        altura,
        dados: Buffer.from(dadosPng),
        instancias: metadados.instancias,
        enquadramento: metadados.enquadramento,
      });
    }
    if (errosPagina.length > 0) throw new ErroCapturaMontagem('falha-visor', 'o visor privado relatou erro durante a captura.');
    return {
      ok: true,
      codigo: 0,
      resultado: {
        formato: 'mecanifica.vistas-montagem',
        versao: 1,
        id: montagem.id,
        caminho: caminho.slice(),
        capturas,
      },
    };
  } catch (erro) {
    if (expirou && !(erro instanceof ErroCapturaMontagem)) {
      return falha(new ErroCapturaMontagem('tempo-esgotado', `a captura excedeu ${timeoutMs} ms.`));
    }
    return falha(erro);
  } finally {
    clearTimeout(temporizador);
    await fechar(browser);
    await fechar(vite);
  }
}
