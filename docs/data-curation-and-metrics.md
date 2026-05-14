# Contrato de Dados e Metricas Academicas

## Fontes oficiais usadas

- Guia da Graduacao da Prograd/UFABC: define CR como media ponderada dos conceitos por creditos, CA como media dos melhores conceitos em disciplinas cursadas e CPk como razao entre creditos aprovados e creditos exigidos para integralizacao.
- Projetos pedagogicos publicados pela Prograd: reforcam os pesos A=4, B=3, C=2, D=1, F=0 e O=0, e indicam que os creditos usados no calculo sao T+P.

Observacao importante: na norma UFABC, `CA` costuma significar Coeficiente de Aproveitamento. A funcao `calculateAffinityCoefficient` implementa uma metrica de afinidade ponderada por formacao para o UFA!, inspirada na necessidade do produto, mas deve ser tratada como metrica de produto ate haver uma definicao normativa especifica para "Coeficiente de Afinidade".

## Modelo canonico de disciplina cursada

Campos obrigatorios:

- `codigo`: codigo normalizado da disciplina, por exemplo `BC1707`.
- `nome`: nome da disciplina.
- `creditos_tide`: creditos TPEI separados em `teoria`, `pratica`, `estudo` e `individual`; os calculos academicos usam `teoria + pratica`.
- `categoria_sigla`: `O` para obrigatoria, `L` para opcao limitada e `F` para livre.
- `conceito`: `A`, `B`, `C`, `D`, `F`, `O` ou `TR`.
- `ano_quadrimestre`: formato `AAAA.Q`, por exemplo `2025.2`.
- `situacao`: estado normalizado da tentativa, como `APROVADO`, `REPROVADO`, `TRANCADO`, `MATRICULADO`, `CONVALIDADO` ou `SIMULADO`.
- `eixos`: lista de eixos tematicos para graficos de progresso.

O schema completo esta em `docs/academic-record.schema.json`; um historico mockado esta em `docs/mock-academic-history.json`.

## Mapeamento de eixos

Proposta inicial:

- `matematica`: bases matematicas, calculo, algebra, estatistica e metodos quantitativos.
- `computacao`: programacao, bases computacionais, algoritmos, dados, sistemas e informacao.
- `ciencias-naturais`: fisica, quimica, biologia, experimentacao e ciencias da natureza.
- `engenharia-tecnologia`: modelagem, processos, energia, sistemas tecnologicos e aplicacoes de engenharia.
- `humanidades`: sociedade, universidade, comunicacao, filosofia, economia, politicas publicas e ciencias humanas.
- `livres`: disciplinas que contam como livre escolha sem eixo academico principal no curso-alvo.

Cada disciplina pode pertencer a mais de um eixo usando pesos que somam ate `1`. Exemplo: uma disciplina interdisciplinar pode ter `0.6` em `ciencias-naturais` e `0.4` em `engenharia-tecnologia`. Isso permite graficos mais honestos do que uma classificacao unica quando a disciplina e transversal.

## Regras implementadas

- CR: media ponderada por creditos T+P, considerando conceitos `A`, `B`, `C`, `D`, `F` e `O`.
- TR: nao entra no CR nem em progresso.
- CA de afinidade do UFA!: considera apenas disciplinas aprovadas, usa a melhor tentativa por codigo e aplica pesos da formacao pretendida.
- CP: soma creditos T+P aprovados e divide pelos creditos exigidos do curso ou grupo curricular.
- Projecao: recalcula o CR incluindo disciplinas simuladas do proximo quadrimestre.
