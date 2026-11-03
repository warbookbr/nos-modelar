/* perguntas-do-alinhamento.test.mjs — o comando do alinhamento por família e o registro dos pedidos da pessoa, sobre o furgão realista:
   a prova retroativa de que o catálogo teria feito aparecer, antes da etapa 3, as sete perguntas que a pessoa fez depois. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { comoCLI, perguntasDoAlinhamentoDe } from './perguntas-do-alinhamento.mjs';
import { arquivoDosPedidos, comoCLI as comoCLIDosPedidos, conferirPedidos, lerPedidosDaPeca, registrarPedidos } from './pedidos-da-pessoa.mjs';
import { contarPedidos } from '../../src/autoria/pedidos-da-pessoa.js';

const ALINHAMENTO = 'docs/modelar/banco-de-provas/furgao-realista-2026-10-30/ALINHAMENTO.md';
/* as regras que correspondem aos sete pedidos da pessoa na etapa 3 */
const DOS_SETE_PEDIDOS = ['coluna-e-faixa-de-teto', 'protecao-com-secao-propria', 'arco-com-alargamento', 'alargamento-ao-pneu', 'contorno-continuo-em-volta-da-roda', 'linhas-vizinhas-afastadas', 'peca-fixa-nao-cobre-porta'];

const ids = (r) => r.itens.map((i) => i.id);

describe('o comando de perguntas do alinhamento', () => {
  it('sobre o PLANO do furgão realista faz aparecer as sete perguntas dos pedidos da etapa 3', async () => {
    const r = await perguntasDoAlinhamentoDe({ peca: 'furgao-realista' });
    expect(r.familia).toBe('veiculo');
    for (const id of DOS_SETE_PEDIDOS) expect(ids(r)).toContain(id);
  });

  it('sobre o alinhamento escrito de 2026-10-30 também faz aparecer as sete', async () => {
    const r = await perguntasDoAlinhamentoDe({ familia: 'veiculo', alinhamento: ALINHAMENTO });
    for (const id of DOS_SETE_PEDIDOS) expect(ids(r)).toContain(id);
  });

  it('a peça sem as partes de uma regra não recebe a pergunta dela', async () => {
    const r = await perguntasDoAlinhamentoDe({ familia: 'veiculo', partes: ['guidao', 'selim'] });
    expect(ids(r)).toEqual([]);
  });

  it('sem família imprime o conjunto genérico, e família desconhecida é recusada com as que existem', async () => {
    const { texto } = await comoCLI([]);
    expect(texto).toMatch(/Perguntas gerais do alinhamento/);
    await expect(comoCLI(['--familia', 'nave'])).rejects.toThrow(/as que existem são .*veiculo/);
  });

  it('a saída em JSON traz id, pergunta e regra de cada item', async () => {
    const { texto } = await comoCLI(['--familia', 'veiculo', '--json']);
    const lido = JSON.parse(texto);
    expect(lido.itens[0]).toMatchObject({ id: expect.any(String), pergunta: expect.stringMatching(/\?$/), regra: expect.any(String) });
  });
});

describe('os pedidos da pessoa no furgão realista', () => {
  it('os sete pedidos da etapa 3 estão registrados, contados por etapa, cada um com uma regra que existe e o lugar onde ela mora', () => {
    const registro = lerPedidosDaPeca('furgao-realista');
    expect(contarPedidos(registro.pedidos)).toMatchObject({ total: 7, porEtapa: { 3: 7 } });
    expect(conferirPedidos(registro.pedidos)).toEqual([]);
    expect(registro.pedidos.map((p) => p.regra).sort()).toEqual([...DOS_SETE_PEDIDOS].sort());
  });

  it('a ferramenta imprime a contagem por etapa em JSON para a sessão principal', () => {
    const { codigo, texto } = comoCLIDosPedidos(['furgao-realista', '--pedidos', '--json']);
    expect(codigo).toBe(0);
    expect(JSON.parse(texto)).toMatchObject({ peca: 'furgao-realista', total: 7, porEtapa: { 3: 7 } });
  });
});

describe('o registro de pedidos em área de ensaio', () => {
  let area;
  const preparar = () => {
    area = mkdtempSync(join(tmpdir(), 'pedidos-'));
    mkdirSync(join(area, 'procedural/pecas/cofre'), { recursive: true });
    writeFileSync(join(area, 'procedural/pecas/cofre/receita.js'), 'export default {};\n');
    mkdirSync(join(area, 'procedural/criterios'), { recursive: true });
    writeFileSync(join(area, 'procedural/criterios/veiculo.json'), '{ "regras": [ { "id": "coluna-e-faixa-de-teto" } ] }\n');
    return area;
  };
  afterEach(() => { if (area) rmSync(area, { recursive: true, force: true }); area = undefined; });
  const entrada = { pedidos: [{ texto: 'Faixa mais alta.', etapa: 2, regra: 'coluna-e-faixa-de-teto', ondeMora: 'procedural/criterios/veiculo.json#coluna-e-faixa-de-teto' }] };

  it('acrescenta ao arquivo da peça, valida e recusa regra que não existe no catálogo', () => {
    const raiz = preparar();
    const regras = { 'coluna-e-faixa-de-teto': 'veiculo' };
    registrarPedidos('cofre', entrada, { raiz, regras });
    expect(JSON.parse(readFileSync(arquivoDosPedidos('cofre', { raiz }), 'utf8')).pedidos).toHaveLength(1);
    expect(() => registrarPedidos('cofre', entrada, { raiz, regras })).toThrow(/ainda não foi registrado/);
    const inventada = { pedidos: [{ ...entrada.pedidos[0], texto: 'Outro.', regra: 'regra-inventada' }] };
    expect(() => registrarPedidos('cofre', inventada, { raiz, regras })).toThrow(/não é regra de nenhum arquivo/);
    expect(lerPedidosDaPeca('cofre', { raiz }).pedidos).toHaveLength(1);
  });

  it('recusa o lugar que não existe no repositório', () => {
    const raiz = preparar();
    const ruim = { pedidos: [{ ...entrada.pedidos[0], ondeMora: 'procedural/criterios/inexistente.json' }] };
    expect(() => registrarPedidos('cofre', ruim, { raiz, regras: { 'coluna-e-faixa-de-teto': 'veiculo' } })).toThrow(/não existe no repositório/);
  });
});
