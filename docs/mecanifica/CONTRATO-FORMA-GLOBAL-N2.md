# Contrato de forma global N2

## Papel

Este contrato implementa a fatia N2 do plano ativo. Ele permite à IA declarar
um alvo mensurável, criar um andaime do objeto inteiro, compilar uma blocagem
neutra e decidir se a forma pode avançar. Não implementa superfície, detalhe,
decomposição, montagem ou regras de carro no núcleo.

## Fontes e derivados

São fontes editáveis:

- `mecanifica.alvo-forma-global@1`: envelope, landmarks, silhuetas, regiões
  obrigatórias, rejeições, limiares e orçamento;
- `mecanifica.andaime-global@1`: envelope pretendido, landmarks e volumes
  semânticos do objeto inteiro.

São derivados descartáveis:

- `mecanifica.blocagem-global@1`: triângulos neutros, envelope medido,
  procedência por volume/região e estatísticas;
- vistas SVG/PNG, máscaras de comparação, medições e decisões.

Índices de vértices e faces pertencem somente ao produto compilado. Identidade
autoral permanece nos IDs do alvo, andaime, landmark, volume e região.

## Vocabulário mínimo

A N2 aceita somente três volumes globais:

| Tipo | Intenção |
|---|---|
| `caixa` | massa retangular simples |
| `cilindro` | roda, eixo ou volume axial bruto |
| `prisma` | perfil convexo extrudado num eixo |

Esse vocabulário não pretende modelar superfície final. Ele existe para provar
postura, silhueta, proporção e completude antes de investir em N3. Perfil
côncavo, eixo contraditório, dimensão não positiva e orçamento excedido falham
antes de produzir uma blocagem.

## G01 — forma global medida

`mecanifica.avaliacao-forma-global@1` compara alvo e blocagem na mesma unidade e
nos mesmos eixos. O gate só aprova quando todos estes itens passam:

1. envelope derivado dentro do erro relativo permitido;
2. todos os landmarks presentes e dentro da tolerância;
3. todas as regiões globais obrigatórias representadas;
4. volumes e triângulos dentro do orçamento;
5. silhuetas frontal, direita e superior acima do IoU mínimo e abaixo do
   desvio máximo.

O comparador rasteriza separadamente os contornos do alvo e os triângulos da
blocagem. Uma média não esconde vista reprovada. Objeto parcial, cabine
achatada, landmark deslocado e estouro de orçamento são casos vermelhos do
corpus executável.

G01 é técnico. Ele não afirma que o objeto foi reconhecido.

## G02 — reconhecimento e aceite

`mecanifica.decisao-forma-global@1` só aprova quando:

- G01 está aprovado;
- uma crítica de papel `critico-visual-independente` registra o que reconheceu
  recebendo vistas neutras sem a identidade esperada;
- o usuário decide `aprovar` explicitamente.

Ausência de crítica ou de decisão mantém G02 `bloqueado`. Crítica ou usuário
reprovando torna a decisão `reprovado`. O autor não pode preencher o papel de
crítico independente e G01 verde não é convertido em reconhecimento implícito.

## Porta operacional

`criarServicoAutoria3DNativa().formaGlobal` expõe uma única fachada pura para
normalizar alvo/andaime, compilar, avaliar, decidir e renderizar evidências. O
provedor `forma-global-nativa` cobre somente `alvo`, `andaime` e `blocagem` no
planejador. Decomposição, integração, superfície, estados, revisão e publicação
continuam lacunas explícitas.

## Reexecução

```text
npx vitest run tools/mecanifica/forma-global-n2.test.mjs tools/mecanifica/forma-global-n2-caixa-preta.test.mjs
npm run autoria:n2:evidencias
npm run autoria:n2:evidencias:check
```

Os PNGs são conveniência de inspeção. Os SVGs, JSONs e hashes do manifesto são
os derivados textuais reexecutáveis. O alvo e o andaime versionados continuam
as fontes de verdade.

## Limites

N2 não prova qualidade de superfície, curvatura, vincos, aberturas, contato,
conectividade, cinemática ou carro final. A prova usa um veículo compacto bruto
apenas porque quatro rodas, postura, corpo e cabine oferecem leitura global
fácil de atacar. N4 continuará responsável pelo carro bruto produzido sobre a
representação de superfície escolhida em N3.
