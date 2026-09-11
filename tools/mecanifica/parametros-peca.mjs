#!/usr/bin/env node
/**
 * parametros-peca.mjs — responde o que dá para mexer numa receita.
 *
 * Serviço headless e CLI fina, no mesmo desenho do `descrever-peca.mjs`: o
 * serviço não lê argv, não escreve em stream e não encerra processo.
 *
 * A pergunta que ele responde é anterior a "qual valor usar": é "este parâmetro
 * está ligado em alguma coisa?". Sem ela, medir a derivada de um parâmetro é
 * medir a derivada de um enfeite.
 */
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { diagnosticarParametros, formatarDiagnostico } from '../../src/autoria/parametros-vivos.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { PASTAS_BUSCA, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
/* As mesmas pastas que o resolvedor procura, menos a raiz. Antes esta lista era
   `pecas` e `maquinas` escritas a mao, e o comando anunciava "acervo inteiro"
   varrendo dois tercos dele: `armas/` tem tres receitas e nunca entrou na
   conta. Derivar do resolvedor faz as duas listas nao poderem divergir. */
const PASTAS = PASTAS_BUSCA.filter(Boolean).map((relativo) => join(REPO, relativo));

/** Todo alvo do acervo: receita é arquivo, pasta com `receita.js` — a pasta da
 *  peça, onde a receita mora junto das referências — ou pasta com
 *  `montagem.js`. */
export function alvosDoAcervo() {
  const alvos = [];
  for (const pasta of PASTAS) {
    let entradas;
    try { entradas = readdirSync(pasta, { withFileTypes: true }); } catch { continue; }
    for (const entrada of entradas) {
      if (entrada.isDirectory()) {
        for (const [porta, tipo] of [['receita.js', 'peca'], ['montagem.js', 'maquina']]) {
          try {
            if (statSync(join(pasta, entrada.name, porta)).isFile()) {
              alvos.push({ nome: entrada.name, tipo });
              break;
            }
          } catch { /* segue para a próxima porta */ }
        }
        continue;
      }
      if (entrada.name.endsWith('.js') && !entrada.name.startsWith('_')) {
        alvos.push({ nome: entrada.name.slice(0, -'.js'.length), tipo: 'peca' });
      }
    }
  }
  return alvos.sort((a, b) => a.nome.localeCompare(b.nome));
}

function erroDeUso(mensagem) {
  return {
    ok: false,
    codigo: 2,
    erro: { categoria: 'uso', codigo: 'uso_invalido', mensagem },
    stdout: '',
    stderr: `parametros-peca: ${mensagem}\n`,
  };
}

/** Diagnostica um alvo já resolvido; devolve o registro, nunca lança. */
async function diagnosticarAlvo(alvo) {
  let caminho;
  try {
    caminho = resolverCaminhoReceita(alvo, { raiz: REPO });
  } catch (erro) {
    return { alvo, carregou: false, erro: erro.message, totais: { declarados: 0, vivos: 0, inertes: 0 } };
  }
  let modulo;
  try {
    modulo = await importarReceita(caminho);
  } catch (erro) {
    /* Receita que não carrega é um FATO do acervo, não um acidente da varredura.
       Derrubar o comando inteiro por causa de uma esconderia o diagnóstico das
       outras dez, que é o que interessa a quem pediu a varredura. */
    return { alvo, carregou: false, erro: erro.message, totais: { declarados: 0, vivos: 0, inertes: 0 } };
  }
  const receita = receitaDoModulo(modulo);
  if (!Array.isArray(receita?.PASSOS) && !Array.isArray(receita?.CHAMADAS_COMPOSICOES)) {
    return {
      alvo,
      carregou: false,
      erro: 'não exporta PASSOS nem CHAMADAS_COMPOSICOES',
      totais: { declarados: 0, vivos: 0, inertes: 0 },
    };
  }
  return { alvo, ...diagnosticarParametros(receita) };
}

