/* Fixtures com resultado esperado: a moto de prova (com o Condutor completo), o mancal e a casa, cada uma com o seu
   `<nome>.esperado.json` ao lado (contagem de formas por opção, divergências da leitura padrão, linhas da leitura padrão e,
   na moto, o gate de contato e o percurso do Condutor). O teste mede o esboço de novo e compara com o arquivo. Para
   regravar os arquivos depois de uma mudança que o desenho ou a leitura pedem de propósito, rode
   `ESBOCO_GRAVAR_ESPERADO=1 npx vitest run modulos/esboco/tests/esperado.test.js` e leia o diff antes de aceitar. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { desenharEsboco } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { medirEsboco } from '../src/descrever.js';
import { avancar, conferirEnvelope, criarEstado, marcarFeito, portaoDoEstagio, registrarEnvelope } from '../src/condutor.js';
import { descreverArquivo } from '../../../tools/mecanifica/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const caminho = (nome) => fileURLToPath(new URL(nome, pasta));
const lerJson = (nome) => JSON.parse(readFileSync(caminho(nome), 'utf8'));
const gravar = process.env.ESBOCO_GRAVAR_ESPERADO === '1';
const sha = (t) => createHash('sha256').update(t).digest('hex');

/* o que se mede de qualquer esboço */
function medir(nome) {
  const bruto = lerJson(`${nome}.esboco.json`);
  const { descricao, divergencias } = medirEsboco(bruto, { projecao: false });
  const leitura = descreverArquivo(caminho(`${nome}.esboco.json`)).texto.trimEnd().split('\n');
  return {
    bruto,
    formas: Object.fromEntries(descricao.opcoes.map((o) => [o.titulo, o.formas.length])),
    divergencias: divergencias.map((d) => ({ n: d.n, opcao: d.opcao, classe: d.classe, pecas: d.pecas, texto: d.texto })),
    leitura,
  };
}

/* os cinco estágios do nível detalhado, com o Envelope de cada unidade conferido contra a versão da própria maquete com
   só aquela unidade visível (as outras, ocultas, servem de referência) */
function percorrerOCondutor(bruto) {
  const esboco = { ...bruto, plano: { ...bruto.plano, envelope: { tolerancia: 2 } } };
  let estado = criarEstado(esboco, 'moto-curvas.esboco.json');
  const portoes = [];
  const passo = () => { const r = avancar(esboco, estado); portoes.push({ estagio: estado.atual, passa: r.ok, falta: r.portao.falta.length }); estado = r.estado; return r; };
  passo(); passo(); passo();
  const marcos = [];
  for (const u of estado.unidades) {
    /* o id da unidade é o da instância de componente ou da forma, e as unidades de várias peças os juntam com "+" */
    const visiveis = new Set(u.id.split('+'));
    const so = { ...esboco, formas: esboco.formas.map((f) => (visiveis.has(f.id) ? f : { ...f, oculto: true })) };
    const r = conferirEnvelope(esboco, estado, u.id, so);
    estado = registrarEnvelope(estado, r, 'maquete');
    const feito = marcarFeito(esboco, estado, u.id);
    estado = feito.estado;
    marcos.push(...feito.novosMarcos.map((m) => m.limiar));
  }
  passo(); passo();
  return { estado, portoes, marcos };
}

/* Números escritos à mão: literais numéricos do JSON e dígitos dentro de "=expressão", sem os textos (a mesma conta de
   `parametros.test.js`), aqui sem o `plano`, que declara medidas e não desenha nada. */
const TEXTOS = new Set(['plano', 'nota', 'titulo', 'rotulo', 'motivo', 'id', 'tipo', 'cor', 'vista']);
function literais(v) {
  if (typeof v === 'number') return 1;
  if (typeof v === 'string') return v.startsWith('=') ? (v.match(/(?<![A-Za-z_])\d+(\.\d+)?/g) ?? []).length : 0;
  if (Array.isArray(v)) return v.reduce((s, x) => s + literais(x), 0);
  if (v && typeof v === 'object') return Object.entries(v).reduce((s, [k, x]) => s + (TEXTOS.has(k) && typeof x === 'string' ? 0 : literais(x)), 0);
  return 0;
}
const CURVAS = ['loft', 'extrusao', 'revolucao'];
const naoNulos = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'number' && x !== 0).length : 0);

/* a conta do gate de saída (itens 1 e 7): quantos números a moto escreve à mão e quantos deles são posição */
function numerosAMao(bruto) {
  const { plano, ...semPlano } = bruto;
  void plano;
  const curvas = bruto.formas.filter((f) => CURVAS.includes(f.tipo));
  return {
    total: literais(semPlano),
    formasCurvas: { formas: curvas.map((f) => f.id), numeros: curvas.reduce((s, f) => s + literais(f), 0) },
    semFormasCurvas: literais(semPlano) - curvas.reduce((s, f) => s + literais(f), 0),
    centrosComLiteralNaoNulo: bruto.formas.reduce((s, f) => s + ['centro', 'de', 'para'].reduce((t, k) => t + naoNulos(f[k]), 0), 0),
    deslocamentosNaoNulos: bruto.formas.reduce((s, f) => s + naoNulos(f.desloca), 0),
  };
}

