/* exportar-peca.test.ts — A-60: a peça vira DADO.

   POR QUE ISTO EXISTE. Hoje o produto baixa a receita (`PASSOS`) e o núcleo
   inteiro, e monta a peça dentro do navegador do cliente. A Mecanifica não
   precisa disso: o cliente OLHA, gira, explode e isola. Nenhuma dessas quatro
   coisas depende de reexecutar a receita — explodir e isolar mexem em partes
   que já têm nome, e o nome viaja junto com a face.

   Então o núcleo roda AQUI, uma vez, e grava o resultado. O produto lê o
   arquivo. O núcleo nunca chega ao cliente.

   O RISCO QUE ESTE ARQUIVO COBRA. Um artefato salvo é a coisa mais cara de
   desfazer neste projeto, porque outro repositório passa a depender do formato.
   O CLAUDE.md cobra quatro adjetivos dele: determinístico, versionado,
   reexecutável e validável. Os quatro viram caso aqui, e mais o quinto que a
   experiência do gabarito ensinou — o arquivo tem de saber dizer que está
   VELHO, senão o produto mostra a peça de ontem e ninguém percebe. */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — ferramenta em JavaScript, exercitada pela API pública.
import { conferirSemOrfaos, exportarPeca, lerPecaResolvida, FORMATO, VERSAO } from './exportar-peca.mjs';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — bancada em JavaScript.
import { executarNucleoDaPeca } from '../bancadas/estado-peca.mjs';

const PECA = 'freio-disco';
const FONTE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'exportar-peca.mjs'),
  'utf8',
).replace(/\r\n/g, '\n');
const CLI = join(dirname(fileURLToPath(import.meta.url)), 'exportar.mjs');
const MANIFESTO = join(dirname(fileURLToPath(import.meta.url)), '../../pecas-resolvidas/manifesto.json');

