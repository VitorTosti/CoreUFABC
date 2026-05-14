# Memoria do Projeto: Planejamento Academico UFABC

## Objetivo do Projeto

Desenvolver uma plataforma web exclusiva para alunos da Universidade Federal do ABC (UFABC), focada no planejamento academico e acompanhamento de metricas.

O sistema deve abandonar a logica de semestres tradicionais e assumir Quadrimestres como unidade central de planejamento, integrando a estrutura do BC&T/BC&H com as formacoes especificas.

## Principios Tecnicos

- Extensibilidade para novas regras academicas da UFABC.
- Capacidade de processar dados do SIGAA, especialmente historico escolar.
- Interface limpa, responsiva e intuitiva para estudantes universitarios.
- Separacao clara entre dados academicos, regras de calculo, parsing e apresentacao.
- Validacao constante da precisao dos calculos academicos.

## Arquitetura de 5 Agentes

### Agente 1: Rotinas e Atualizacoes

Missao: Automatizacao e deploy.

Responsabilidades:

- Criar scripts de automacao para deploy continuo.
- Gerenciar rotinas de backup de dados.
- Garantir que o ambiente de execucao esteja atualizado com as ultimas dependencias.
- Documentar comandos de manutencao e recuperacao.

### Agente 2: Design e Estrutura Base

Missao: Interface e front-end.

Responsabilidades:

- Criar o design system do produto.
- Definir arquivos base de HTML/CSS/JS ou framework equivalente.
- Criar componentes do dashboard, incluindo cards de materias e graficos de progresso.
- Garantir responsividade e boa experiencia para estudantes da UFABC.

### Agente 3: Arquiteto de Logica

Missao: Backend e inteligencia matematica.

Responsabilidades:

- Desenvolver algoritmos de CR, CA e CP.
- Criar a logica de simulacao de notas.
- Implementar o motor de busca de conflitos de horarios para simulador de matricula.
- Manter regras academicas testaveis e isoladas.

### Agente 4: Curador de Dados UFABC

Missao: Integracao e parsing.

Responsabilidades:

- Criar mecanismos para processar historico escolar do SIGAA.
- Mapear catalogo de disciplinas da UFABC.
- Gerenciar pre-requisitos.
- Distinguir materias obrigatorias, limitadas e livres.
- Preparar dados em formato consumivel pelo backend e pela interface.

### Agente 5: Auditor de Qualidade e Diagnostico

Missao: QA, logs e analytics.

Responsabilidades:

- Implementar gestao de logs do sistema.
- Identificar erros de processamento, especialmente em importacao e calculos academicos.
- Configurar metricas de rastreamento de uso, incluindo GA4.
- Realizar testes de estresse para garantir precisao dos calculos academicos.

## Tarefas Iniciais: Agente 2

### 1. Definir Fundacao Visual

Objetivo: criar uma linguagem visual propria para a plataforma, evitando aparencia generica e priorizando clareza academica.

Entregaveis iniciais:

- Paleta de cores com estados semanticos: progresso, alerta, conflito, concluido, pendente e simulacao.
- Escala tipografica para dashboard, tabelas, cards e formularios.
- Tokens de espacemento, bordas, sombras e raios.
- Diretrizes de acessibilidade, contraste e responsividade.

Decisoes iniciais sugeridas:

- Usar quadrimestres como unidade visual recorrente em linhas do tempo, filtros e progresso.
- Diferenciar claramente BC&T, BC&H, obrigatorias, limitadas e livres.
- Priorizar leitura rapida em telas pequenas, pois muitos estudantes consultarao pelo celular.

### 2. Estruturar Telas Base

Objetivo: transformar a experiencia academica em fluxos simples e previsiveis.

Entregaveis iniciais:

- Tela inicial com resumo academico: CR, CA, CP, creditos concluidos e proximas acoes.
- Dashboard de progresso por formacao: BC&T/BC&H e curso especifico.
- Tela de materias com filtros por categoria, status, eixo, quadrimestre recomendado e pre-requisitos.
- Tela de simulacao de matricula com grade horaria e alertas de conflito.
- Tela de importacao do historico SIGAA com feedback de processamento.

### 3. Criar Componentes Prioritarios

Objetivo: montar blocos reutilizaveis antes de evoluir telas completas.

Componentes iniciais:

