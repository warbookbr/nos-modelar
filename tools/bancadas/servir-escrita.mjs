/* servir-escrita.mjs — o único caminho da bancada até o arquivo da receita.
 *
 * A bancada é página estática: no navegador ela lê a receita, executa e desenha,
 * mas não alcança o disco. Sem este atendente, arrastar um controle mudaria
 * apenas a sessão em memória, e o plano ativo exige que o arrasto grave um
 * número declarado NO ARQUIVO.
 *
 * Ele vive no servidor de desenvolvimento e não vai para a página publicada.
 * Isso não é limitação a contornar, é a verdade da situação: quem abre a
 * bancada publicada não tem o repositório para escrever nele, e ali os
 * controles seguem valendo como prévia.
 *
 * O atendente escreve SÓ dentro do acervo. Endereço que escapa da pasta, por
 * `..` ou por caminho absoluto, é recusado antes de qualquer leitura — um
 * atendente de escrita sem essa porta é um jeito de qualquer página aberta no
 * navegador reescrever arquivo da máquina. */

import { resolve, sep } from 'node:path';
import { escreverParametro } from '../../src/autoria/escrever-parametro.js';

const RAIZ_ACERVO = resolve(import.meta.dirname, '../../prototipos/procedural/v3/pecas');
const ROTA = '/api/parametro';

export function caminhoNoAcervo(peca) {
  if (typeof peca !== 'string' || peca.length === 0) return null;
  const absoluto = resolve(RAIZ_ACERVO, `${peca}.js`);
  return absoluto.startsWith(RAIZ_ACERVO + sep) ? absoluto : null;
}

async function lerCorpo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');
}

function responder(res, codigo, corpo) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(corpo));
}

export async function atenderEscrita(req, res) {
  let pedido;
  try {
    pedido = await lerCorpo(req);
  } catch {
    return responder(res, 400, { estado: 'falha-recuperavel', motivo: 'corpo não é JSON' });
  }

  const { peca, id, valor } = pedido;
  if (typeof peca !== 'string' || typeof id !== 'string') {
    return responder(res, 400, { estado: 'falha-recuperavel', motivo: 'informe peca e id' });
  }

  const arquivo = caminhoNoAcervo(peca);
  if (!arquivo) {
    return responder(res, 403, { estado: 'falha-recuperavel', motivo: `'${peca}' está fora do acervo` });
  }

  const resultado = await escreverParametro(arquivo, id, valor);
  return responder(res, resultado.estado === 'aplicado' ? 200 : 422, resultado);
}

/** Plugin do Vite: liga o atendente só no servidor de desenvolvimento. */
export function escritaDeParametro() {
  return {
    name: 'mecanifica-escrita-de-parametro',
    apply: 'serve',
    configureServer(servidor) {
      servidor.middlewares.use(ROTA, (req, res, proxima) => {
        if (req.method !== 'POST') return proxima();
        atenderEscrita(req, res).catch((erro) => responder(res, 500, {
          estado: 'falha-recuperavel', motivo: erro.message,
        }));
      });
    },
  };
}

export const ROTA_ESCRITA = ROTA;