describe('A-60 — a peça exportada é dado, e o dado se defende', () => {
  it('★ é DETERMINÍSTICO: exportar duas vezes dá o MESMO texto, byte a byte', async () => {
    /* se esta falhar, tudo o mais neste arquivo é decoração: um artefato que
       muda sozinho não pode ser comparado, nem versionado, nem validado. */
    const a = await exportarPeca(PECA);
    const b = await exportarPeca(PECA);
    expect(a.texto).toBe(b.texto);
  });

  it('é VERSIONADO: declara formato e versão antes de qualquer dado', async () => {
    const { dado } = await exportarPeca(PECA);
    expect(dado.formato).toBe(FORMATO);
    expect(dado.versao).toBe(VERSAO);
    /* quem lê primeiro tem de conseguir recusar um arquivo que não entende,
       antes de tentar interpretar a geometria. */
    expect(Object.keys(dado).slice(0, 2)).toEqual(['formato', 'versao']);
  });

  it('carrega o que o produto precisa: geometria, material, parte e meta', async () => {
    const { dado } = await exportarPeca(PECA);
    expect(dado.peca).toBe(PECA);
    expect(dado.V.length).toBeGreaterThan(0);
    expect(dado.F.length).toBeGreaterThan(0);

    /* isolar e explodir são operações sobre PARTE. Sem nome de parte no
       arquivo, as duas viram impossíveis do outro lado. */
    expect(dado.partes.length, 'sem parte não há isolar nem explodir').toBeGreaterThan(0);
    expect(dado.partes).toEqual([...dado.partes].sort());
    expect(dado.partes).toContain('disco');
    expect(dado.partes).toContain('pinca');

    /* a face guarda só o NOME do material; sem o dicionário o produto não sabe
       pintar. */
    for (const f of dado.F) {
      const material = f[3];
      if (material !== null) expect(Object.keys(dado.materiais)).toContain(material);
    }
    expect(dado.meta.nome).toBe(PECA);
  });

  it('★ `meta` atravessa por LISTA BRANCA: só `nome`, e nada mais', async () => {
    /* MEDIDO ANTES DE DECIDIR: o produto lê UM campo, `meta.nome`, em
       `src/main.js`, para nomear a raiz do grupo Three.js. O arquivo carregava
       cinco: nome, tipo, desc, fechada e colisao.

       Os quatro extras não são inofensivos por serem pequenos. Eles são
       superfície de formato que ninguém revisou, atravessando a fronteira entre
       dois repositórios. `colisao` é dado de AUTORIA, com float cru, nascido de
       outro propósito. `desc` é descrição do autor, e o texto que o cliente lê
       pertence hoje ao domínio do produto.

       Campo que ganhar consumidor real entra numa versão nova do formato, com
       teste próprio. Entrar "porque já estava lá" é como toda superfície de
       compatibilidade começa. */
    const { dado } = await exportarPeca(PECA);
    expect(Object.keys(dado.meta)).toEqual(['nome']);
    expect(dado.meta.nome).toBe(PECA);

    /* a receita desta peça publica os cinco. Se ela publicasse só o nome, este
       caso passaria sem provar nada. */
    // @ts-expect-error — peça em JavaScript, carregada em runtime pelo Vitest.
    const receita: any = await import('../../prototipos/procedural/v3/pecas/freio-disco.js');
    expect(Object.keys(receita.meta).sort(), 'a peça de teste precisa publicar mais que o nome')
      .toEqual(['colisao', 'desc', 'fechada', 'nome', 'tipo']);

    /* e o texto gravado não leva os quatro por outro caminho. */
    const { texto } = await exportarPeca(PECA);
    const bloco = texto.slice(texto.indexOf('"meta"'), texto.indexOf('"materiais"'));
    for (const campo of ['colisao', 'desc', 'fechada', 'tipo']) {
      expect(bloco, `'${campo}' vazou para o meta exportado`).not.toContain(`"${campo}"`);
    }
  });

  it('★ é REEXECUTÁVEL: o arquivo bate com o que o núcleo produz agora', async () => {
    /* a promessa central. Se o arquivo e o núcleo divergirem, o produto mostra
       uma peça que este repositório não sabe mais construir. */
    const { dado, doNucleo } = await exportarPeca(PECA);
    expect(dado.V).toEqual(doNucleo.V);
    expect(dado.F).toEqual(doNucleo.F);
  });

  it('★ sabe dizer que está VELHO: a receita entra por impressão digital', async () => {
    /* o risco real do dia a dia não é o arquivo nascer errado. É alguém mudar a
       peça e esquecer de gerar de novo. Para o gate acusar isso, o arquivo tem
       de carregar uma marca da RECEITA que o gerou, e não só do resultado. */
    const { dado } = await exportarPeca(PECA);
    expect(dado.receita).toMatch(/^[0-9a-f]{16}$/);

    const outra = await exportarPeca('roda-dianteira');
    expect(outra.receita, 'receitas diferentes não podem ter a mesma marca').not.toBe(dado.receita);
  });

  it('★ a marca da receita MUDA quando a receita muda', async () => {
    /* sem este caso, o de cima passaria com uma marca constante. Mexo num
       parâmetro e exijo que a marca acuse. */
    const original = await exportarPeca(PECA);
    const mexida = await exportarPeca(PECA, { paramsExtra: { discoRaio: 0.999 } });
    expect(mexida.dado.receita).not.toBe(original.dado.receita);
  });

  it('★ a marca é da ENTRADA, não do RESULTADO — e é por isso que ela existe', async () => {
    /* este é o caso que JUSTIFICA a escolha. Se a marca fosse do resultado, ela
       seria mais simples e pareceria funcionar: mudei um raio, a geometria
       mudou, a marca mudou. O buraco aparece na mudança que NÃO mexe na
       geometria — trocar a cor de um material, renomear um parâmetro. O produto
       mostraria a cor de ontem e nenhum gate acusaria.

       Aqui entra um parâmetro que a peça não usa. A geometria fica IDÊNTICA e a
       marca tem de mudar assim mesmo. Uma marca de resultado passaria neste
       caso sem notar nada. */
    const original = await exportarPeca(PECA);
    const inerte = await exportarPeca(PECA, { paramsExtra: { esteParametroNinguemUsa: 1 } });

    expect(inerte.dado.V, 'o parâmetro é inerte de propósito: a geometria não muda')
      .toEqual(original.dado.V);
    expect(inerte.dado.F).toEqual(original.dado.F);
    expect(inerte.dado.receita, 'a entrada mudou, então a marca tem de mudar')
      .not.toBe(original.dado.receita);
  });

  it('não guarda relógio nem sorteio: o artefato não tem data nem aleatório', async () => {
    /* `Date.now()` e `Math.random()` crus não entram em artefato reproduzível.
       Uma data gravada faria o arquivo mudar a cada execução e destruiria o
       primeiro caso deste arquivo sem ninguém entender por quê. */
    const { texto } = await exportarPeca(PECA);
    expect(texto).not.toMatch(/"(data|gerado|geradoEm|timestamp|quando)"/);
    expect(texto).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it('★ transporta portas e ainda recusa capacidade que o formato não suporta', async () => {
    /* Portas agora viajam como lista opcional e o leitor preserva o contrato;
       esqueleto continua fora do formato e deve gritar, não sumir. */
    const { dado } = await exportarPeca(PECA);
    const lida = lerPecaResolvida(dado);
    expect(dado.portas.map((p: any) => p.nome)).toEqual(['pilotoDaRoda']);
    expect(lida.portas.get('pilotoDaRoda')?.interface).toMatchObject({ forma: 'cilindro', papel: 'externa' });

    /* A fixture neutra prova a forma nova: o rótulo pode ser humano sem mudar
       o id que outras receitas citam. Exportar e ler preservam ambos. */
    const jardineira = await exportarPeca('_jardineira');
    expect(jardineira.dado).toMatchObject({ peca: '_jardineira' });
    expect(jardineira.dado.portas).toContainEqual(expect.objectContaining({
      id: 'peDoCaule', rotulo: 'Base enterrada do caule',
    }));
    expect(lerPecaResolvida(jardineira.dado).portas.get('peDoCaule')).toMatchObject({
      id: 'peDoCaule', rotulo: 'Base enterrada do caule',
    });
    const reexecutada = await exportarPeca('_jardineira');
    expect(reexecutada.texto).toBe(jardineira.texto);

    /* A fixture neutra do AUT-2026-15 atravessa o formato sem perder a origem
       derivada da cópia nem esconder a mão espelhada. O arquivo continua dado
       puro: releitura não reexecuta a receita para descobrir a porta. */
    const derivada = await exportarPeca('_portas-espelho-arranja');
    const derivadaLida = lerPecaResolvida(derivada.dado);
    expect(derivadaLida.portas.get('encaixeLinearUltimo')).toMatchObject({
      id: 'encaixeLinearUltimo', de: { op: 'arranja', id: 804, copia: 'ultima' },
    });
    expect(derivadaLida.portas.get('encaixeEspelhado')).toMatchObject({
      id: 'encaixeEspelhado', interface: { mao: 'espelhada' },
    });
    expect((await exportarPeca('_portas-espelho-arranja')).texto).toBe(derivada.texto);
    await expect(exportarPeca('_oficina-esqueleto'), 'esta peça tem esqueleto')
      .rejects.toThrow(/esqueleto/i);
    await expect(exportarPeca('_freio-hierarquia'), 'hierarquia ainda não atravessa o formato resolvido')
      .rejects.toThrow(/hierarquia de partes/i);

    /* e a recusa diz QUAL capacidade, senão obriga quem recebe a descobrir. */
    await expect(exportarPeca('_oficina-esqueleto')).rejects.toThrow(/o formato .* não transporta/i);
  });

  it('o leitor recusa porta malformada em vez de devolver uma peça muda', async () => {
    const { dado } = await exportarPeca(PECA);
    expect(() => lerPecaResolvida({ ...dado, portas: [{ nome: 'x' }] })).toThrow(/porta inválida/);
  });

  it('as duas peças publicadas continuam exportando: a recusa não é geral', async () => {
    /* sem este caso, a guarda acima passaria com um exportador que recusa
       tudo — a condição que não pode falhar, ao contrário. */
    for (const nome of ['freio-disco', 'roda-dianteira']) {
      const { dado } = await exportarPeca(nome);
      expect(dado.peca).toBe(nome);
    }
  });

  it('recusa peça inexistente com diagnóstico, e não devolve arquivo vazio', async () => {
    /* referência inválida falha com diagnóstico; nunca vira no-op silencioso. */
    await expect(exportarPeca('_nao-existe-esta-peca')).rejects.toThrow(/_nao-existe-esta-peca/);
  });

  it('★ a publicação é atômica: a CLI recusa subconjunto de peças', () => {
    const antes = readFileSync(MANIFESTO, 'utf8');
    const r = spawnSync(process.execPath, [CLI, 'freio-disco'], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/publicação parcial não é suportada/i);
    expect(readFileSync(MANIFESTO, 'utf8'), 'a recusa não pode regravar o manifesto').toBe(antes);
  });

  it('★ recusa peça que o núcleo reprovou, repetindo o motivo dele', async () => {
    /* exportar uma peça com órfão publica no produto uma peça que este
       repositório sabe estar errada. Pior: o produto não tem como perceber,
       porque o arquivo chega com a mesma cara de um arquivo bom.

       A guarda é função pura e é provada aqui direto, com órfão fabricado —
       nenhuma peça do acervo tem órfão, e não vou quebrar uma só para o teste. */
    expect(() => conferirSemOrfaos('boa', [])).not.toThrow();

    const orfao = [{ passo: 2, op: 'transladar', ref: 'sel.alias', motivo: "alias 'x' inexistente" }];
    expect(() => conferirSemOrfaos('ruim', orfao)).toThrow(/ruim/);
    expect(() => conferirSemOrfaos('ruim', orfao), 'o motivo do núcleo tem de chegar a quem lê')
      .toThrow(/alias 'x' inexistente/);
  });

  it('★★ A PROVA QUE INTERESSA: o arquivo desenha a MESMA peça que a receita', async () => {
    /* este é o caso que sustenta a decisão inteira. Todos os outros conferem o
       arquivo por dentro; este pergunta a única coisa que o cliente percebe —
       o que aparece na tela é o mesmo?

       Dois caminhos até o triângulo:
         receita -> núcleo -> adaptador      (o de hoje, no navegador do cliente)
         receita -> núcleo -> ARQUIVO -> leitor -> adaptador   (o proposto)
       Se os dois não derem o mesmo triângulo, a troca é uma regressão
       disfarçada de otimização. */
    // @ts-expect-error — peça em JavaScript, carregada em runtime pelo Vitest.
    const mod: any = await import('../../prototipos/procedural/v3/pecas/freio-disco.js');

    const pelaReceita = adaptarThree(executarNucleoDaPeca(nucleo, mod), {
      nome: 'freio-disco', materiais: mod.MATERIAIS,
    });
    const { dado } = await exportarPeca(PECA);
    const peloArquivo = adaptarThree(lerPecaResolvida(dado), {
      nome: 'freio-disco', materiais: dado.materiais,
    });

    const triangulos = (raiz: any) => {
      const fora: any[] = [];
      raiz.traverse((o: any) => {
        if (!o.isMesh) return;
        const p = o.geometry.getAttribute('position');
        /* a NORMAL entra junto, e não por capricho. Comparar só posição deixa
           passar a perda do sombreado liso: os triângulos ficam no mesmo lugar
           e a superfície vira facetada na tela do cliente. Descobri isso
           mutando o leitor para ignorar `liso` — a mutação sobreviveu com esta
           função olhando só `position`. */
        const nrm = o.geometry.getAttribute('normal');
        fora.push([
          o.name, p.count,
          [...p.array].map((v: number) => Number(v.toFixed(6))),
          nrm ? [...nrm.array].map((v: number) => Number(v.toFixed(6))) : null,
        ]);
      });
      return fora.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    };

    const a = triangulos(pelaReceita.raiz), b = triangulos(peloArquivo.raiz);
    expect(b.length, 'o arquivo tem de gerar as mesmas malhas').toBe(a.length);
    expect(b.map((m) => m[0]), 'os nomes de parte têm de sobreviver ao arquivo')
      .toEqual(a.map((m) => m[0]));
    expect(b, 'vértice a vértice, o arquivo desenha o mesmo que a receita').toEqual(a);
  });

  it('★ o LEITOR é puro: nada de node:, Three.js ou DOM', async () => {
    /* o leitor roda no navegador do cliente, num repositório que não tem a
       oficina. Um `import ... from 'node:fs'` aqui não quebra nenhum teste
       deste repositório — quebra o BUILD do outro, ou pior, entra empacotado
       com um remendo e some. É o tipo de defeito que só aparece longe de quem
       o causou, então a trava fica perto de quem o causaria. */
    const leitor = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../src/autoria/ler-peca-resolvida.js'),
      'utf8',
    );
    const linhasDeImport = leitor.split('\n').filter((l) => /^\s*import\s/.test(l));
    expect(linhasDeImport, 'o leitor não importa nada de ninguém').toEqual([]);
    /* e não alcança global de plataforma por outro caminho. */
    for (const proibido of ['node:', 'require(', 'process.', 'document.', 'window.', 'globalThis.']) {
      const corpo = leitor.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(corpo, `o leitor usa '${proibido}' e deixa de ser portátil`).not.toContain(proibido);
    }
  });

  it('o leitor recusa arquivo de formato ou versão que não conhece', async () => {
    const { dado } = await exportarPeca(PECA);
    expect(() => lerPecaResolvida({ ...dado, formato: 'outra-coisa' })).toThrow(/formato/);
    expect(() => lerPecaResolvida({ ...dado, versao: 99 })).toThrow(/vers/i);
  });

  it('★ a guarda está LIGADA no exportador, e não só declarada', async () => {
    /* sem este caso, o de cima passaria com a guarda definida e nunca chamada —
       verde pelo motivo errado. Afirmo sobre o código porque não tenho peça
       quebrada no acervo para provar pelo comportamento. */
    expect(FONTE, 'conferirSemOrfaos precisa ser chamada dentro de exportarPeca')
      .toMatch(/conferirSemOrfaos\(nome, bruto\.orfaos\)/);
    /* e a chamada vem ANTES do objeto ser montado: não se monta artefato de
       peça reprovada nem para jogar fora. */
    expect(FONTE.indexOf('conferirSemOrfaos(nome, bruto.orfaos)'))
      .toBeLessThan(FONTE.indexOf('const dado = {'));
  });
});
