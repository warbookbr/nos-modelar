# Mecanifica

Oficina de autoria procedural e bancada de inspeção usadas para criar as peças
do simulador 3D Mecanifica com auxílio de IA.

## Entrar na mecânica

- 🔧 **[Abrir a Mecânica](https://warbookbr.github.io/mecanica/)** — experiência do cliente, publicada pelo repositório [`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).
- 🧰 **[Abrir a bancada de inspeção](https://warbookbr.github.io/nos-mecanifica/bancada.html)** — examine, isole e exploda as peças do modelo.

O primeiro módulo do produto mostra um sistema de freio a disco dianteiro no
contexto do veículo. Este repositório produz e valida as peças que ele consome.

## Estado

Este repositório nasceu como uma cópia do
[`brigsd/nos`](https://github.com/brigsd/nos), mas conserva somente o núcleo
procedural, as peças, a bancada e as ferramentas necessárias à autoria. A
Oficina humana do NÓS foi retirada; sua fonte permanece no repositório original.
Cena, domínio automotivo e interface do cliente vivem em
[`warbookbr/mecanica`](https://github.com/warbookbr/mecanica). As duas peças
publicadas atravessam essa fronteira como JSON determinístico em
`pecas-resolvidas/`; o produto não executa o núcleo.

O NÓS ainda é um projeto experimental. Seu núcleo de autoria procedural é uma
fonte valiosa, mas não é tratado aqui como uma fundação pronta. Em especial, a
identidade de partes e a dependência de IDs posicionais ainda precisam evoluir
para que uma IA consiga criar e refinar modelos complexos com segurança.

A primeira ferramenta nova já está disponível em `bancada.html`: um estúdio
neutro com vistas previsíveis, seleção múltipla, isolamento, contexto fantasma,
explosão e URLs reproduzíveis. Ela encontrou e provou a correção de um defeito
semântico real no trem de pouso do drone herdado.

## Direção

- Three.js como camada visual e de interação.
- Geometria e simulações descritas por dados estruturados.
- Identidades semânticas persistentes, sem IDs internos como linguagem da IA.
- Funcionamento inteiramente estático no GitHub Pages.
- Núcleo de autoria independente do domínio automotivo e do renderizador.
- Melhorias gerais preparadas para possível contribuição ao NÓS original.

Para entender ou continuar o projeto:

- **[Comece pelo índice da Mecanifica](docs/mecanifica/INDEX.md)** — estado
  atual, estrutura do repositório, fontes de verdade e leitura por tipo de tarefa.
- [`docs/mecanifica/PLANO.md`](docs/mecanifica/PLANO.md) — roteiro vigente e
  próximo passo.
- [`docs/uso/MAPA.md`](docs/uso/MAPA.md) — inventário completo, gerado
  automaticamente, com um resumo de cada arquivo.

## Desenvolvimento

Para executar a bancada de autoria:

```bash
npm ci
npm run dev
```

Abra `http://localhost:5173/nos-mecanifica/bancada.html`. Para gerar a versão
estática da bancada usada pelo Pages:

```bash
npm run build
```

Para executar a experiência do cliente, use o repositório
[`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).

Os documentos em `docs/uso/`, `docs/rumo/` e `docs/historico/` descrevem o NÓS
herdado. Eles continuam úteis como referência técnica e histórica, mas não
definem o rumo da Mecanifica. Em caso de divergência, `docs/mecanifica/`
prevalece para este produto.

## Licença e origem

O código herdado do NÓS e as mudanças deste projeto permanecem sob a licença
[MIT](LICENSE). O histórico Git original foi preservado, e o remoto `source`
acompanha `brigsd/nos` para facilitar comparação e contribuições futuras.
