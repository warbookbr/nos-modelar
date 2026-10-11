/* A sapata deslocada 30 mm em +x, com a tolerância de envelope no teto (50 mm) para o refinamento deixá-la passar: quem reprova é o G01 da malha. */
import { receitaDoSuporte } from '../suporte.js';

export default receitaDoSuporte({ alvo: true, sapataEmX: 30, tolerancia: { envelope: 50, porta: 0.5 } });
