# Histórico da Mecanifica

Esta zona guarda experimentos e relatórios encerrados DESTE produto. Eles
explicam decisões e limites medidos, mas não governam trabalho novo. Contratos
atuais ficam na raiz de `docs/mecanifica/`; pendências ficam em
`planos/BACKLOG.md`.

Não confundir com [`../../nos-herdado/README.md`](../../nos-herdado/README.md),
que guarda documentos do projeto de onde a Mecanifica foi clonada: a Oficina
humana, o Playground e a aplicação jogável, que não existem mais aqui.

| Arquivo | O que prova |
|---|---|
| [`REGISTRO-FALHAS-AUTORIA-V.md`](REGISTRO-FALHAS-AUTORIA-V.md) | as 38 falhas medidas da autoria (V-01 a V-38); leitura obrigatória antes de reabrir hipótese de forma |
| [`EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md) | medição cega do efeito do fluxo sobre modeladores |
| [`EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md) | prova isolada do perfil de autoria realista |
| [`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md) | execução, limites e decisão de não integrar a roda |
| [`RELATORIO-PONTE-THREE.md`](RELATORIO-PONTE-THREE.md) | evidência da ponte entre receita procedural e apresentação |
| [`OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) | análise histórica de dependências e candidatos |
| [`EXPERIMENTO-CARRO-SEM-APOIO.md`](EXPERIMENTO-CARRO-SEM-APOIO.md) | o que outra IA fez ao modelar um carro do zero, sem o núcleo procedural, e por que o código dela saiu do repositório |

Os arquivos podem ser consultados para contexto e evidência. Nenhum deles abre
plano, altera o contrato ou autoriza implementação.

## O que chegou aqui em 2026-09-11

A raiz de `docs/mecanifica/` tinha 52 documentos soltos, misturando contrato
vivo com evidência de etapa vencida. Dezoito vieram para cá, e o critério foi
sempre o que o próprio documento diz de si:

- declararam-se fora de vigor: [`PLANO.md`](PLANO.md), aposentado em agosto, e
  [`CHASSI-P0-ALVO-E-LIMIARES.md`](CHASSI-P0-ALVO-E-LIMIARES.md), cujos
  landmarks foram inventados pela IA e não medidos;
- são rastreio de fase de plano já encerrado:
  [`MALHA-OTIMIZADA-PROGRESSO.md`](MALHA-OTIMIZADA-PROGRESSO.md),
  [`REORGANIZACAO-POR-USO-PROGRESSO.md`](REORGANIZACAO-POR-USO-PROGRESSO.md) e
  [`LABORATORIO-IA-PROGRESSO.md`](LABORATORIO-IA-PROGRESSO.md);
- descrevem subsistema que saiu do repositório:
  [`DOSSIE-LABORATORIO-IA.md`](DOSSIE-LABORATORIO-IA.md), 848 linhas sobre o
  laboratório que foi incubado e mudou de casa em setembro;
- são dossiê ou matriz de plano encerrado:
  [`DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md`](DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md),
  [`DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md`](DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md),
  [`DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md`](DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md),
  [`MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md`](MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md),
  [`FLUXO-AUTORIA-N1.md`](FLUXO-AUTORIA-N1.md) e
  [`PROTOCOLO-DIAGNOSTICO-MOTOR.md`](PROTOCOLO-DIAGNOSTICO-MOTOR.md);
- são evidência de etapa vencida do chassi e das sondas:
  [`CHASSI-P1-CONTRATO-DA-CAGE.md`](CHASSI-P1-CONTRATO-DA-CAGE.md),
  [`ALVO-N6-CUPE-ESPORTIVO.md`](ALVO-N6-CUPE-ESPORTIVO.md),
  [`CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md`](CONJUNTO-PROVA-AUTORIA-GEOMETRICA.md) e
  [`BASELINE-MOTOR-R00.md`](BASELINE-MOTOR-R00.md), que congela o motor antes da
  modularização que já aconteceu;
- são estudo fechado: [`DOSSIE-CABO-DE-PA.md`](DOSSIE-CABO-DE-PA.md), a
  comparação de nove materiais, e
  [`BICICLETA-REALISTA-ATRITOS.md`](BICICLETA-REALISTA-ATRITOS.md), os atritos
  medidos ao modelar a bicicleta.

Em seguida veio a pasta `evidencias/`, que guardava um único conjunto: a prova
N2 da forma global, com o alvo do cupê esportivo, o andaime de blocagem e os
três vereditos — G00 bloqueado, G01 e G02 reprovados. É registro de etapa
reprovada, e o único leitor dele é o relatório N2, que já era histórico. Está em
[`evidencias-n2-forma-global/`](evidencias-n2-forma-global/), e o gerador
continua em `tools/mecanifica/gerar-evidencias-forma-global-n2.mjs` para quem
quiser reexecutar o pacote inteiro.

Junto saiu o comando `autoria:n2:evidencias:check`, que comparava o manifesto
com a pasta e acusava dezessete arquivos divergentes desde agosto, porque os SVG
e PNG derivados nunca foram versionados. Ninguém viu porque ele não estava na
lista de gates: régua vermelha que ninguém roda não protege nada e ensina que
vermelho é normal.

Por último veio `projetos/ciclo6/`, pasta de um ocupante só: o registro da
rodada de agosto em que quatro atritos do motor — A-30, A-34, A-36 e A-37 —
foram atacados em paralelo, com duas propostas independentes cada, cruzamento e
veredito. Está em [`ciclo6/`](ciclo6/). O `criticas.json` cita a prancha do
freio pelo caminho de agosto, e esse endereço morto é tolerado de propósito, com
motivo escrito na allowlist de `tools/mapa/links.mjs`: corrigir ali seria
reescrever evidência encerrada.

Ficaram na raiz os contratos vivos, incluindo as quatro versões de montagem
persistida — a v1 ainda é citada como contrato por uma skill — e o dossiê do
modelador inverso, que é vinculante para um plano congelado e não para um
encerrado.
