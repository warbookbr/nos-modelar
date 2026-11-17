/* memoria-em-armazem.js — a memória de execução guardada fora do processo, para um comando recomeçar do estado que o comando anterior
 * deixou (plano do cache por passo, fatia 3).
 *
 * É o cache por PREFIXO: o estado depois do passo k fica sob a chave encadeada dos passos 0 a k e do que os rodeia (`chavesDosPrefixos`
 * de `memoria-de-execucao.js`), e uma execução recomeça do último ponto guardado cujo prefixo é o dela. Uma edição no passo j muda a
 * chave de j e de todos os seguintes, e de nenhum anterior, de modo que o recomeço vem sempre de antes de j e o resultado não depende de
 * saber o que cada passo lê. A leitura declarada (`leitura-declarada.js`) não entra aqui.
 *
 * Esta memória tem a mesma interface da de `criarMemoriaDeExecucao`, e o núcleo a usa sem saber onde ela guarda. Quem a cria dá:
 *   - `armazem`: `{ ler(nome) -> bytes | null, gravar(nome, bytes), apagar(nome) }`, o disco do host (o núcleo não toca em disco);
 *   - `serializar` e `desserializar`: a cópia do estado em bytes e de volta (no Node, `v8.serialize` e `v8.deserialize`, que copiam como
 *     o `structuredClone` da memória do processo);
 *   - `versao`: o texto que identifica o código do núcleo que gerou o estado (o host o tira do conteúdo dos arquivos do núcleo). Ela
 *     entra no nome de todo ponto e do índice, e o ponto lido confere a dele: estado de outra versão nunca é servido;
 *   - `rotulo`: o nome da receita (o caminho do arquivo), que separa o índice de uma receita do de outra. O ponto é pelo conteúdo e pode
 *     servir a outra receita com o mesmo prefixo, que tem por isso o mesmo estado;
 *   - `maximo`: quantos pontos o índice da receita mantém, os mais recentes; o mais velho sai do armazém;
 *   - `todoPasso`: guardar depois de cada passo, e `passosGuardados`: guardar só depois destes índices, para as provas.
 * O índice guarda a cadeia de chaves da última execução (`ultimaCadeia`), que o núcleo usa para escolher onde guardar o ponto seguinte.
 * Um erro do armazém ou da serialização não muda o resultado: o ponto não é guardado ou não é lido, e a execução segue inteira. */
import { sha256Hex } from '../sha256.js';

const FORMATO = 'mecanifica.ponto-de-execucao@1';

export function criarMemoriaEmArmazem({ armazem, serializar, desserializar, versao, rotulo, maximo = 4, todoPasso = false, passosGuardados = null }) {
  if (!armazem || typeof armazem.ler !== 'function' || typeof armazem.gravar !== 'function' || typeof armazem.apagar !== 'function') {
    throw new TypeError('memória em armazém: o armazém precisa de ler, gravar e apagar');
  }
  if (typeof serializar !== 'function' || typeof desserializar !== 'function') throw new TypeError('memória em armazém: serializar e desserializar são obrigatórios');
  if (typeof versao !== 'string' || !versao) throw new TypeError('memória em armazém: a versão do núcleo é obrigatória, um texto não vazio');
  if (typeof rotulo !== 'string' || !rotulo) throw new TypeError('memória em armazém: o rótulo da receita é obrigatório, um texto não vazio');
  const estatisticas = { guardados: 0, restaurados: 0, recusados: 0, lidos: 0, falhas: 0 };
  const nomeDoPonto = (chave) => `ponto-${sha256Hex(`${versao}\n${chave}`).slice(0, 40)}`;
  const nomeDoIndice = `indice-${sha256Hex(`${versao}\n${rotulo}`).slice(0, 40)}`;
  const lerIndice = () => {
    try {
      const bytes = armazem.ler(nomeDoIndice);
      const indice = bytes ? desserializar(bytes) : null;
      if (indice?.formato === FORMATO && indice.versao === versao && indice.rotulo === rotulo) return indice;
    } catch { estatisticas.falhas += 1; }
    return { formato: FORMATO, versao, rotulo, cadeia: null, pontos: [] };
  };
  const gravarIndice = (indice) => { try { armazem.gravar(nomeDoIndice, serializar(indice)); } catch { estatisticas.falhas += 1; } };
  return {
    estatisticas,
    todoPasso,
    passosGuardados: Array.isArray(passosGuardados) ? [...passosGuardados] : null,
    /* a cópia é a serialização, feita dentro de `guardar`; o estado lido é só desta execução */
    copiaPropria: true,
    get ultimaCadeia() { return lerIndice().cadeia; },
    set ultimaCadeia(cadeia) { const indice = lerIndice(); indice.cadeia = Array.isArray(cadeia) ? [...cadeia] : null; gravarIndice(indice); },
    get tamanho() { return lerIndice().pontos.length; },
    limpar() {
      const indice = lerIndice();
      for (const nome of indice.pontos) { try { armazem.apagar(nome); } catch { estatisticas.falhas += 1; } }
      indice.pontos = []; gravarIndice(indice);
    },
    /** @returns {{ passo: number, estado: object, proprio: true } | null} */
    buscar(chave) {
      let bytes = null;
      try { bytes = armazem.ler(nomeDoPonto(chave)); } catch { estatisticas.falhas += 1; return null; }
      if (!bytes) return null;
      try {
        const ponto = desserializar(bytes);
        if (ponto?.formato !== FORMATO || ponto.versao !== versao || ponto.chave !== chave) return null;
        estatisticas.lidos += 1;
        return { passo: ponto.passo, estado: ponto.estado, proprio: true };
      } catch { estatisticas.falhas += 1; return null; }
    },
    guardar(chave, passo, estado) {
      const nome = nomeDoPonto(chave);
      try { armazem.gravar(nome, serializar({ formato: FORMATO, versao, chave, passo, estado })); } catch { estatisticas.falhas += 1; return false; }
      estatisticas.guardados += 1;
      const indice = lerIndice();
      indice.pontos = [...indice.pontos.filter((n) => n !== nome), nome];
      while (indice.pontos.length > maximo) { const velho = indice.pontos.shift(); try { armazem.apagar(velho); } catch { estatisticas.falhas += 1; } }
      gravarIndice(indice);
      return true;
    },
  };
}
