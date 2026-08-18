# Baseline do motor procedural — R00

Esta é a linha de base executável antes da modularização. Ela congela o que a
fachada atual produz, não a organização interna que será substituída nas
próximas rodadas.

## Evidência

- Fachada pública: `prototipos/procedural/v3/motor/oficina.js`.
- Implementação única: `prototipos/procedural/v3/motor/nucleo.js`.
- Foto após R04: 2.670 linhas no núcleo, SHA-256
  `f82e4917089232bb5fbfd7d5b8a201d881cb542e31eb983716f05d0c15abbf8b`,
  fachada de 14 linhas, 20 módulos no diretório e 55 consumidores de código.
- Separação R01: núcleo geométrico e canônico em `nucleo.js`; projeção visual
  em `adaptador.js`; animação/skinning em `animacao.js`; orquestração em
  `executor.js`. A fachada passou a expor 19 entradas: as 16 compatíveis e o
  registro explícito de operações da R02.
- R03 concluída: as 32 operações vivem em grupos próprios; o núcleo mantém
  estado, serviços, execução, diagnóstico e canônico, sem corpo de operação.
- R04 concluída: a malha retorna o artefato `mecanifica.malha-poligonal@1`,
  procedência por entidade final e grafo derivado de passos observados; esses
  campos não entram no canônico compatível.
- Superfície pública: 16 exportações; `nucleo`, `neutroCanonico`, `executar` e
  `adaptarV3` são as entradas mais usadas pelos consumidores atuais.
- Capacidades: 32 operações publicadas por `OPS`.
- Dependências diretas do motor: `./expressoes.js` e `earcut`.
- Corpus: 32 receitas sintéticas independentes, uma por operação, todas sem
  diagnóstico na baseline.
- Comparação: hash SHA-256 do neutro canônico, contagem de vértices, faces e
  diagnósticos por caso em
  `tools/oficina/fixtures/motor-r00-baseline.json`.
- Medição local de referência (Node/Vite deste ambiente): mediana de 2,904 ms
  para reexecutar o corpus; bundle da bancada de 705,86 kB minificado
  (187,79 kB gzip). Após R02, o bundle mede 708,51 kB (188,78 kB gzip):
  aumento de 2,65 kB pela infraestrutura do registro. A variação de memória é observável por comando, mas não é
  limite de regressão porque o coletor do Node não oferece estabilidade entre
  máquinas.

## Como conferir

```sh
npm run arquitetura:motor
npm run arquitetura:motor:check
npm run baseline:motor
npm run baseline:motor:medir
```

`arquitetura:motor` deriva o mapa atual de imports, exportações, operações,
módulos e consumidores de código. `baseline:motor` falha se uma saída canônica
mudar. Atualizar a baseline é uma decisão explícita de contrato, nunca uma
forma de esconder regressão.

## Limite desta rodada

O corpus mede compatibilidade funcional; não é benchmark de desempenho nem
substitui os testes especializados de malha, identidade, portas, animação ou
exportação. Tempo, memória e bundle passam a ser medidos antes e depois de cada
rodada que mover execução, com o mesmo comando e ambiente registrados no PR.
