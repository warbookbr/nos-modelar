/* capturar-montagem.mjs — serviço importável de vistas de montagem em memória.
 *
 * O quadro enquadra o conjunto inteiro, ou, com `foco`, a caixa de uma instância (ou de uma submontagem, pelo caminho dela) com uma
 * `folga` em volta e as outras peças ao redor. O conjunto inteiro faz a peça de uma etapa ocupar um décimo do quadro: o crítico leu
 * um degrau na junta do capô, e a deriva mais grossa do que é, olhando uma peça pequena demais. */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/* Montagens aceitam o mesmo conjunto ortográfico da bancada. A revisão
   canônica continua escolhendo quatro vistas; esta porta de inspeção precisa
   também alcançar verso, lado oposto e fundo de um sistema composto. */
export const VISTAS_MONTAGEM = Object.freeze([
  'isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior',
]);

/* A BORDA SUAVIZADA VEM DE RENDERIZAR EM DOBRO E REDUZIR, e não do `antialias: true` do renderizador. O Chromium sem tela, com
   `--use-gl=swiftshader`, aceita o pedido de MSAA e não o aplica: toda aresta inclinada saía com degrau de pixel, e o crítico apontava
   como serrilhado de geometria um defeito que a medida da malha já tinha descartado (resíduo da silhueta de 0,56 px a 2400 px e 0,60 px
   a 4800 px na empenagem do avião). A página abre com `deviceScaleFactor` igual a este fator, o renderizador desenha o buffer nessa
   escala (o tamanho CSS, que decide layout, enquadramento e leitura em pixel, não muda), e `reduzirPorMedia` devolve o PNG ao tamanho
   de antes tirando a média de cada bloco fator por fator, que é o mesmo que o MSAA faz com `fator` ao quadrado amostras por pixel. A
   média é feita nos valores já codificados, como a resolução do MSAA no buffer da tela. O filtro é próprio, e não o do `sharp`, porque
   o `sharp` não está declarado no `package.json` (chega só como dependência de outra) e o filtro padrão dele, o Lanczos, tem lóbulos
   negativos que escurecem e clareiam o entorno da aresta; o `pngjs` está declarado, e a média de bloco é exata e igual em toda máquina.
   Linhas de um pixel de largura do dispositivo (o arame e o contorno do par) saem com metade da tinta, porque passam a cobrir meio
   pixel da imagem final. */
export const FATOR_DE_AMOSTRAGEM = 2;

/** Reduz um PNG pela média de cada bloco `fator` por `fator`. Largura e altura saem divididas pelo fator (a divisão tem de ser exata). */
export function reduzirPorMedia(dadosPng, fator = FATOR_DE_AMOSTRAGEM) {
  if (!Number.isInteger(fator) || fator < 1) throw new RangeError('o fator de redução precisa ser inteiro, 1 ou mais.');
  if (fator === 1) return Buffer.from(dadosPng);
  const origem = PNG.sync.read(Buffer.from(dadosPng));
  if (origem.width % fator !== 0 || origem.height % fator !== 0) {
    throw new RangeError(`a captura de ${origem.width}x${origem.height} não divide por ${fator}.`);
  }
  const largura = origem.width / fator;
  const altura = origem.height / fator;
  const destino = new PNG({ width: largura, height: altura });
  const amostras = fator * fator;
  const soma = [0, 0, 0, 0];
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      soma.fill(0);
      for (let dy = 0; dy < fator; dy++) {
        let indice = (((y * fator + dy) * origem.width) + x * fator) * 4;
        for (let dx = 0; dx < fator; dx++, indice += 4) {
          soma[0] += origem.data[indice];
          soma[1] += origem.data[indice + 1];
          soma[2] += origem.data[indice + 2];
          soma[3] += origem.data[indice + 3];
        }
      }
      const saida = (y * largura + x) * 4;
      for (let canal = 0; canal < 4; canal++) destino.data[saida + canal] = Math.round(soma[canal] / amostras);
    }
  }
  return PNG.sync.write(destino);
}

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

