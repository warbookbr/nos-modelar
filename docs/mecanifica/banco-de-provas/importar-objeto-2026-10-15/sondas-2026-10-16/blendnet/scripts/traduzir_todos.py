"""Roda só o tradutor (sem Blender) nos 12.059 scripts: taxa de aceitação (a) e tipos de recusa."""
import json, sys, time, collections, signal, resource
resource.setrlimit(resource.RLIMIT_AS, (3 << 30, 3 << 30))
class Tempo(Exception): pass
def _h(*a): raise Tempo('mais de 10 s')
signal.signal(signal.SIGALRM, _h)
RAIZ = sys.argv[1]; sys.path.insert(0, RAIZ + '/scripts')
import traduzir as T
rows = [json.loads(l) for l in open(RAIZ + '/fonte/BlendNet.jsonl')]
n_ok = 0; tipos = collections.Counter(); primeiro = collections.Counter(); internos = []; tempos = []
cat = collections.defaultdict(lambda: [0, 0]); ex = {}
so_toro = 0; formas = []
for r in rows:
    t = time.perf_counter()
    signal.alarm(10)
    try: tr = T.traduzir(r['script'], r['name'])
    except BaseException as e:
        internos.append((r['id'], f'{type(e).__name__}: {e}')); tr = {'recusas': [{'tipo': 'erro-interno', 'texto': str(e), 'linha': 0, 'codigo': ''}], 'esboco': None, 'formas': 0}
    signal.alarm(0)
    tempos.append(time.perf_counter() - t)
    ts = {x['tipo'] for x in tr['recusas']}
    ok = not tr['recusas'] and tr['esboco'] is not None
    cat[r['category']][1] += 1
    if ok: n_ok += 1; cat[r['category']][0] += 1; formas.append(tr['formas'])
    for t_ in ts: tipos[t_] += 1; ex.setdefault(t_, (r['id'], [x for x in tr['recusas'] if x['tipo'] == t_][0]))
    if tr['recusas']: primeiro[tr['recusas'][0]['tipo']] += 1
    if ts == {'primitiva-sem-equivalente'} and all('torus' in x['texto'] for x in tr['recusas']): so_toro += 1
tempos.sort()
out = {'total': len(rows), 'aceitos': n_ok, 'tipos_por_objeto': tipos, 'primeira_recusa': primeiro, 'so_toro': so_toro, 'erros_internos': len(internos),
       'tempo_mediano_ms': tempos[len(tempos)//2]*1000, 'tempo_p95_ms': tempos[int(len(tempos)*.95)]*1000, 'tempo_max_ms': tempos[-1]*1000,
       'por_categoria': {k: v for k, v in cat.items()}, 'exemplos': {k: [v[0], v[1]] for k, v in ex.items()}, 'internos_amostra': internos[:8],
       'formas_mediana': sorted(formas)[len(formas)//2] if formas else 0}
json.dump(out, open(RAIZ + '/todos.json', 'w'), ensure_ascii=False, indent=1, default=dict)
print(json.dumps({k: v for k, v in out.items() if k not in ('exemplos', 'por_categoria')}, ensure_ascii=False, default=dict, indent=0))
