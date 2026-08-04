# Montagens semânticas

Este documento separa o que a bancada já consulta do que ainda seria uma
montagem persistida. Ele não autoriza trabalho novo; candidatos ficam no
backlog.

## Modelo

Uma montagem futura terá instâncias de peças, partes nomeadas, portas e relações
de posição. A origem semântica identifica o que foi criado. A porta descreve
uma superfície ou referência publicável. A relação descreve intenção, não um
UUID de renderizador.

Invariantes:

- a mesma receita e os mesmos parâmetros reproduzem a mesma peça;
- identidade não depende de índice de array ou posição do passo;
- origem, parte, grupo e porta precisam resolver sem ambiguidade;
- uma relação inválida falha e não altera o restante;
- exportação separa autoria procedural do produto cliente;
- montagem não pode esconder órfãos, faces sem identidade ou material inválido.

## Níveis de maturidade

| Nível | Estado atual | Evidência |
|---:|---|---|
| 0 | peça isolada na bancada | visor, estado e exportação |
| 1 | partes semânticas nomeáveis | `parte`, seleção e revisão de peças |
| 2 | grupos e portas publicáveis | painel de portas e `guarda:portas` |
| 3 | hierarquia e consulta de subárvore | bancada e `guarda:par` |
| 4 | contratos de pose, contato e interfaces | planos concluídos; sem montagem persistida |
| 5 | solver e montagem versionada | futuro, ainda não implementado |

Os níveis 0 a 3 são capacidades operacionais da bancada. O nível 4 tem
vocabulário e provas documentais, mas não é um produto de montagem. O nível 5
continua aberto.

## O que não existe

Não há arquivo de montagem canônico, solver de encaixe, pose persistida ou
resolução automática de contato. Não há autorização para criar esses artefatos
por copiar posições de câmera ou índices internos.

## Próximas perguntas

O backlog registra endereço único para grupo linear, interfaces de encaixe,
costuras de `lathe`, contatos locais e o custo de onboarding. Cada candidato
precisa de uma frase de intenção, uma identidade estável e uma prova fora do
domínio automotivo antes de tocar o núcleo.
