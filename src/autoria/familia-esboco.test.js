/* familia-esboco.test.js — a parte pura da conferência da família com o esboço: a dispensa, os três pontos, o esboço mínimo,
   o mapa de parâmetros e os achados que não dependem da peça executada (volume que o componente não tem). A conferência de
   verdade, com a família executada e o andaime traduzido do esboço, está em `tools/mecanifica/familia-com-esboco.test.mjs`. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerFamilia } from './familia.js';
import {
  chaveDaForma, conferirFamiliaContraEsboco, esbocoMinimo, motivoDaDispensa, parametrosDoComponente, pontosDaFamilia,
} from './familia-esboco.js';

const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));
const roda = () => lerFamilia(ler('../../tools/fixtures/familia-com-esboco/familia.json'));
const semEsboco = () => lerFamilia(ler('../../tools/fixtures/familia-chamavel/familia.json'));

describe('a dispensa', () => {
  it('família sem esboco diz que não tem vínculo, e não confere nada', () => {
    const motivo = motivoDaDispensa(semEsboco());
    expect(motivo).toMatch(/família 'tubo-de-prova' não declara 'esboco': não tem vínculo com um componente do esboço/);
    const resultado = conferirFamiliaContraEsboco({ contrato: semEsboco(), andaime: null, tabela: null, neutro: null });
    expect(resultado).toMatchObject({ estado: 'dispensada', ok: true, achados: [], motivo });
  });

  it('família com esboço e sem conferência diz que nenhuma parte está ligada a volume', () => {
    const bruta = ler('../../tools/fixtures/familia-com-esboco/familia.json');
    delete bruta.esboco.conferencia;
    const motivo = motivoDaDispensa(lerFamilia(bruta));
    expect(motivo).toMatch(/declara o componente 'roda' mas não declara 'esboco.conferencia': nenhuma parte dela está ligada a um volume/);
  });

  it('família com a conferência declarada não é dispensada', () => {
    expect(motivoDaDispensa(roda())).toBeNull();
  });
});

describe('os pontos, o mapa e o esboço mínimo', () => {
  it('os três pontos põem todos os parâmetros no mesmo extremo, na ordem mínimo, médio e máximo', () => {
    expect(pontosDaFamilia(roda())).toEqual([
      { ponto: 'minimo', parametros: { aro: 200, diametro: 300, largura: 60 } },
      { ponto: 'medio', parametros: { aro: 400, diametro: 600, largura: 200 } },
      { ponto: 'maximo', parametros: { aro: 600, diametro: 900, largura: 400 } },
    ]);
  });

  it('o mapa leva o parâmetro da família ao do componente, e só o que o mapa cita sai', () => {
    const bruta = ler('../../tools/fixtures/familia-com-esboco/familia.json');
    bruta.parametros.folga = { tipo: 'numero', unidade: 'mm', padrao: 1, minimo: 0, maximo: 5, medio: 2 };
    bruta.esboco.mapa = { diametro: 'diametro', largura: 'folga' };
    const contrato = lerFamilia(bruta);
    expect(parametrosDoComponente(contrato, { diametro: 610, aro: 420, largura: 125, folga: 3 })).toEqual({ diametro: 610, largura: 3 });
  });

  it('o esboço mínimo só instancia o componente, com o nome dele, e é o mesmo para os mesmos parâmetros', () => {
    const parametros = { diametro: 610, aro: 420, largura: 125 };
    const esboco = esbocoMinimo(roda(), parametros);
    expect(esboco.opcoes).toHaveLength(1);
    expect(esboco.opcoes[0].formas).toEqual([{ id: 'roda', usa: 'roda', parametros }]);
    expect(JSON.stringify(esbocoMinimo(roda(), parametros))).toBe(JSON.stringify(esboco));
    expect(chaveDaForma(roda(), 'pneu')).toBe('roda.pneu');
  });
});

describe('o volume que o componente não tem', () => {
  const andaime = { id: 'a', volumes: [{ id: 'roda-mancal', tipo: 'anel', centro: [0, 0, 0], eixo: 'x', raioExterno: 305, raioInterno: 210, espessura: 125 }] };
  const tabela = { 'roda.mancal': 'roda-mancal' };

  it('reprova dizendo a parte, a porta, a forma pedida e os volumes que existem, sem precisar da peça', () => {
    const resultado = conferirFamiliaContraEsboco({ contrato: roda(), andaime, tabela, neutro: null });
    expect(resultado.estado).toBe('reprovada');
    const dasPartes = resultado.achados.filter((a) => a.parte !== undefined);
    expect(dasPartes.map((a) => [a.codigo, a.parte, a.forma]).sort()).toEqual([
      ['volume-sem-andaime', 'cuboD', 'cuboD'], ['volume-sem-andaime', 'cuboE', 'cuboE'], ['volume-sem-andaime', 'disco', 'disco'], ['volume-sem-andaime', 'pneu', 'pneu'],
    ]);
    expect(dasPartes[0].mensagem).toMatch(/a parte 'cuboD' está ligada ao volume 'cuboD', e o componente 'roda' nessa configuração não tem esse volume no andaime \(volumes: mancal\)/);
    const daPorta = resultado.achados.find((a) => a.porta === 'cubo-externo');
    expect(daPorta).toMatchObject({ codigo: 'volume-sem-andaime', forma: 'cuboD' });
    expect(resultado.portasSemVinculo).toEqual([]);
  });
});
