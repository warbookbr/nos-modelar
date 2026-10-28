/* ler-diario.mjs — lê o diário da oficina e responde onde o tempo foi e onde
 * o trabalho emperrou.
 *
 * O diário é uma linha por invocação; sozinho ele é dado bruto. Este leitor faz
 * as quatro perguntas que motivaram medir, e nenhuma delas exige comparar
 * objetos diferentes — modelar cadeira e modelar prensa são trabalhos distintos,
 * mas as perguntas valem igual nos dois:
 *
 *   1. ONDE VAI O TEMPO — soma de duração por comando. Não é a média que
 *      importa: é o total, porque um comando de 60 s chamado uma vez custa o
 *      mesmo que um de 1 s chamado sessenta.
 *   2. ONDE EMPERRA — o mesmo comando, no mesmo alvo, dentro da MESMA rodada
 *      (mesma assinatura de receita). Repetir sem a receita mudar entre as
 *      chamadas é sinal de que a resposta não bastou na primeira vez.
 *   3. O QUE FALHA — mensagens de erro por frequência. Mensagem que se repete
 *      entre sessões é defeito de ferramenta ou de documento, nunca do agente:
 *      quem tropeça duas vezes na mesma pedra não é distraído, a pedra é que
 *      está no caminho.
 *   4. DESPERDÍCIO SILENCIOSO — comando que saiu com código 0 e não entregou o
 *      artefato que prometeu. É o mais caro de achar à mão, porque nada acusa.
 *
 * O que este leitor NÃO responde: se o objeto ficou bom. Forma quem aprova é o
 * usuário, e nenhum número aqui encosta nisso.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { caminhoDoDiario } from './diario.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function lerDiario(caminho = caminhoDoDiario()) {
  if (!existsSync(caminho)) return [];
  return readFileSync(caminho, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

export function resumir(linhas) {
  const porComando = new Map();
  for (const l of linhas) {
    const atual = porComando.get(l.comando) ?? { chamadas: 0, totalMs: 0, falhas: 0, maiorMs: 0 };
    atual.chamadas += 1;
    atual.totalMs += l.duracaoMs ?? 0;
    atual.maiorMs = Math.max(atual.maiorMs, l.duracaoMs ?? 0);
    if (l.codigo !== 0) atual.falhas += 1;
    porComando.set(l.comando, atual);
  }

  /* Repetição DENTRO da rodada: mesma receita, mesmo comando, mesmo alvo. Se a
     receita mudou entre as duas chamadas, são rodadas diferentes e repetir é o
     laço normal — não é sinal de nada. */
  const repeticoes = new Map();
  for (const l of linhas) {
    if (!l.receita) continue;
    const chave = `${l.receita}|${l.comando}|${l.alvo}`;
    repeticoes.set(chave, (repeticoes.get(chave) ?? 0) + 1);
  }

  const erros = new Map();
  for (const l of linhas) {
    if (!l.erro) continue;
    /* Normaliza o que varia entre execuções — alvo, caminho, número — para a
       MESMA falha não virar dez mensagens distintas e sumir na contagem.
       Medido na primeira leitura: três "receita não encontrada" apareceram como
       três linhas de 1x, porque o nome da peça entrava na chave. Falha que se
       repete tem de PARECER repetida, senão a contagem esconde exatamente o que
       ela existe para mostrar.

       Só a primeira linha: o resto costuma ser a lista de opções disponíveis,
       que muda com o acervo e não descreve a falha. */
    const chave = String(l.erro)
      .split('\n')[0]
      .replace(/'[^']*'/g, "'<alvo>'")
      .replace(/[A-Za-z]:\\[^\s'"]+|\/[^\s'"]{6,}/g, '<caminho>')
      .replace(/\b\d+([.,]\d+)?\b/g, '<n>')
      .slice(0, 140);
    const atual = erros.get(chave) ?? { vezes: 0, comandos: new Set() };
    atual.vezes += 1;
    atual.comandos.add(l.comando);
    erros.set(chave, atual);
  }

  const silenciosos = linhas.filter((l) => l.codigo === 0 && l.cumpriu === false);

  return { porComando, repeticoes, erros, silenciosos, total: linhas.length };
}

function ms(n) {
  return n >= 10_000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`;
}

function executar() {
  const linhas = lerDiario();
  if (linhas.length === 0) {
    console.log('diário vazio — nenhuma ferramenta do laço rodou ainda, ou está desligado (MECANIFICA_DIARIO=0).');
    return;
  }
  const { porComando, repeticoes, erros, silenciosos, total } = resumir(linhas);

  const rodadas = new Set(linhas.map((l) => l.receita).filter(Boolean)).size;
  console.log(`${total} invocação(ões) em ${rodadas} rodada(s) de receita.\n`);

  console.log('ONDE VAI O TEMPO');
  const ordenado = [...porComando.entries()].sort((a, b) => b[1].totalMs - a[1].totalMs);
  for (const [comando, d] of ordenado) {
    const falhas = d.falhas ? `  ${d.falhas} com erro` : '';
    console.log(`  ${comando.padEnd(18)} ${ms(d.totalMs).padStart(8)} em ${String(d.chamadas).padStart(3)} chamada(s)   pico ${ms(d.maiorMs)}${falhas}`);
  }

  const insistidos = [...repeticoes.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  console.log('\nONDE EMPERRA — mesmo comando, mesmo alvo, receita intocada entre as chamadas');
  if (insistidos.length === 0) console.log('  (nada; nenhuma repetição sem a receita mudar)');
  for (const [chave, n] of insistidos.slice(0, 10)) {
    const [, comando, alvo] = chave.split('|');
    console.log(`  ${String(n).padStart(3)}x  ${comando} sobre ${alvo}`);
  }

  console.log('\nO QUE FALHA — mensagem normalizada, por frequência');
  const porFrequencia = [...erros.entries()].sort((a, b) => b[1].vezes - a[1].vezes);
  if (porFrequencia.length === 0) console.log('  (nenhum erro registrado)');
  for (const [msg, d] of porFrequencia.slice(0, 10)) {
    console.log(`  ${String(d.vezes).padStart(3)}x  [${[...d.comandos].join(', ')}] ${msg}`);
  }

  console.log('\nDESPERDÍCIO SILENCIOSO — saiu 0 e não entregou o que prometeu');
  if (silenciosos.length === 0) console.log('  (nenhum)');
  for (const l of silenciosos.slice(0, 10)) {
    const faltou = l.prometeu.filter((p) => !l.produziu.includes(p));
    console.log(`  ${l.comando} sobre ${l.alvo} — faltou: ${faltou.join(', ')}`);
  }

  console.log(`\ndiário em ${caminhoDoDiario().replace(`${REPO}\\`, '').replace(`${REPO}/`, '')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
