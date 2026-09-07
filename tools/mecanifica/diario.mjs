/* diario.mjs — registra o que as ferramentas do laço fizeram, sem pedir nada a
 * quem as usa.
 *
 * A pergunta que originou isto: onde a IA gasta tempo e onde ela emperra. A
 * resposta óbvia seria pedir que ela relate — e é a errada por dois motivos.
 * Primeiro, relato depende de lembrar, e o que se esquece de registrar é
 * justamente a rodada que correu mal. Segundo, pedir relato é acrescentar
 * ritual: mais uma coisa para fazer entre olhar a peça e corrigi-la.
 *
 * Então o instrumento mede a FERRAMENTA, nunca o agente. Cada CLI do laço grava
 * uma linha quando termina, com o que ela já sabia: o que rodou, contra o quê,
 * quanto demorou, se saiu com erro, o que prometeu produzir e o que produziu de
 * fato. Nada disso exige colaboração de quem chamou.
 *
 * A UNIDADE é a rodada, não a tarefa. Uma tarefa vai de "modele um machado" a
 * "está bom"; uma rodada vai de uma gravação da receita até a próxima. Tarefa
 * não se compara entre objetos — modelar cadeira e modelar prensa são trabalhos
 * diferentes —, mas rodada se compara: em toda elas alguém mexeu na receita e
 * foi conferir o que saiu. Por isso a linha carrega a ASSINATURA do arquivo da
 * receita (mtime + tamanho): quem lê o diário agrupa por assinatura e obtém as
 * rodadas sem que ninguém tenha precisado declarar onde uma começa.
 *
 * O que este diário NÃO faz, de propósito: não conta token, não pontua modelo,
 * não julga qualidade. Isso mora no harness, não no repositório, e uma métrica
 * de qualidade do agente dentro da ferramenta que ele usa enviesa o trabalho na
 * direção da métrica.
 *
 * Desligar: `MECANIFICA_DIARIO=0`. Nenhum resultado muda — o diário nunca
 * escreve em stdout, nunca altera código de saída e engole os próprios erros.
 * Instrumento que derruba a ferramenta medida não é instrumento.
 */
import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/* Destino configurável pelo mesmo motivo que a sessão da bancada ganhou um:
   teste que exercita o instrumento não pode escrever no diário de quem está
   trabalhando. Poluir o registro com linhas de fixture estraga exatamente a
   leitura que ele existe para dar. */
export function caminhoDoDiario() {
  return process.env.MECANIFICA_DIARIO_ARQUIVO
    ? resolve(process.env.MECANIFICA_DIARIO_ARQUIVO)
    : resolve(REPO, '.diario/oficina.jsonl');
}

export const CAMINHO_DIARIO = caminhoDoDiario();

function ligado() {
  if (process.env.MECANIFICA_DIARIO === '0') return false;
  /* Sob teste, calado por padrão.
   *
   * A suíte roda as CLIs de verdade — inclusive as fixtures que existem
   * justamente para FALHAR —, e cada uma delas gravava no diário de quem está
   * trabalhando. Medido: depois de um `npm test`, o diário acusava três recusas
   * do motor e seis erros de uso que ninguém tinha cometido. Um instrumento que
   * enche o próprio registro com ensaio mede o ensaio, não o trabalho.
   *
   * É o mesmo defeito que a sessão da bancada tinha, pelo mesmo motivo: estado
   * global de trabalho escrito por teste. Quem quiser exercitar a gravação passa
   * um `destino` explícito, e aí o silêncio não vale. */
  if (process.env.VITEST) return false;
  return true;
}

/* Assinatura do arquivo da receita: é o que separa uma rodada da seguinte sem
   ninguém precisar declarar. Arquivo ausente devolve null — comando que não fala
   de uma receita (um gate, por exemplo) simplesmente não tem rodada. */
function assinatura(caminhoAbsoluto) {
  try {
    const st = statSync(caminhoAbsoluto);
    return `${st.mtimeMs}:${st.size}`;
  } catch {
    return null;
  }
}

function relativoAoRepo(caminho) {
  try {
    if (!caminho) return null;
    const abs = resolve(REPO, caminho);
    const rel = relative(REPO, abs).replace(/\\/g, '/');
    return rel.startsWith('..') ? caminho : rel;
  } catch {
    return caminho ?? null;
  }
}

