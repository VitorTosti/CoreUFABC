# Logica de categorias curriculares

Este documento explica como o CoreUFABC deve tratar obrigatorias, opcionais/limitadas e livres no frontend.

## Obrigatorias

Sao disciplinas que o PPC do curso exige explicitamente. No JSON, elas ficam em `materias_obrigatorias` e entram diretamente no calculo de pendencias do curso.

Regra de produto:

- Se o aluno nao concluiu uma obrigatoria, ela deve aparecer como pendente.
- Se concluiu uma disciplina equivalente, a equivalencia deve ser resolvida antes pelo motor de dados.
- Obrigatorias nunca devem ser substituidas por sugestoes editoriais.

## Opcionais ou limitadas

Sao disciplinas que contam para uma categoria curricular especifica, mas o aluno pode escolher dentro de um conjunto permitido pelo curso. O PPC define o total de creditos exigidos em `creditos_exigidos.limitadas`.

Regra de produto:

- O frontend deve exibir progresso por creditos, nao por lista fixa completa, porque a lista de opcoes pode mudar por catalogo e por matriz.
- `sugestoes.opcionais` e uma lista curta para orientar escolha, nao o conjunto completo oficial.
- Antes de validar integralizacao, a categoria real da disciplina deve vir do catalogo/categoria oficial da Prograd.

## Livres

Sao creditos de escolha mais aberta. Em geral, podem vir de disciplinas que nao sejam obrigatorias nem de opcao limitada para aquele curso, respeitando regras de aproveitamento e oferta.

Regra de produto:

- O frontend deve explicar que livre nao significa "qualquer coisa sem validacao": a disciplina precisa ser aceita pela regra academica vigente.
- `creditos_exigidos.livres` e o total que o aluno precisa completar.
- `sugestoes.livres` deve ser exibida como inspiracao, com aviso de que a validade final depende do catalogo, matriz e historico do aluno.

## Sugestoes

As sugestoes em `src/data/curriculums.json` usam esta forma:

```json
{
  "codigo": "ESEC002-24",
  "nome": "Economia nas Escolas",
  "motivo": "Combina economia, educacao e pratica extensionista.",
  "fonte": "Catalogo de Disciplinas UFABC 2024-2025"
}
```

Elas devem responder a pergunta: "por que esta disciplina pode fazer sentido para este perfil?". Elas nao devem responder: "esta disciplina certamente integraliza nesta categoria?". Essa segunda resposta precisa de uma etapa posterior com o arquivo oficial de categorias por curso.

## Texto sugerido para interface

Obrigatorias: disciplinas exigidas pelo PPC do seu curso. Se estiverem pendentes, precisam ser concluidas ou reconhecidas por equivalencia.

Opcionais/limitadas: creditos que voce cumpre escolhendo disciplinas dentro de grupos aceitos pelo curso. As sugestoes ajudam a explorar caminhos, mas a validacao final depende do catalogo oficial.

Livres: creditos de escolha mais aberta. Use para ampliar repertorio ou testar areas novas, sempre conferindo se a disciplina pode ser aproveitada no seu historico.
