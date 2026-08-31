/* O canário exige silhuetas de origem, uma única malha e veredito explicitamente pendente. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirCascoVisualN6 } from './construir-casco-visual.mjs';

const aqui=dirname(fileURLToPath(import.meta.url));
describe('canário de casco visual N6',()=>{
  it('mantém a interseção de silhuetas como evidência negativa, apesar das métricas',()=>{
    const r=construirCascoVisualN6();
    expect(r.estado).toBe('reprovado-inspecao-individual');
    expect(r.qualidadeNumerica).toBe('diagnostico-nao-promocional');
    expect(r.inspecaoIndividual.vereditoGlobal).toBe('reprovado');
    expect(r.malha.vertices).toBeGreaterThan(500);
    expect(r.malha.triangulos).toBeGreaterThan(800);
    expect(r.malha.componentes).toBe(1);
    for(const vista of ['frontal','lateral','superior']){expect(r.vistas[vista].iouSilhueta).toBeGreaterThan(.3);expect(r.vistas[vista].veredito).toBe('reprovado');expect(r.vistas[vista].motivo).toBeTruthy();expect(existsSync(resolve(aqui,'evidencias',r.vistas[vista].render))).toBe(true);expect(r.inspecaoIndividual.evidencias[vista].render.sha256).toMatch(/^[a-f0-9]{64}$/);}
    expect(r.vistas.perspectiva.veredito).toBe('reprovado');
    /* Constrói o casco completo e captura quatro vistas; o trabalho real passa
       dos 5 s padrão quando a suíte roda em paralelo. */
  }, 30000);
});