/* Abre um registro e devolve a função que o fecha. A duração sai daqui e não de
   quem chama, para nenhuma CLI precisar lembrar de cronometrar. */
export function iniciarRegistro(comando, alvo, { destino = null } = {}) {
  const inicio = Date.now();
  /* O alvo chega como a pessoa (ou a IA) digitou: nome curto, caminho relativo,
     nome de máquina. Resolver aqui é o que faz `cadeira-de-madeira` e
     `prototipos/procedural/v3/pecas/cadeira-de-madeira.js` virarem a MESMA
     rodada no diário — sem isso, o mesmo trabalho apareceria como dois, e a
     assinatura da receita sairia nula justamente na forma que a IA mais usa. */
  let alvoAbsoluto = null;
  try {
    alvoAbsoluto = alvo ? resolverCaminhoReceita(alvo, { raiz: REPO }) : null;
  } catch {
    alvoAbsoluto = null;
  }
  const alvoRelativo = alvoAbsoluto ? relativoAoRepo(alvoAbsoluto) : relativoAoRepo(alvo);

  /* `prometeu` é o que a ferramenta anunciou que ia gerar; `produziu` é o que
     está no disco quando ela termina. A diferença entre os dois é o desperdício
     silencioso — comando que sai com código 0 sem entregar o artefato — e ele é
     caríssimo de achar à mão. `olhar-bancada` já saiu 0 sem desenhar nada, e
     essa foi a falha de 63 s por tentativa que abriu este plano. Por isso a
     conferência mora AQUI, e não em quem chama: quem chama já acha que
     entregou. */
  return function fechar({ codigo = 0, medidas = null, prometeu = [], erro = null } = {}) {
    /* Desligado sai ANTES de tocar o disco: instrumento desligado não pode nem
       custar as chamadas de `stat` que ele faria ligado. Um `destino` explícito
       é sempre intenção de gravar — é como o teste do próprio diário escreve. */
    if (!destino && !ligado()) return;
    const prometidos = prometeu.map((p) => relativoAoRepo(p)).filter(Boolean);
    const produzidos = prometidos.filter((p) => existsSync(resolve(REPO, p)));
    try {
      const linha = {
        quando: new Date().toISOString(),
        comando,
        alvo: alvoRelativo,
        /* Antes de fechar, porque a rodada é o estado da receita que ESTE
           comando observou; se algo a reescrever depois, é outra rodada. */
        receita: alvoAbsoluto ? assinatura(alvoAbsoluto) : null,
        duracaoMs: Date.now() - inicio,
        codigo,
        /* A promessa contra o fato: comando que sai 0 e não produz o artefato
           que anuncia é desperdício silencioso, e é o mais caro de achar à mão. */
        prometeu: prometidos,
        produziu: produzidos,
        cumpriu: prometidos.length === produzidos.length,
        medidas,
        erro: erro ? String(erro).slice(0, 300) : null,
      };
      /* Resolvido AGORA, não no carregamento do módulo: o destino pode vir do
         ambiente ou do chamador, e uma constante congelada no import ignoraria
         os dois — foi exatamente o que fez o teste escrever no diário real. */
      const arquivo = destino ?? caminhoDoDiario();
      mkdirSync(dirname(arquivo), { recursive: true });
      appendFileSync(arquivo, `${JSON.stringify(linha)}\n`, 'utf8');
    } catch {
      /* Diário é observação. Se ele falhar, o trabalho segue: derrubar a
         ferramenta para registrar que ela rodou seria trocar o fim pelo meio. */
    }
  };
}

/* Açúcar para as CLIs cujo corpo já devolve `{ codigo, ... }`: evita repetir o
   try/finally em quatro arquivos e garante que uma exceção também vire linha —
   a rodada que estourou é a que mais interessa. */
export async function comDiario(comando, alvo, corpo) {
  const fechar = iniciarRegistro(comando, alvo);
  try {
    const resultado = await corpo();
    fechar({
      codigo: resultado?.codigo ?? 0,
      medidas: resultado?.medidasDoDiario ?? null,
      prometeu: resultado?.artefatosDoDiario ?? [],
    });
    return resultado;
  } catch (erro) {
    fechar({ codigo: 1, erro: erro?.message ?? erro });
    throw erro;
  }
}