/* O foco é o caminho semântico de uma instância (ou de uma submontagem): um id, ou a lista de ids do caminho. */
function validarFoco(foco) {
  if (foco === null || foco === undefined) return null;
  const caminho = typeof foco === 'string' ? [foco] : foco;
  if (!Array.isArray(caminho) || caminho.length === 0 || caminho.some((segmento) => typeof segmento !== 'string' || !segmento)) {
    throw new ErroCapturaMontagem('foco-invalido', 'foco precisa ser o id de uma instância ou a lista de ids do caminho dela, não vazios.');
  }
  return caminho.slice();
}

/* Os caminhos das peças que a captura leva ao visor, depois do filtro de `caminho`. */
function caminhosDasPecas(dados) {
  return dados.instancias.flatMap((instancia) => (instancia.montagem ? caminhosDasPecas(instancia.montagem) : [instancia.caminho]));
}

function falha(erro) {
  const conhecida = erro instanceof ErroCapturaMontagem;
  return {
    ok: false,
    codigo: conhecida && ['caminho-invalido', 'caminho-ausente', 'vista-invalida', 'foco-invalido', 'foco-ausente'].includes(erro.codigo) ? 2 : 1,
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
  foco = null,
  folga = 0.1,
  vistas = ['isometrica', 'direita'],
  projecao = 'perspectiva',
  largura = 1280,
  altura: alturaPedida = null,
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
    const focoDoQuadro = validarFoco(foco);
    if (focoDoQuadro && !caminhosDasPecas(dados).some((peca) => prefixo(focoDoQuadro, peca))) {
      throw new ErroCapturaMontagem('foco-ausente', `o foco '${focoDoQuadro.join('/')}' não encontrou peça visível na montagem.`);
    }
    if (!Number.isFinite(folga) || folga < 0 || folga > 2) {
      throw new ErroCapturaMontagem('captura-invalida', 'folga precisa ser número entre 0 e 2 (fração do tamanho da peça, de cada lado).');
    }
    if (!Array.isArray(vistas) || vistas.length === 0 || vistas.some((vista) => !VISTAS_MONTAGEM.includes(vista))) {
      throw new ErroCapturaMontagem('vista-invalida', `vistas aceitas: ${VISTAS_MONTAGEM.join(', ')}.`);
    }
    if (new Set(vistas).size !== vistas.length) {
      throw new ErroCapturaMontagem('vista-invalida', 'não repita vistas na mesma captura.');
    }
    if (!Number.isSafeInteger(largura) || largura < 640 || largura > 2560) {
      throw new ErroCapturaMontagem('captura-invalida', 'largura precisa ser inteiro entre 640 e 2560.');
    }
    if (alturaPedida !== null && (!Number.isSafeInteger(alturaPedida) || alturaPedida < 360 || alturaPedida > 2560)) {
      throw new ErroCapturaMontagem('captura-invalida', 'altura precisa ser inteiro entre 360 e 2560.');
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
    const altura = alturaPedida ?? Math.round(largura * 9 / 16);
    const page = await browser.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM });
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
    /* A montagem vai ao visor como texto JSON, uma vez serializada: o Playwright serializa cada número de um objeto grande, e o
       avião até a deriva (centenas de milhares de números) levava segundos por vista, o que estourava o prazo das seis vistas. */
    const texto = JSON.stringify(dados);
    for (const vista of vistas) {
      const metadados = await page.evaluate(
        ([entrada, nome, proj, quadro, margem]) => window.__mecanificaVisorMontagem(entrada, nome, proj, quadro, margem),
        [texto, vista, projecao, focoDoQuadro, folga],
      );
      if (espera > 0) await page.waitForTimeout(espera);
      garantirPrazo();
      const dadosPng = reduzirPorMedia(await page.screenshot({ type: 'png' }));
      capturas.push({
        nome: vista,
        mimeType: 'image/png',
        largura,
        altura,
        dados: dadosPng,
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
        foco: focoDoQuadro,
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
