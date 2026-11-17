/* armazem-em-pasta.mjs — o armazém em disco do cache por prefixo e a memória que o host em Node dá ao núcleo (plano do cache por passo,
 * fatia 4). Só roda em Node; o núcleo não importa este arquivo.
 *
 * A VERSÃO DO CÓDIGO é calculada uma vez, quando este módulo é importado, ao lado da importação do núcleo: é a versão do código que o
 * processo de fato carregou. O processo de vida longa (o servidor MCP, a captura da bancada que fica aberta) confere a versão do disco
 * a cada memória que pede; se o disco mudou depois da importação, a memória passa a só ler, porque o código que ele roda já não é o do
 * disco e o ponto que ele guardasse levaria a versão nova sem ser dela. A conta lê uns 130 arquivos e os dois pacotes, uns 60 ms.
 *
 * O armazém grava cada nome ao lado e renomeia (a leitura nunca vê um ponto pela metade), lista a pasta para a limpeza das versões
 * velhas e tranca o índice com um arquivo de trava criado de forma exclusiva, que leva o pid de quem a criou. Quem não a cria olha o dono:
 * se o processo dele não existe mais (`process.kill(pid, 0)`, que só testa a existência), a trava é tomada na hora; se existe, espera em
 * passos de 20 ms, até 1 s, e desiste (o cache é conveniência: quem não consegue a trava segue sem gravar, em vez de atrasar o comando).
 * A trava sem pid legível (criada e ainda sem o pid escrito, ou de outra versão desta ferramenta) só é tomada depois de 30 s. A tomada
 * renomeia a trava antes de apagá-la, e deixa uma corrida estreita entre dois que a tomam ao mesmo tempo; o custo dela é um ponto ou uma
 * entrada de índice perdidos, nunca um resultado diferente. */
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';
import { criarMemoriaEmArmazem, limparOutrasVersoes } from './memoria-em-armazem.js';
import { versaoDoCodigoNoDisco } from './versao-do-codigo.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
/* fora do controle de versão, como o `tmp/cache-de-medida/` das ferramentas de medida */
export const PASTA_DO_CACHE_POR_PREFIXO = join(RAIZ, 'tmp', 'cache-por-prefixo');
export const VERSAO_NA_IMPORTACAO = versaoDoCodigoNoDisco();

const ESPERA_DA_TRAVA_MS = 1_000;
const TRAVA_ABANDONADA_MS = 30_000;
const PASSO_DA_ESPERA_MS = 20;
/** O processo existe? `process.kill(pid, 0)` não envia sinal nenhum, só testa; sem permissão sobre o processo (EPERM) ele existe. */
const processoVive = (pid) => { try { process.kill(pid, 0); return true; } catch (erro) { return erro?.code === 'EPERM'; } };
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** O armazém numa pasta: `{ ler, gravar, apagar, listar, trancar }`. */
export function criarArmazemEmPasta(pasta = PASTA_DO_CACHE_POR_PREFIXO, { esperaDaTravaMs = ESPERA_DA_TRAVA_MS, travaAbandonadaMs = TRAVA_ABANDONADA_MS } = {}) {
  mkdirSync(pasta, { recursive: true });
  const caminho = (nome) => join(pasta, nome);
  return {
    pasta,
    ler(nome) { try { return readFileSync(caminho(nome)); } catch (erro) { if (erro?.code === 'ENOENT') return null; throw erro; } },
    gravar(nome, bytes) {
      const parcial = caminho(`${nome}.${process.pid}.parcial`);
      writeFileSync(parcial, bytes);
      renameSync(parcial, caminho(nome));
    },
    apagar(nome) { try { unlinkSync(caminho(nome)); } catch (erro) { if (erro?.code !== 'ENOENT') throw erro; } },
    listar() { try { return readdirSync(pasta); } catch { return []; } },
    /* há quantos ms o arquivo foi escrito pela última vez, ou null se ele não existe */
    idadeMs(nome) { try { return Date.now() - statSync(caminho(nome)).mtimeMs; } catch { return null; } },
    /* espera a trava, roda fn e solta a trava antes de voltar; sem a trava no prazo, lança, e a memória não grava */
    trancar(nome, fn) {
      const trava = caminho(`${nome}.trava`);
      const inicio = Date.now();
      let fd = null;
      while (fd === null) {
        try { fd = openSync(trava, 'wx'); writeSync(fd, String(process.pid)); } catch (erro) {
          if (fd !== null) { closeSync(fd); fd = null; rmSync(trava, { force: true }); throw erro; }
          if (erro?.code !== 'EEXIST') throw erro;
          try {
            const dono = Number.parseInt(readFileSync(trava, 'utf8'), 10);
            const semDono = Number.isInteger(dono) && dono > 0 ? !processoVive(dono) : Date.now() - statSync(trava).mtimeMs > travaAbandonadaMs;
            if (semDono) { const tomada = `${trava}.${process.pid}.tomada`; renameSync(trava, tomada); rmSync(tomada, { force: true }); continue; }
          } catch { continue; }
          if (Date.now() - inicio > esperaDaTravaMs) throw new Error(`cache por prefixo: a trava ${trava} não soltou em ${esperaDaTravaMs} ms`);
          dormir(PASSO_DA_ESPERA_MS);
        }
      }
      try { fn(); } finally { closeSync(fd); rmSync(trava, { force: true }); }
    },
  };
}

/**
 * A memória do cache por prefixo para uma receita (`rotulo`, o caminho do arquivo dela), no armazém da pasta. Se o código do disco
 * mudou desde a importação, a memória só lê; senão, a limpeza apaga antes o que é de outra versão. Devolve `{ memoria, versao,
 * somenteLeitura, limpos }`.
 */
export function memoriaDoHost({ rotulo, pasta = PASTA_DO_CACHE_POR_PREFIXO, versaoNoDisco = versaoDoCodigoNoDisco, ...opcoes }) {
  const armazem = criarArmazemEmPasta(pasta);
  const somenteLeitura = versaoNoDisco() !== VERSAO_NA_IMPORTACAO;
  const limpos = somenteLeitura ? 0 : limparOutrasVersoes(armazem, VERSAO_NA_IMPORTACAO);
  const memoria = criarMemoriaEmArmazem({
    armazem, serializar: serialize, desserializar: deserialize, desserializarDevolveCopia: true,
    versao: VERSAO_NA_IMPORTACAO, rotulo, somenteLeitura, ...opcoes,
  });
  return { memoria, versao: VERSAO_NA_IMPORTACAO, somenteLeitura, limpos };
}
