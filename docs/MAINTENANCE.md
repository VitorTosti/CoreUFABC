# Manutenção e Infraestrutura — CoreUFABC

> Responsabilidade: Agente 1 — Rotinas e Atualizações

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework UI | React 19 |
| Bundler | Vite 7 |
| CSS | Tailwind CSS 3 |
| Testes | Node.js Test Runner (`node:test`) |
| CI/CD | GitHub Actions |

## Comandos do Dia a Dia

```bash
# Desenvolvimento local
npm run dev

# Rodar todos os testes
npm test

# Rodar testes em modo observador (reexecuta ao salvar)
npm run test:watch

# Build de produção (testes rodam automaticamente antes via prebuild)
npm run build

# Visualizar o build localmente
npm run preview
```

## Pipeline CI/CD

O arquivo [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) executa automaticamente em todo push ou PR para `main`/`master`:

```
Checkout → Setup Node 22 → npm ci → npm test → vite build → upload artifact
```

- Os testes bloqueiam o build: se algum falhar, o pipeline interrompe.
- O artefato `dist/` fica disponível por 7 dias em cada run.

## Garantia de Qualidade Local

O script `prebuild` no `package.json` garante que `npm run build` **nunca** executa sem antes rodar a suíte de testes:

```json
"prebuild": "npm test"
```

Para pular em situações excepcionais (não recomendado):

```bash
npx vite build   # bypassa o prebuild
```

## Estrutura de Testes

Os testes ficam em `tests/` e usam o runner nativo do Node.js (sem dependência externa):

| Arquivo | Cobertura |
|---------|-----------|
| `academic-metrics.test.js` | CR, CA, CP, simulação, conflitos |
| `sigaa-record-parser.test.js` | Parsing do histórico SIGAA |
| `curriculum-progress.test.js` | Progresso curricular BC&T/BC&H |
| `curriculums.test.js` | Dados de currículo |
| `academic-record-api.test.js` | API de histórico acadêmico |
| `passive-diagnostics.test.js` | Diagnósticos passivos |
| `app-pages.test.js` | Navegação e páginas |
| `auth-preview-pages.test.js` | Páginas de preview |

Para adicionar um novo teste, crie `tests/<nome>.test.js` — ele será detectado automaticamente pelo glob `tests/**/*.test.js`.

## Atualização de Dependências

```bash
# Verificar pacotes desatualizados
npm outdated

# Atualizar dentro dos ranges do package.json
npm update

# Atualizar para versão mais recente (com cuidado)
npm install <pacote>@latest
```

Após qualquer atualização, rodar `npm test` antes de commitar.

## Variáveis de Ambiente

O projeto ainda não requer variáveis de ambiente. Quando necessário, criar `.env.local` (já no `.gitignore`). Nunca commitar arquivos `.env` com segredos.

## Recuperação de Emergência

```bash
# Reinstalar dependências do zero
rm -rf node_modules package-lock.json
npm install

# Limpar cache do Vite
rm -rf .vite
npm run dev
```
