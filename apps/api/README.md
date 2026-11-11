# Local API

From the workspace root, create `.venv` and install `apps/api/requirements-dev.txt` as described in the root README. Then run `pnpm dev:api` (or `pnpm --filter api dev`). The shared launcher uses the root virtual environment and resolves paths independently of the current directory.

- `GET /api/v1/health` → `{ "status": "ok", "service": "aether-dom-api", "schemaVersion": "0.1.0" }`.
- `GET /api/v1/fixtures/neon-shogun` → the validated supplied document, revision 0.
- `/docs` → local OpenAPI documentation.

The API binds to `127.0.0.1:8000`. The Next server forwards its two fixed read-only endpoints; browser requests stay same-origin and require no permissive CORS configuration. Set server-only `AETHER_API_ORIGIN` in `apps/web/.env.local` if needed. Do not prefix it with `NEXT_PUBLIC_`.

The bundled fixture is validated at startup; invalid source data prevents a healthy startup. Each fixture read loads fresh JSON, validates it, and sends `Cache-Control: no-store`. POST, PUT, PATCH and DELETE are not registered. There is no database or editable canonical state yet.

```powershell
pnpm --filter api test
node tools/api.mjs lint
node tools/api.mjs typecheck
```

Python 3.12+ is supported. Windows users may use `py` to create the environment when `python` is a Store alias. If application control blocks mypy's compiled wheel, install its pure Python distribution without changing system policy:

```powershell
$env:MYPY_USE_MYPYC = '0'
.\.venv\Scripts\python.exe -m pip install --force-reinstall --no-cache-dir --no-binary mypy mypy==2.4.1
Remove-Item Env:MYPY_USE_MYPYC
```
