# Parser de texto do historico SIGAA

Primeiro corte do importador para texto copiado de PDF do SIGAA.

## Entrada aceita

O parser em `src/services/sigaa-record-parser.js` identifica linhas de disciplina que comecam com:

```text
AAAA.Q CODIGO NOME T P E I CATEGORIA CONCEITO SITUACAO
```

Tambem aceita `AAAA/Q` e `AAAA-Q` para o quadrimestre. Linhas quebradas pelo PDF sao unidas ate a proxima linha que comece com outro `AAAA.Q CODIGO`.

Exemplo:

```text
Discente: 11202600000 - Maria de Souza
Curso: Bacharelado em Ciencia e Tecnologia

2025.1 BC1707 Bases Computacionais da Ciencia 0 2 2 4 Obrigatoria A Aprovado
2025/2 BC0506 Comunidade, Universidade
e Sociedade 2 0 2 2 Limitada C Cumpriu
2025.3 BC9999 Topicos Livres em Vida Universitaria 2 0 2 2 Livre -- Trancamento
```

## Saida normalizada

`parseSigaaAcademicRecordText(text)` retorna:

```js
{
  record: {
    aluno: { ra, nome, curso_ingresso },
    formacoes: [],
    disciplinas: []
  },
  warnings: [],
  importHealth: {
    parsedCount,
    warningCount,
    totalDetectedCount,
    precision,
    level,
    message
  }
}
```

Cada disciplina segue `docs/academic-record.schema.json`:

- `codigo`: uppercase.
- `ano_quadrimestre`: sempre `AAAA.Q`.
- `creditos_tide`: numeros separados em `teoria`, `pratica`, `estudo` e `individual`.
- `categoria_sigla`: `O`, `L` ou `F`.
- `conceito`: `A`, `B`, `C`, `D`, `F`, `O` ou `TR`.
- `situacao`: `APROVADO`, `REPROVADO`, `REPROVADO_FALTA`, `TRANCADO`, `MATRICULADO` ou `CONVALIDADO`.
- `eixos`: lista vazia neste corte; o enriquecimento por catalogo deve preencher depois.

## Variacoes ja cobertas

- `Obrigatoria`, `Obrigatorio`, `OBR` e `O` viram `O`.
- `Limitada`, `Opcao Limitada` e `L` viram `L`.
- `Livre` e `F` como categoria inicial viram `F`.
- `Cumpriu` conta como `APROVADO`.
- `Trancamento` ou `Trancado` vira `situacao: "TRANCADO"` e `conceito: "TR"`.
- `Matriculado`, `Matricula`, `Cursando` ou `Em curso` vira `situacao: "MATRICULADO"` e `conceito: "O"` quando o conceito vier como `MAT`.

## Falhas previsiveis

Linhas que parecem disciplina mas nao contem todos os campos esperados nao entram em `disciplinas`. Elas sao devolvidas em `warnings` com `code: "UNPARSED_COURSE_ROW"` e o texto bruto, para auditoria pelo Agente 5 e para evoluir novos casos de regex sem contaminar o frontend.

## Diagnostico passivo do Agente 5

Quando o parser encontra uma linha provavel de disciplina que quebra o contrato, ele registra um evento estruturado em `src/services/passive-diagnostics.js`:

```json
{
  "timestamp": "2026-05-12T10:00:00.000Z",
  "agent": "Agente-4",
  "level": "warning",
  "type": "PARSING_CONTRACT_MISMATCH",
  "context": {
    "rawLine": "2025.2 BC9998 Linha sem campos suficientes",
    "detectedPattern": "likely_course_row"
  },
  "resolved": false
}
```

No navegador, esses eventos ficam no `localStorage` em `coreufabc.passiveDiagnostics`. Em ambiente sem `localStorage`, o store usa memoria de sessao do modulo.

O dashboard tambem possui um modo desenvolvedor escondido para baixar o JSON de auditoria. Ele aparece quando a URL recebe `?diagnostics=1` ou quando `localStorage.setItem("coreufabc.devDiagnostics", "true")` estiver ativo.
