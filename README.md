# Mecanifica

Simulador 3D interativo para explicar, de forma visual, como sistemas automotivos
funcionam, por que falham e o que pode acontecer quando um reparo é adiado.

O primeiro módulo será um sistema de freio a disco dianteiro dentro de uma oficina
navegável. A pessoa poderá inspecionar as peças, separar o conjunto, comparar
estados de desgaste e acompanhar explicações orientadas ao cliente.

## Estado

O projeto está no início da transição. Este repositório nasceu como uma cópia do
[`brigsd/nos`](https://github.com/brigsd/nos) e ainda contém o Atelier v3 completo
em `prototipos/fps/v3/`. Essa base permanece executável enquanto construímos a
nova aplicação em Three.js.

O NÓS ainda é um projeto experimental. Seu núcleo de autoria procedural é uma
fonte valiosa, mas não é tratado aqui como uma fundação pronta. Em especial, a
identidade de partes e a dependência de IDs posicionais ainda precisam evoluir
para que uma IA consiga criar e refinar modelos complexos com segurança.

## Direção

- Three.js como camada visual e de interação.
- Geometria e simulações descritas por dados estruturados.
- Identidades semânticas persistentes, sem IDs internos como linguagem da IA.
- Funcionamento inteiramente estático no GitHub Pages.
- Núcleo de autoria independente do domínio automotivo e do renderizador.
- Melhorias gerais preparadas para possível contribuição ao NÓS original.

Leituras principais:

- [`docs/mecanifica/VISAO.md`](docs/mecanifica/VISAO.md)
- [`docs/mecanifica/ARQUITETURA.md`](docs/mecanifica/ARQUITETURA.md)
- [`docs/mecanifica/PLANO.md`](docs/mecanifica/PLANO.md)
- [`docs/mecanifica/AUTORIA-IA.md`](docs/mecanifica/AUTORIA-IA.md)
- [`docs/mecanifica/UPSTREAM-NOS.md`](docs/mecanifica/UPSTREAM-NOS.md)

## Base herdada

Para executar a nova aplicação:

```bash
npm ci
npm run dev
```

O endereço local é `http://localhost:5173/nos-mecanifica/`. Para gerar a versão
estática usada pelo Pages:

```bash
npm run build
```

Para executar somente o Atelier herdado:

```bash
npm run servir
```

Depois, abra `http://localhost:8080/jogo.html`.

Os documentos em `docs/uso/`, `docs/rumo/` e `docs/historico/` descrevem o NÓS
herdado. Eles continuam úteis como referência técnica e histórica, mas não
definem o rumo da Mecanifica.

## Licença e origem

O código herdado do NÓS e as mudanças deste projeto permanecem sob a licença
[MIT](LICENSE). O histórico Git original foi preservado, e o remoto `source`
acompanha `brigsd/nos` para facilitar comparação e contribuições futuras.
