/* ativar-bancada.mjs — ativa qualquer peca ou montagem procedural na sessao ativa da bancada 3D. */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { caixasPorParte, portasPublicadas } from '../../src/autoria/descrever-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerArgumentos } from './argumentos.mjs';
import { importarReceita } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

export async function ativarReceitaBancada({
  alvo,
  perfil,
  focar,
  modo,
  imagem,
  porta = '5174',
  raiz = REPO,
  /* ONDE a sessão é gravada, separado de ONDE a receita é procurada.
   *
   * Os dois eram o mesmo `raiz`, e por isso todo teste que exercitava esta CLI
   * escrevia no `public/sessao-ativa.json` REAL — o arquivo que diz qual peça
   * está na bancada de quem está trabalhando. Dois arquivos de teste tentaram
   * remediar isso guardando e devolvendo o conteúdo, e não resolve: rodando em
   * paralelo, cada um devolve o que capturou, e vence quem terminar por último.
   * Medido: a sessão saía de `cadeira-de-madeira` e voltava como outra peça.
   *
   * Separar os dois deixa o teste apontar a ESCRITA para uma pasta temporária
   * enquanto a BUSCA continua no acervo real, que é o que ele precisa exercitar.
   * Em uso normal os dois continuam iguais, e nada muda. */
  raizSessao = raiz,
} = {}) {
  if (!alvo) {
    throw new Error('Informe a receita (ex.: mancal-guia ou --arquivo=<caminho.js>)');
  }

  const caminhoAbsoluto = resolverCaminhoReceita(alvo, { raiz });
  const caminhoRelativo = relative(raiz, caminhoAbsoluto).replace(/\\/g, '/');

  const modulo = await importarReceita(caminhoAbsoluto);
  const receita = modulo.default
    ?? Object.values(modulo).find((v) => v && typeof v === 'object' && Array.isArray(v.PASSOS));

  if (!receita || !Array.isArray(receita.PASSOS)) {
    throw new Error('O módulo não exporta uma receita válida com PASSOS.');
  }

  if (perfil && receita.PARAMS) {
    receita.PARAMS.perfil = perfil;
  }

  const { neutro } = executarReceita(receita);
  const { caixas, facesSemParte } = caixasPorParte(neutro);
  const portas = portasPublicadas(neutro);
  const partesNomes = Array.from(caixas.keys());

  const partesSemMaterial = [];
  for (const nome of caixas.keys()) {
    let temMaterial = false;
    for (const [, f] of (neutro.F instanceof Map ? neutro.F.entries() : Object.entries(neutro.F))) {
      if (f.parte === nome && f.material) { temMaterial = true; break; }
    }
    if (!temMaterial) partesSemMaterial.push(nome);
  }

  const criterios = [
    facesSemParte.length ? `${facesSemParte.length} face(s) sem parte` : 'Sem faces órfãs',
    `${partesNomes.length} corpos identificados`,
  ];
  if (partesSemMaterial.length) criterios.push(`sem material: ${partesSemMaterial.join(', ')}`);

  const gritos = neutro.orfaos ?? [];
  if (gritos.length) {
    const detalhes = gritos.map((g) => `passo ${g.passo} (${g.op}) ${g.ref}: ${g.motivo}`).join('; ');
    throw new Error(`Receita NÃO ativada: o motor recusou ${gritos.length} referência(s). ${detalhes}`);
  }

  const nomeAlvo = perfil ? `${receita.meta?.nome ?? 'Peça Ativa'} (${perfil})` : (receita.meta?.nome ?? 'Peça Ativa');
  const idAlvo = caminhoRelativo.replace(/[\/\\]/g, '-').replace(/\.js$/, '');
  const idCurto = caminhoRelativo.replace(/.*[\/\\]/, '').replace(/\.js$/, '');

  const imagensReferencia = [];
  if (imagem) {
    const caminhoImagemAbs = resolve(raiz, imagem);
    if (existsSync(caminhoImagemAbs)) {
      const ext = caminhoImagemAbs.endsWith('.png') ? '.png' : '.jpg';
      const destinoRelativo = `referencias/${idCurto}${ext}`;
      const destinoAbs = resolve(raiz, 'public', destinoRelativo);
      mkdirSync(dirname(destinoAbs), { recursive: true });
      copyFileSync(caminhoImagemAbs, destinoAbs);
      imagensReferencia.push({
        url: `./${destinoRelativo}`,
        rotulo: `Referência Fotográfica: ${receita.meta?.nome ?? idCurto}`,
        descricao: 'Imagem de referência fotorrealista para critérios e anatomia.',
      });
    }
  } else {
    for (const ext of ['.jpg', '.png', '.jpeg', '.webp']) {
      const candidata = `referencias/${idCurto}${ext}`;
      if (existsSync(resolve(raiz, 'public', candidata))) {
        imagensReferencia.push({
          url: `./${candidata}`,
          rotulo: `Referência Fotográfica: ${receita.meta?.nome ?? idCurto}`,
          descricao: 'Imagem de referência fotorrealista para critérios e anatomia.',
        });
        break;
      }
    }
  }

  const payload = {
    status: 'conectado',
    alvo: {
      id: idAlvo,
      tipo: 'peca',
      nome: nomeAlvo,
      perfil: perfil ?? receita.PARAMS?.perfil ?? 'jogo',
      versao: receita.meta?.versao ?? '1.0.0',
      atualizadoEm: new Date().toISOString(),
    },
    intencaoIA: {
      titulo: `Modelagem: ${nomeAlvo}`,
      resumo: `Carregado automaticamente via ativar-bancada a partir de ${caminhoRelativo}.`,
      checklist: partesNomes.slice(0, 8),
    },
    referencias: {
      pranchas: [],
      imagens: imagensReferencia,
      criterios: criterios,
    },
    receita,
  };

  mkdirSync(resolve(raizSessao, 'public'), { recursive: true });
  writeFileSync(resolve(raizSessao, 'public/sessao-ativa.json'), JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(resolve(raizSessao, 'sessao-ativa.json'), JSON.stringify(payload, null, 2), 'utf8');

  const modoEfetivo = modo ?? (focar ? 'isolar' : 'todas');
  let query = '';
  if (focar) {
    query = `?selecionadas=${encodeURIComponent(focar)}&modo=${encodeURIComponent(modoEfetivo)}&focar=true`;
  }

  const url = `http://localhost:${porta}/nos-mecanifica/bancada.html${query}`;

  return {
    ok: true,
    caminhoAbsoluto,
    caminhoRelativo,
    nomeAlvo,
    partesNomes,
    facesSemParte,
    partesSemMaterial,
    porta,
    query,
    url,
    payload,
  };
}

async function main() {
  const args = lerArgumentos(process.argv.slice(2), {
    opcoes: ['arquivo', 'peca', 'porta', 'focar', 'modo', 'perfil', 'imagem', 'raiz-sessao'],
    bandeiras: ['ajuda', 'h'],
    posicional: { nome: 'a receita', obrigatorio: false },
  });

  if (args.bandeira('ajuda') || args.bandeira('h')) {
    console.log(`
Uso:
  npm run ativar:bancada -- <peca>
  npm run ativar:bancada -- --arquivo=prototipos/.../montagem.js

Opcoes:
  --arquivo=<path>   Caminho ou nome da receita
  --peca=<path>      Alias para --arquivo
  --porta=<num>      Porta do Vite (padrao: 5174 ou 5173)
  --focar=<nome>     Nome da parte para focar imediatamente na URL
  --modo=<modo>      Modo de visualizacao: todas, contexto, isolar
  --perfil=<nome>    Perfil de aplicacao da receita (ex: jogo, marcenaria)
  --imagem=<path>    Imagem de referencia visual vinculada a sessao
  --raiz-sessao=<d>  Onde gravar sessao-ativa.json (padrao: raiz do repo).
                     Existe para teste escrever fora da sessao de trabalho.
`);
    process.exit(0);
  }

  const alvo = args.opcao('arquivo') ?? args.opcao('peca') ?? args.posicional;
  if (!alvo) {
    console.error('Erro: informe a receita (ex.: npm run ativar:bancada -- <peca> ou --arquivo=<caminho.js>)');
    process.exit(1);
  }

  try {
    const res = await ativarReceitaBancada({
      alvo,
      perfil: args.opcao('perfil'),
      focar: args.opcao('focar'),
      modo: args.opcao('modo'),
      imagem: args.opcao('imagem'),
      porta: args.opcao('porta') ?? '5174',
      raizSessao: args.opcao('raiz-sessao') ?? REPO,
    });

    console.log(`\n✓ Receita ativada na Bancada com sucesso!`);
    console.log(`  Alvo: ${res.nomeAlvo} (${res.partesNomes.length} corpos, ${res.facesSemParte.length} faces órfãs)`);
    if (res.facesSemParte.length) {
      console.log(`  ! faces sem parte: ${res.facesSemParte.slice(0, 8).join(', ')}${res.facesSemParte.length > 8 ? '…' : ''}`);
      console.log('    lembre que {op:\'cilindro\',id} seleciona só as laterais; as tampas pedem tampa:\'fundo\' e tampa:\'topo\'.');
    }
    if (res.partesSemMaterial.length) console.log(`  ! partes sem material (renderizam cinza): ${res.partesSemMaterial.join(', ')}`);
    console.log(`  Arquivo de sessão: public/sessao-ativa.json`);
    console.log(`\nURL da Bancada:`);
    console.log(`  ${res.url}`);
    if (res.porta !== '5173') {
      console.log(`  (Se a porta 5174 estiver ocupada, tente http://localhost:5173/nos-mecanifica/bancada.html${res.query})`);
    }
  } catch (erro) {
    console.error(`\n✗ ${erro.message}`);
    process.exit(1);
  }
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (executadoComoCLI) {
  main();
}
