# Backlog aberto

Este arquivo lista candidatos. Nenhum item é autorização de implementação.
Candidatos ligados à direção de autoria precisam respeitar as invariantes de
[`AUTORIA-IA.md`](../AUTORIA-IA.md) e
[`MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md).

| Candidato | Estado / próximo recorte |
|---|---|
| Separação espacial e impacto local | concluído na montagem v3; relação direcional genérica + mapa derivado, sem colisão geral |
| Caso 3 da homologação | ainda não iniciado |
| Formato canônico de montagem recursiva | definir o menor formato que instancia peças e montagens, preserva identidade e não copia autoria geométrica |
| Mapa de composição e dependências | impacto local e catálogo explícito entre raízes concluídos; descoberta implícita continua fora |
| Contexto de trabalho da IA | contexto estrutural, visual e roteiro de revalidação concluídos |
| Revalidação de dependentes | roteiro assistido concluído; automação permanece fora |
| Escrita transacional de receitas e montagens | revisões imutáveis e commit visível provados localmente; materialização e MCP/API continuam fora |
| Autoria por MCP | não definida; depende dos serviços internos de peça, montagem, contexto, transação e revalidação; não é continuação automática do plano de pacotes interrompido |
| Onboarding e custo de contexto | medir leitura e inspeção com o MCP aprovado, sem confundir economia de contexto com capacidade de autoria |
| Seleção de contexto pela IA | medir como a IA escolhe alvos, pares, subárvores e conjuntos sem carregar o sistema inteiro |
| Diagnóstico visual estruturado | ligar medidas e falhas a entidades visíveis por identidade semântica |
| Costuras topológicas de `lathe` | investigação de núcleo, sem alterar receita por atalho |
| Endereço único para grupo linear | capacidade semântica aberta |
| Abertura oblonga | ainda não expressável; não simular com pintura |
| Contrato genérico de materiais | capacidade futura, sem PBR ou paleta nova por implicação |
| Movimento e espaço varrido | futuro; exige montagem, pose e relações persistidas antes de solver ou cinemática geral |
| A-4, A-6, A-7, A-8, A-16 e A-29 | capacidades abertas comprovadas, sem inventar IDs novos |

## Ordem lógica, não ordem executiva

Algumas dependências já podem ser afirmadas sem abrir plano:

1. montagem persistida depende de identidade estável de peça e instância;
2. mapa de dependências depende de composição e relações persistidas;
3. contexto de trabalho depende do mapa;
4. revalidação automática depende de relações mensuráveis;
5. escrita por qualquer porta depende de serviço interno transacional;
6. MCP só entra depois que a capacidade interna estiver definida e provada.

Essa ordem não escolhe o primeiro plano nem autoriza implementação automática.
