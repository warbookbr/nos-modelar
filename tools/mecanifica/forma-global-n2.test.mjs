/* Provas unitárias e adversariais do contrato, G01, G02 e render N2. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ErroFormaGlobal, avaliarFormaGlobal, compilarBlocagemGlobal, decidirFormaGlobal,
  normalizarAlvoFormaGlobal, normalizarAndaimeGlobal,
} from '../../src/autoria/forma-global.js';
import { renderizarPainelFormaGlobalSvg, renderizarVistaFormaGlobalSvg } from '../../src/autoria/renderizar-forma-global-svg.js';

const ler = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/autoria-n2/${nome}`, import.meta.url), 'utf8'));
const alvo = () => ler('alvo-veiculo-compacto.json');
const andaime = () => ler('andaime-veiculo-compacto.json');
const compilar = (a = alvo(), b = andaime()) => compilarBlocagemGlobal({ alvo: a, andaime: b });

describe('N2 — contrato e compilação de forma global', () => {
  it('normaliza alvo e andaime de modo determinístico, sem identidade de runtime', () => {
    const a = normalizarAlvoFormaGlobal(alvo()), b = normalizarAndaimeGlobal(andaime());
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(b.volumes)).toBe(true);
    expect(JSON.stringify(a)).toBe(JSON.stringify(normalizarAlvoFormaGlobal(alvo())));
    expect(JSON.stringify(b)).not.toMatch(/uuid|timestamp|camera|[A-Z]:\\/i);
    expect(b.volumes.map(({ id }) => id)).toEqual([...b.volumes.map(({ id }) => id)].sort());
  });

  it('compila blocagem inteira, neutra e dentro do orçamento', () => {
    const blocagem = compilar();
    expect(blocagem).toMatchObject({
      formato: 'mecanifica.blocagem-global@1', familia: 'veiculo',
      estatisticas: { volumes: 6, triangulos: 284 },
      envelopeDerivado: { min: [-930, 0, -2100], max: [930, 1450, 2150] },
    });
    expect(new Set(blocagem.volumes.map(({ regiao }) => regiao))).toEqual(new Set(['cabine', 'corpo-base', 'rodas-dianteiras', 'rodas-traseiras']));
    expect(blocagem.malha.faces.every(({ volume, regiao }) => typeof volume === 'string' && typeof regiao === 'string')).toBe(true);
  });

  it('recusa perfil côncavo e estouro de orçamento antes de produzir derivado', () => {
    const concavo = andaime();
    concavo.volumes[0].perfil = [[0, 0], [100, 0], [40, 30], [100, 100], [0, 100]];
    expect(() => normalizarAndaimeGlobal(concavo)).toThrowError(expect.objectContaining({ codigo: 'poligono-nao-convexo' }));

    const curto = alvo(); curto.orcamento.volumesMaximos = 5;
    expect(() => compilar(curto)).toThrowError(expect.objectContaining({ codigo: 'orcamento-excedido' }));
  });
});

describe('N2 — G01 forma global medida', () => {
  it('aprova envelope, landmarks, regiões e três silhuetas da prova inteira', () => {
    const resultado = avaliarFormaGlobal({ alvo: alvo(), blocagem: compilar() });
    expect(resultado.estado).toBe('aprovado');
    expect(resultado.diagnosticos).toEqual([]);
    expect(resultado.vistas.map(({ id, estado }) => [id, estado])).toEqual([
      ['frontal', 'aprovada'], ['direita', 'aprovada'], ['superior', 'aprovada'],
    ]);
    expect(resultado.vistas.every(({ metricas }) => metricas.iou >= 0.9 && metricas.desvioMaximo <= 0.04)).toBe(true);
  });

  it('reprova a mesma estratégia quando cabine e landmark perdem a proporção', () => {
    const mutado = andaime();
    const cabine = mutado.volumes.find(({ id }) => id === 'cabine-global');
    cabine.perfil = cabine.perfil.map(([z, y]) => [z, y > 1000 ? y - 500 : y]);
    mutado.landmarks.find(({ id }) => id === 'pico-cabine').posicao[1] -= 500;
    const resultado = avaliarFormaGlobal({ alvo: alvo(), blocagem: compilar(alvo(), mutado) });
    expect(resultado.estado).toBe('reprovado');
    expect(resultado.diagnosticos.map(({ codigo }) => codigo)).toEqual(expect.arrayContaining(['silhueta-reprovada', 'landmark-fora-da-tolerancia']));
  });

  it('reprova objeto parcial mesmo quando os volumes restantes são válidos', () => {
    const parcial = andaime(); parcial.volumes = parcial.volumes.filter(({ regiao }) => !regiao.startsWith('rodas-'));
    const resultado = avaliarFormaGlobal({ alvo: alvo(), blocagem: compilar(alvo(), parcial) });
    expect(resultado.estado).toBe('reprovado');
    expect(resultado.regioes).toEqual({ estado: 'reprovado', ausentes: ['rodas-dianteiras', 'rodas-traseiras'] });
    expect(resultado.diagnosticos.some(({ codigo }) => codigo === 'regiao-global-ausente')).toBe(true);
  });

  it('reprova envelope declarado que tenta esconder o envelope realmente avaliado', () => {
    const desonesto = andaime(); desonesto.envelope = { min: [-500, 100, -1000], max: [500, 900, 1000] };
    const resultado = avaliarFormaGlobal({ alvo: alvo(), blocagem: compilar(alvo(), desonesto) });
    expect(resultado.estado).toBe('reprovado');
    expect(resultado.envelope.estado).toBe('reprovado');
    expect(resultado.diagnosticos.some(({ codigo }) => codigo === 'envelope-reprovado')).toBe(true);
  });
});

describe('N2 — G02 e evidência visual', () => {
  const avaliacaoAprovada = () => avaliarFormaGlobal({ alvo: alvo(), blocagem: compilar() });
  const critica = (estado = 'reconhecida') => ({
    formato: 'mecanifica.critica-forma-global@1', papel: 'critico-visual-independente',
    contexto: 'vistas-neutras-sem-identidade-do-alvo', blocagem: 'andaime-veiculo-compacto-n2-blocagem',
    estado, rotulo: estado === 'reconhecida' ? 'veículo compacto' : null, achados: [],
  });

  it('não converte G01 verde em reconhecimento ou aceite implícito', () => {
    expect(decidirFormaGlobal({ avaliacao: avaliacaoAprovada(), critica: null, decisaoUsuario: null })).toMatchObject({
      estado: 'bloqueado', motivo: 'critica-ou-decisao-ausente', gates: { g01: 'aprovado', g02: 'bloqueado' },
    });
    expect(decidirFormaGlobal({ avaliacao: avaliacaoAprovada(), critica: critica(), decisaoUsuario: null }).estado).toBe('bloqueado');
  });

  it('fecha G02 somente com crítica reconhecida e decisão explícita do usuário', () => {
    expect(decidirFormaGlobal({ avaliacao: avaliacaoAprovada(), critica: critica(), decisaoUsuario: 'aprovar' })).toMatchObject({
      estado: 'aprovado', gates: { g01: 'aprovado', g02: 'aprovado' }, decisaoUsuario: 'aprovar',
    });
    expect(decidirFormaGlobal({ avaliacao: avaliacaoAprovada(), critica: critica('reprovada'), decisaoUsuario: null }).estado).toBe('reprovado');
  });

  it('gera vistas neutras e painel sem revelar a identidade esperada', () => {
    const blocagem = compilar();
    const vista = renderizarVistaFormaGlobalSvg({ alvo: alvo(), blocagem, vista: 'direita' });
    const painel = renderizarPainelFormaGlobalSvg({ alvo: alvo(), blocagem });
    expect(vista).toContain('<svg');
    expect(vista).toContain('data-regiao="cabine"');
    expect(painel.match(/material neutro/g)).toHaveLength(4);
    expect(`${vista}${painel}`).not.toMatch(/veículo|carro|compacto/i);
    const cega = renderizarVistaFormaGlobalSvg({ alvo: alvo(), blocagem, vista: 'direita', mostrarAlvo: false, exporSemantica: false });
    expect(cega).not.toMatch(/data-regiao|data-volume|cabine|roda|corpo/i);
  });

  it('usa erro tipado e acionável para contexto divergente', () => {
    const ruim = andaime(); ruim.alvo = 'outro-alvo';
    expect(() => compilar(alvo(), ruim)).toThrowError(expect.objectContaining({
      name: 'ErroFormaGlobal', codigo: 'alvo-divergente', caminho: 'andaime.alvo',
    }));
    expect(ErroFormaGlobal.prototype).toBeInstanceOf(Error);
  });
});