function tabelaDoAcervo(registros) {
  const larguraNome = Math.max(...registros.map((r) => r.alvo.length), 5);
  const linhas = [
    'PARÂMETROS DECLARADOS × PARÂMETROS VIVOS — acervo inteiro',
    '',
    `  ${'alvo'.padEnd(larguraNome)}  declar.  vivos  inertes`,
  ];
  let declarados = 0;
  let vivos = 0;
  let naoCarregam = 0;
  let naoDiagnosticadas = 0;
  for (const r of registros) {
    if (!r.carregou) {
      naoCarregam += 1;
      linhas.push(`  ${r.alvo.padEnd(larguraNome)}       —      —        —   não carrega`);
      continue;
    }
    if (r.indiagnosticavel) {
      /* Some da conta em vez de entrar como inerte: contar como inerte um
         parâmetro que ninguém conseguiu sondar inflaria a estatística com uma
         afirmação que a medição não sustenta. */
      naoDiagnosticadas += 1;
      linhas.push(
        `  ${r.alvo.padEnd(larguraNome)}  ${String(r.totais.declarados).padStart(7)}`
        + `      —        —   sem parte medível`,
      );
      continue;
    }
    declarados += r.totais.declarados;
    vivos += r.totais.vivos;
    /* Zero declarado não é PARAMS decorativo: é receita que não promete nada,
       e rotulá-la de enganosa seria a acusação errada. */
    const marca = r.totais.declarados === 0
      ? '   nada declarado'
      : (r.totais.vivos > 0 ? '' : '   PARAMS decorativo');
    linhas.push(
      `  ${r.alvo.padEnd(larguraNome)}  ${String(r.totais.declarados).padStart(7)}`
      + `${String(r.totais.vivos).padStart(7)}${String(r.totais.inertes).padStart(9)}${marca}`,
    );
  }
  const pct = declarados ? Math.round((100 * vivos) / declarados) : 0;
  linhas.push(
    '',
    `  ${declarados} parâmetro(s) declarado(s), ${vivos} vivo(s) (${pct}%), ${declarados - vivos} inerte(s).`,
  );
  if (naoCarregam) linhas.push(`  ${naoCarregam} receita(s) não carregam e não foram diagnosticadas.`);
  if (naoDiagnosticadas) {
    linhas.push(`  ${naoDiagnosticadas} receita(s) executam sem publicar parte medível e ficaram fora da conta.`);
  }
  const instaveis = registros.filter((r) => r.carregou && r.determinismo && !r.determinismo.estavel);
  if (instaveis.length) {
    linhas.push(`  ⚠ ${instaveis.length} receita(s) mediram diferente na repetição: ${instaveis.map((r) => r.alvo).join(', ')}`);
  }
  return `${linhas.join('\n')}\n`;
}

/**
 * Diagnostica um alvo, ou o acervo inteiro quando `acervo` é verdadeiro.
 */
export async function parametrosReutilizavel({ alvo = null, acervo = false, completo = false } = {}) {
  if (acervo && alvo) {
    return erroDeUso('--acervo varre tudo e não aceita um alvo junto; escolha um dos dois.');
  }
  if (!acervo && !alvo) {
    return erroDeUso(
      'diga qual receita diagnosticar, pelo nome em prototipos/procedural/v3/{pecas,maquinas,armas,extensoes}/.'
      + '\n  ex.: npm run parametros -- cadeira-de-madeira   (ou --acervo para todas)',
    );
  }

  if (acervo) {
    const registros = [];
    for (const { nome } of alvosDoAcervo()) registros.push(await diagnosticarAlvo(nome));
    const vivos = registros.reduce((soma, r) => soma + r.totais.vivos, 0);
    const declarados = registros.reduce((soma, r) => soma + r.totais.declarados, 0);
    return {
      ok: true,
      codigo: 0,
      stdout: tabelaDoAcervo(registros),
      stderr: '',
      resultado: { registros, totais: { declarados, vivos, inertes: declarados - vivos } },
    };
  }

  const registro = await diagnosticarAlvo(alvo);
  if (!registro.carregou) {
    return {
      ok: false,
      codigo: 1,
      erro: { categoria: 'execucao', codigo: 'receita_nao_carrega', mensagem: registro.erro },
      stdout: '',
      stderr: `\nRECEITA NÃO DIAGNOSTICADA\n  ${alvo}: ${registro.erro}\n`,
      resultado: { registro },
    };
  }
  return {
    ok: true,
    codigo: 0,
    stdout: formatarDiagnostico(registro, { alvo, completo }),
    stderr: registro.determinismo && !registro.determinismo.estavel
      ? `\nMEDIÇÃO INSTÁVEL em '${alvo}': a mesma entrada mediu diferente duas vezes.\n`
      : '',
    resultado: { registro },
  };
}

function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: [],
      bandeiras: ['acervo', 'completo'],
      posicional: { nome: 'a receita', obrigatorio: false },
    });
  } catch (erro) {
    return erroDeUso(erro.message);
  }
  return parametrosReutilizavel({
    alvo: lido.posicional,
    acervo: lido.bandeira('acervo'),
    completo: lido.bandeira('completo'),
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const fechar = iniciarRegistro('parametros', process.argv[2]);
  const resultado = await comoCLI(process.argv.slice(2));
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
  fechar({
    codigo: resultado.codigo,
    medidas: resultado.resultado?.registro?.totais ?? resultado.resultado?.totais ?? null,
    erro: resultado.erro?.mensagem ?? null,
  });
}
