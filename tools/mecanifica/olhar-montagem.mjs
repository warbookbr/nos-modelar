#!/usr/bin/env node
/* olhar-montagem.mjs — CLI fina sobre captura importável de montagem. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { lerArgumentos } from './argumentos.mjs';
import { capturarMontagem } from './capturar-montagem.mjs';
import { criarDiretorioConfinado, verificarCaminhoConfinado } from './caminho-confinado.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = lerArgumentos(process.argv.slice(2), {
  opcoes: ['arquivo', 'raiz-montagens', 'raiz-pecas', 'saida', 'vistas', 'caminho'],
  bandeiras: [],
});
const exigir = (nome) => {
  const valor = args.opcao(nome);
  if (!valor) throw new Error(`--${nome} é obrigatório.`);
  return valor;
};
const raizMontagens = resolve(exigir('raiz-montagens'));
const raizPecas = resolve(exigir('raiz-pecas'));
const arquivo = resolve(exigir('arquivo'));
const saida = resolve(exigir('saida'));
verificarCaminhoConfinado(arquivo, { raiz: raizMontagens });
verificarCaminhoConfinado(saida, { raiz: repo });
const ler = (caminho, raiz) => {
  verificarCaminhoConfinado(caminho, { raiz });
  return JSON.parse(readFileSync(caminho, 'utf8'));
};
const resolvida = await resolverMontagemPersistida(ler(arquivo, raizMontagens), {
  carregarMontagem: async (ref) => ler(resolve(raizMontagens, `${ref}.json`), raizMontagens),
  carregarPeca: async (ref) => ler(resolve(raizPecas, `${ref}.json`), raizPecas),
});
const caminho = args.opcao('caminho')?.split('/').filter(Boolean) ?? [];
const vistas = (args.opcao('vistas') ?? 'isometrica,direita').split(',').filter(Boolean);
const captura = await capturarMontagem({ montagem: resolvida, caminho, vistas });
if (!captura.ok) throw new Error(captura.erro.mensagem);
criarDiretorioConfinado(saida, { raiz: repo });
const destinos = captura.resultado.capturas.map((vista) => ({
  vista,
  destino: join(saida, `montagem-${resolvida.id}-${vista.nome}.png`),
}));
const relatorio = join(saida, `montagem-${resolvida.id}.json`);
for (const destino of [...destinos.map((item) => item.destino), relatorio]) {
  verificarCaminhoConfinado(destino, { raiz: repo });
  if (existsSync(destino)) throw new Error(`recusa sobrescrever '${destino}'.`);
}
const metadados = [];
for (const { vista, destino } of destinos) {
  writeFileSync(destino, vista.dados);
  metadados.push({
    nome: vista.nome,
    instancias: vista.instancias,
    enquadramento: vista.enquadramento,
    arquivo: relative(repo, destino),
  });
}
writeFileSync(relatorio, `${JSON.stringify({ formato: captura.resultado.formato, versao: 1, metadados }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ metadados }, null, 2)}\n`);