- Card de disciplina com codigo, nome, creditos, categoria, status e dependencias.
- Indicador de metrica academica para CR, CA e CP.
- Grafico de progresso por creditos e por categorias.
- Linha do tempo por quadrimestres.
- Badge de tipo de disciplina: obrigatoria, limitada, livre, convalidada ou cursando.
- Alerta de conflito de horario.
- Uploader/importador de historico escolar.

### 4. Preparar Contratos com Dados

Objetivo: evitar que a interface dependa diretamente do formato bruto do SIGAA.

Contratos iniciais a alinhar com Agente 4:

- Modelo normalizado de disciplina.
- Modelo de historico academico importado.
- Modelo de progresso por curso/formacao.
- Modelo de conflito de horario.
- Modelo de erro ou alerta de parsing.

## Tarefas Iniciais: Agente 4

### 1. Levantar Fontes e Formatos UFABC

Objetivo: entender quais dados podem ser obtidos, em quais formatos e com quais inconsistencias.

Entregaveis iniciais:

- Inventario dos formatos esperados do historico SIGAA, como PDF, HTML, CSV ou texto copiado.
- Lista de campos minimos do historico: RA, nome, curso, periodo, codigo da disciplina, nome, creditos, conceito/nota, situacao e ano/quadrimestre.
- Catalogo inicial de disciplinas com codigo, nome, creditos, carga horaria e classificacao.
- Mapeamento de documentos ou fontes oficiais usadas como base.

### 2. Definir Modelo Canonico de Dados

Objetivo: converter dados heterogeneos da UFABC em uma estrutura estavel para calculos e interface.

Entidades iniciais:

- `StudentProfile`: dados basicos do aluno e formacoes associadas.
- `AcademicRecord`: historico importado e metadados da importacao.
- `CourseUnit`: disciplina normalizada.
- `EnrollmentAttempt`: tentativa ou resultado de cursar uma disciplina.
- `CurriculumRule`: regra curricular, pre-requisito, equivalencia ou categoria.
- `RequirementGroup`: grupo de obrigatorias, limitadas ou livres.

### 3. Criar Pipeline de Parsing do SIGAA

Objetivo: processar historicos com seguranca, rastreabilidade e tolerancia a variacoes.

Etapas iniciais:

- Detectar tipo de arquivo ou entrada.
- Extrair texto bruto preservando ordem das secoes.
- Identificar blocos de disciplinas cursadas, cursando, reprovadas, trancadas e convalidadas.
- Normalizar codigos, nomes, creditos, conceitos e quadrimestres.
- Registrar erros e avisos de parsing em formato estruturado para o Agente 5.
- Gerar saida canonica para o Agente 3 calcular metricas e para o Agente 2 renderizar a interface.

### 4. Mapear Regras Academicas e Categorias

Objetivo: permitir que a plataforma entenda a diferenca entre progresso bruto e progresso valido para cada formacao.

Entregaveis iniciais:

- Tabela de obrigatorias do BC&T e BC&H.
- Tabela de disciplinas por formacao especifica.
- Mapeamento de limitadas e livres.
- Estrutura para pre-requisitos e co-requisitos.
- Estrutura para equivalencias e mudancas de catalogo.

### 5. Criar Amostras e Casos de Teste

Objetivo: garantir que o parser nao dependa de um unico historico perfeito.

Amostras iniciais:

- Historico com aprovacoes e reprovacoes.
- Historico com convalidacoes.
- Historico com disciplinas em andamento.
- Historico com nomes de disciplinas divergentes do catalogo.
- Historico com campos ausentes ou ordem inesperada.

## Dependencias Entre Agentes 2 e 4

- O Agente 4 deve fornecer modelos canonicos para que o Agente 2 nao leia dados brutos do SIGAA.
- O Agente 2 deve informar quais estados visuais precisa exibir, como erro de importacao, disciplina validada, disciplina pendente e conflito de horario.
- Ambos devem alinhar nomes e categorias exibidas ao usuario para evitar divergencia entre logica academica e interface.
- O contrato inicial entre eles deve ser pequeno, versionado e facil de adaptar quando novas regras UFABC surgirem.

## Proximo Passo Recomendado

Comecar pelo contrato compartilhado entre Agente 2 e Agente 4:

1. Definir os modelos canonicos minimos de disciplina, historico e progresso.
2. Criar amostras ficticias de historico SIGAA para orientar parsing e telas.
3. Prototipar o dashboard com dados mockados enquanto o parser real evolui.
