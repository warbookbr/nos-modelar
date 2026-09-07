#!/usr/bin/env node
/**
 * varrer-peca.mjs — CLI da varredura paramétrica.
 *
 * Serviço headless e CLI fina, no mesmo desenho do `descrever-peca.mjs`.
 * Devolve candidatos medidos; não escreve na receita e não escolhe por ninguém.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import {
  ORCAMENTO_PADRAO,
  formatarLote,
  formatarSensibilidade,
  varrerLote,
  varrerSensibilidade,
} from '../../src/autoria/varrer-parametros.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { REPO, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';

function erroDeUso(mensagem) {
  return {
    ok: false,
    codigo: 2,
    erro: { categoria: 'uso', codigo: 'uso_invalido', mensagem },
    stdout: '',
    stderr: `varrer-peca: ${mensagem}\n`,
  };
}

function falha(mensagem) {
  return {
    ok: false,
    codigo: 1,
    erro: { categoria: 'execucao', codigo: 'falha_varredura', mensagem },
    stdout: '',
    stderr: `\n${mensagem}\n`,
  };
}

/**
 * Varre uma receita. `liberdades` não vazio escolhe o modo lote; sem elas, a
 * varredura é de sensibilidade.
 */
export async function varrerReutilizavel({
  alvo = null,
  criterio = 'menor-folga',
  delta = 0.1,
  liberdades = [],
  objetivo = null,
  orcamento = ORCAMENTO_PADRAO,
  mostrar = 5,
} = {}) {
  if (!alvo) {
    return erroDeUso(
      'diga qual receita varrer.'
      + '\n  ex.: npm run varrer -- cadeira-de-madeira --criterio=menor-folga'
      + '\n       npm run varrer -- cadeira-de-madeira --livres=perna.secaoTopo:0.03..0.05:5 --maximizar',
    );
  }
  let caminho;
  try {
    caminho = resolverCaminhoReceita(alvo, { raiz: REPO });
  } catch (erro) {
    return erroDeUso(erro.message);
  }
  let modulo;
  try {
    modulo = await importarReceita(caminho);
  } catch (erro) {
    return falha(`RECEITA NÃO CARREGOU\n  ${alvo}: ${erro.message}`);
  }
  const receita = receitaDoModulo(modulo);
  if (!Array.isArray(receita?.PASSOS) && !Array.isArray(receita?.CHAMADAS_COMPOSICOES)) {
    return falha(`RECEITA SEM ENVELOPE DA OFICINA\n  ${alvo} não exporta PASSOS nem CHAMADAS_COMPOSICOES.`);
  }

  try {
    if (liberdades.length) {
      const resultado = varrerLote(receita, { liberdades, criterio, objetivo, orcamento });
      return { ok: true, codigo: 0, stdout: formatarLote(resultado, { alvo, mostrar }), stderr: '', resultado };
    }
    const resultado = varrerSensibilidade(receita, { criterio, delta, orcamento });
    return { ok: true, codigo: 0, stdout: formatarSensibilidade(resultado, { alvo }), stderr: '', resultado };
  } catch (erro) {
    /* Estouro de orçamento e critério inexistente são erro de USO: a resposta
       certa é dizer o que foi pedido e o que é aceito, não rodar por minutos
       nem sair com pilha. */
    return erroDeUso(erro.message);
  }
}

function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['criterio', 'delta', 'livres', 'alvo', 'orcamento', 'mostrar'],
      bandeiras: ['maximizar', 'minimizar'],
      posicional: { nome: 'a receita', obrigatorio: false },
    });
  } catch (erro) {
    return erroDeUso(erro.message);
  }

  const inteiro = (texto, nome, minimo) => {
    const n = Number(texto);
    if (!Number.isInteger(n) || n < minimo) throw new Error(`--${nome} precisa ser inteiro ≥ ${minimo}, recebi '${texto}'`);
    return n;
  };

  let orcamento;
  let mostrar;
  let delta;
  try {
    orcamento = inteiro(lido.opcao('orcamento', String(ORCAMENTO_PADRAO)), 'orcamento', 1);
    mostrar = inteiro(lido.opcao('mostrar', '5'), 'mostrar', 1);
    const deltaTexto = lido.opcao('delta', '0.1');
    delta = Number(deltaTexto);
    if (!Number.isFinite(delta) || delta <= 0 || delta >= 1) {
      throw new Error(`--delta precisa ser fração entre 0 e 1, recebi '${deltaTexto}'`);
    }
  } catch (erro) {
    return erroDeUso(erro.message);
  }

  const livres = lido.opcao('livres');
  const liberdades = livres === null ? [] : livres.split(',').map((s) => s.trim()).filter(Boolean);
  if (livres !== null && !liberdades.length) return erroDeUso('--livres veio vazio; informe caminho:min..max:passos ou omita a opção');

  const alvoTexto = lido.opcao('alvo');
  const maximizar = lido.bandeira('maximizar');
  const minimizar = lido.bandeira('minimizar');
  const declarados = [alvoTexto !== null, maximizar, minimizar].filter(Boolean).length;
  if (declarados > 1) return erroDeUso('--alvo, --maximizar e --minimizar são objetivos diferentes; declare um só.');
  if (declarados && !liberdades.length) return erroDeUso('objetivo só faz sentido no modo lote; informe --livres também.');

  let objetivo = null;
  if (alvoTexto !== null) {
    const valor = Number(alvoTexto);
    if (!Number.isFinite(valor)) return erroDeUso(`--alvo precisa ser numérico, recebi '${alvoTexto}'`);
    objetivo = { modo: 'alvo', alvo: valor };
  } else if (maximizar) objetivo = { modo: 'maximizar' };
  else if (minimizar) objetivo = { modo: 'minimizar' };

  return varrerReutilizavel({
    alvo: lido.posicional,
    criterio: lido.opcao('criterio', 'menor-folga'),
    delta,
    liberdades,
    objetivo,
    orcamento,
    mostrar,
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const fechar = iniciarRegistro('varrer', process.argv[2]);
  const resultado = await comoCLI(process.argv.slice(2));
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
  fechar({
    codigo: resultado.codigo,
    medidas: resultado.resultado ? { variantes: resultado.resultado.variantes } : null,
    erro: resultado.erro?.mensagem ?? null,
  });
}
