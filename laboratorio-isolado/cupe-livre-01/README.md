# Cupê livre 01 — experimento isolado

Este diretório é uma prova deliberadamente separada da Mecanifica. Ele não
importa código, contratos, schemas, receitas, renderizadores, dependências ou
assets do repositório hospedeiro.

## Hipótese

Uma IA pode obter uma forma automotiva melhor começando por uma receita visual
livre, pequena e específica, em vez de adaptar imediatamente o objeto aos
contratos gerais do produto.

## Conteúdo

- `receita-cupe.js`: proporções, estações da carroceria e cabine, rodas,
  materiais e detalhes semânticos;
- `motor.js`: gerador de lofts, rodas, arcos, detalhes, normais, materiais e
  visor WebGL 2, escrito do zero para esta prova;
- `index.html`: bancada autocontida com vistas canônicas e órbita.

O modelo não copia um automóvel comercial específico. É um cupê ficcional de
motor central inspirado na linguagem visual de um carro esportivo contemporâneo:
postura baixa e larga, nariz afilado, cabine avançada, anca traseira cheia,
entradas laterais e lanternas circulares.

## Execução

Abra `index.html` em um navegador com WebGL 2. Não há instalação, servidor ou
rede obrigatórios.

## Critério desta prova

Antes de discutir integração com o restante do projeto, julgue apenas o
artefato visual:

1. lê como carro esportivo italiano sem depender da cor;
2. frente, lateral, traseira e planta pertencem ao mesmo objeto;
3. rodas, cabine e carroceria parecem integradas;
4. frente e traseira são distinguíveis;
5. as massas sustentam refinamento posterior sem exigir recomeço imediato.

Se esses cinco itens não passarem visualmente, o experimento é reprovado; sua
independência arquitetural não conta como compensação.
