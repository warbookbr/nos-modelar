"""medir-receita.py — quanto da receita o modelador leu, pelas mesmas categorias de ../porta-de-entrada-2026-11-05/medir.py.

Roda o medir.py da porta de entrada sobre as transcrições (sem imprimir o relatório dele) e dá: a categoria de receita do modelador
(`read: receita/peça` e `bash: ler receita/peça`), em volume e em fração do texto que as ferramentas devolveram ao modelador; e, para a
receita pedida (por padrão a do furgão), as chamadas e o volume lidos dela pelo modelador, no total e por transcrição que a leu.
Uso: python3 -I docs/modelar/banco-de-provas/navegacao-de-receitas-2026-11-05/medir-receita.py <diretório das transcrições> [trecho do caminho]
"""
import collections, contextlib, glob, io, json, os, runpy, sys

if len(sys.argv) not in (2, 3):
    sys.exit(__doc__)
base = sys.argv[1].rstrip('/')
alvo = sys.argv[2] if len(sys.argv) == 3 else 'furgao-realista/receita'
medir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'porta-de-entrada-2026-11-05', 'medir.py')
sys.argv = [medir, base]
with contextlib.redirect_stdout(io.StringIO()):
    g = runpy.run_path(medir)
cat_bash = g['cat_bash']
m = g['por']['modelador']
tot = sum(m.values())
rec = m['read: receita/peça'] + m['bash: ler receita/peça']
print('modelador: %.2f MB devolvidos pelas ferramentas; receita/peça %.2f MB (%.1f%%), Read %.2f MB e shell %.2f MB'
      % (tot / 1e6, rec / 1e6, 100 * rec / max(tot, 1), m['read: receita/peça'] / 1e6, m['bash: ler receita/peça'] / 1e6))

def tamanho(cont):
    if isinstance(cont, list):
        return sum(len(x.get('text', '')) if x.get('type') == 'text' else 6000 for x in cont)
    return len(str(cont))

por_transcricao = collections.Counter(); chamadas = collections.Counter(); por_via = collections.Counter(); n_via = collections.Counter()
for f in glob.glob(base + '/*/subagents/agent-*.jsonl'):
    try: tipo = json.load(open(f.replace('.jsonl', '.meta.json'))).get('agentType', '?')
    except Exception: tipo = '?'
    if tipo != 'modelador': continue
    pend = {}
    for linha in open(f):
        try: e = json.loads(linha)
        except Exception: continue
        c = (e.get('message') or {}).get('content')
        if not isinstance(c, list): continue
        for b in c:
            if b.get('type') == 'tool_use':
                inp = b.get('input', {})
                s = inp.get('file_path', '') if b['name'] == 'Read' else inp.get('command', '') if b['name'] == 'Bash' else ''
                if b['name'] == 'Bash' and cat_bash(s) != 'bash: ler receita/peça': s = ''
                if alvo in s: pend[b['id']] = b['name']
            elif b.get('type') == 'tool_result' and b.get('tool_use_id') in pend:
                via = pend[b['tool_use_id']]; t = tamanho(b.get('content'))
                por_via[via] += t; n_via[via] += 1; por_transcricao[f] += t; chamadas[f] += 1
total = sum(por_via.values())
print("receita '%s' lida pelo modelador: %d chamadas, %.0f KB (%s)" % (
    alvo, sum(n_via.values()), total / 1e3, ', '.join('%s %d chamadas %.0f KB' % (k, n_via[k], v / 1e3) for k, v in por_via.most_common())))
if por_transcricao:
    vals = sorted(por_transcricao.values())
    print('por transcrição que a leu: %d transcrições, média %.0f KB, mediana %.0f KB, maior %.0f KB, média de %.1f chamadas' % (
        len(vals), total / len(vals) / 1e3, vals[len(vals) // 2] / 1e3, vals[-1] / 1e3, sum(chamadas.values()) / len(vals)))