function esperadoDaMoto(m) {
  const contato = verificarContato(m.bruto);
  const { estado, portoes, marcos } = percorrerOCondutor(m.bruto);
  return {
    contato: {
      resultado: contato.resultado,
      achados: contato.achados.length,
      atravessamentos: contato.atravessamentos.map((t) => `${t.opcao}: ${t.a} + ${t.b} ${t.penetracao_mm} de no máximo ${t.max_mm} mm`),
    },
    svg: { sha256: sha(desenharEsboco(m.bruto).svg) },
    numerosAMao: { ...numerosAMao(m.bruto), moto_original: literais(lerJson('moto.esboco.json')), moto_com_parametros: literais(lerJson('moto-parametros.esboco.json')) },
    condutor: {
      estagios: estado.estagios,
      percurso: estado.historico.map((h) => `${h.de} > ${h.para}`),
      portoes,
      marcos,
      concluido: estado.atual === 'concluido',
      unidades: estado.unidades.map((u) => ({ id: u.id, formas: u.custo, depende: u.depende, caixa: u.envelope.caixa, portas: u.envelope.portas.map((p) => `${p.forma}.${p.ancora} <- ${p.usadaPor.join(',')}`) })),
    },
  };
}

const NOTAS = {
  'mancal-eixo': 'Fixture anterior ao gate de contato: sem `contato.usar` nada é cobrado. O eixo e a ponta se tocam e formam um grupo à parte: o eixo de 36 mm passa pelo furo de 40 mm do anel com 2 mm de folga radial, acima da tolerância padrão de 1,5 mm, e por isso a leitura aponta os dois como soltos em relação à base e ao alojamento; o componente `mancal` declara o par atravessa que resolve isso.',
  casa: 'Fixture anterior ao gate de contato: sem `contato.usar` as sobreposições de cada água do telhado com as paredes (5,1 mm), da chaminé com o telhado direito (10,9 mm) e das duas águas entre si (3,2 mm) são lidas como atravessamentos não declarados.',
  'moto-curvas': 'Gate de contato ligado e aprovado nas duas opções, sem divergência. O Condutor percorre os cinco estágios (com `plano.envelope` declarado e o Envelope de cada unidade conferido) em 11 unidades e 24 formas.',
};

describe.each(['mancal-eixo', 'casa', 'moto-curvas'])('o resultado esperado de %s', (nome) => {
  const arquivo = `${nome}.esperado.json`;
  const medido = medir(nome);
  const esperado = {
    arquivo: `${nome}.esboco.json`,
    nota: NOTAS[nome],
    formas: medido.formas,
    divergencias: medido.divergencias,
    leitura: medido.leitura,
    ...(nome === 'moto-curvas' ? esperadoDaMoto(medido) : {}),
  };

  it('bate com o arquivo .esperado.json ao lado da fixture', () => {
    if (gravar) writeFileSync(caminho(arquivo), `${JSON.stringify(esperado, null, 2)}\n`);
    expect(existsSync(caminho(arquivo))).toBe(true);
    expect(esperado).toEqual(lerJson(arquivo));
  }, 180000);

  it('conta as formas e as divergências que o arquivo diz, e a leitura padrão tem as linhas dele', () => {
    const e = lerJson(arquivo);
    expect(medido.formas).toEqual(e.formas);
    expect(medido.divergencias.length).toBe(e.divergencias.length);
    expect(medido.leitura).toEqual(e.leitura);
  });
});

describe('os números escritos à mão na moto de formas curvas (itens 1 e 7 do gate de saída)', () => {
  const n = numerosAMao(lerJson('moto-curvas.esboco.json'));

  it('nenhum centro, ponto de haste ou ponta é um número calculado à mão, e só o garfo tem um deslocamento', () => {
    expect(n.centrosComLiteralNaoNulo).toBe(0);
    expect(n.deslocamentosNaoNulos).toBe(1);
  });

  it('sem as quatro formas curvas, que a moto original não tem, escreve menos da metade dos números da moto original', () => {
    const original = literais(lerJson('moto.esboco.json'));
    expect(original).toBe(83);
    expect(n.formasCurvas.formas).toEqual(['tanque', 'banco', 'carenagem', 'farol']);
    expect(n.semFormasCurvas).toBeLessThanOrEqual(original / 2);
  });

  it('com as formas curvas o total passa de 83 (o perfil de cada uma é desenho, e não posição): o número é medido, não escondido', () => {
    expect(n.total).toBe(98);
    expect(n.formasCurvas.numeros).toBe(71);
    expect(n.total).toBeGreaterThan(literais(lerJson('moto.esboco.json')));
  });
});

describe('o percurso do Condutor na moto de prova', () => {
  it('passa os Portões dos cinco estágios, marca os quatro Marcos e mantém as portas nos mesmos pontos', () => {
    const e = lerJson('moto-curvas.esperado.json');
    expect(e.condutor.concluido).toBe(true);
    expect(e.condutor.portoes.map((p) => p.passa)).toEqual([true, true, true, true, true]);
    expect(e.condutor.marcos).toEqual([25, 50, 75, 100]);
    expect(e.condutor.unidades).toHaveLength(11);
    expect(e.condutor.unidades.reduce((s, u) => s + u.formas, 0)).toBe(24);
    expect(e.contato.resultado).toBe('aprovado');
    expect(e.contato.achados).toBe(0);
  });

  it('o Portão da Maquete falha quando o esboço tem uma divergência, e diz qual', () => {
    const bruto = lerJson('moto-curvas.esboco.json');
    const quebrado = JSON.parse(JSON.stringify(bruto));
    quebrado.parametros.entreEixos = 1600;
    const p = portaoDoEstagio(quebrado, criarEstado(quebrado, 'x'));
    expect(p.passa).toBe(false);
    expect(p.falta.some((f) => f.includes('medida "distanciaEntreEixos" fora da tolerância'))).toBe(true);
  }, 60000);
});
