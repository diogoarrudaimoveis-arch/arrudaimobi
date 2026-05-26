import re, os

html = open('dist/index.html', 'r', encoding='utf-8').read()
scripts = re.findall(r'<script[^>]+>', html)
print('Script tags in dist/index.html:')
for s in scripts:
    print(' ', s)
print()

refs = re.findall(r'src="/assets/([^"]+)"', html)
print('Referenced assets:')
for r in refs:
    path = f'dist/assets/{r}'
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    status = 'OK' if exists else 'MISSING'
    print(f'  {status} {r} ({size/1024:.1f}KB)')

print()
# Check total assets
assets = [f for f in os.listdir('dist/assets') if f.endswith('.js')]
print(f'Total JS assets in dist/assets: {len(assets)}')
