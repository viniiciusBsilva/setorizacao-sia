# SIA — Documentação do Banco de Dados

> Banco: Supabase (PostgreSQL)  
> Última revisão: 2026

---

## 1. Visão Geral

O banco possui duas "camadas" de tabelas que coexistem:

- **Camada A — Supabase/Sistema** (`Pessoa`, `Unidade`, `Igreja`, `Grupo`, `Perfil`, `Lideranca`): tabelas do sistema de usuários e organização geral, com nomenclatura PascalCase.
- **Camada B — Domínio SIA** (`membro`, `lar`, `setor`, `frequencia`, `evento`, etc.): tabelas do domínio da aplicação, com nomenclatura snake_case.

A ponte entre as duas camadas é: `auth.users → Pessoa → membro` (quando o membro possui login no sistema).

---

## 2. Mapa de Relacionamentos

```
auth.users
    └── Pessoa (idUsuario)
          ├── Unidade (idUnidade) → Igreja
          ├── Grupo_Pessoa → Grupo
          └── Lideranca → Unidade / Igreja

membro
    ├── tipo_membro
    ├── situacao
    ├── Unidade
    └── lar (chefe_familia) ←→ setor
              └── endereco_lar
                  
setor
    ├── membro (coordenador_id)
    ├── membro (ass_ministro_id)
    ├── Pessoa (pessoa_coodernador_id)  ← REDUNDANTE com coordenador_id
    └── Pessoa (pessoa_assistente_id)   ← REDUNDANTE com ass_ministro_id

evento → tipo_evento
frequencia → evento + membro
```

---

## 3. Tabelas Existentes — Referência

### `auth.users` (Supabase nativo)
Gerenciada pelo Supabase Auth. Contém email, senha (hash), metadados de autenticação.

---

### `Pessoa`
Representa um usuário com acesso ao sistema. Vinculada ao `auth.users`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `created_at` | timestamptz | Data de criação |
| `idUsuario` | uuid FK → auth.users | Login do sistema |
| `Nome` | text | Nome da pessoa |
| `idUnidade` | uuid FK → Unidade | Unidade à qual pertence |

---

### `Igreja`
Organização raiz (nível acima de Unidade).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `nome` | text | Nome da igreja |
| `status` | boolean | Ativo/Inativo |
| `descricao` | text | Descrição livre |
| `ordem` | bigint | Ordem de exibição |

---

### `Unidade`
Subdivisão da Igreja (filial, núcleo, sede regional).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `Nome` | text | Nome da unidade |
| `Status` | boolean | Ativo/Inativo |
| `idIgreja` | uuid FK → Igreja | Igreja pai |
| `descricao` | text | Descrição livre |

---

### `Grupo`
Nível hierárquico mais alto da setorização.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `nome` | text UNIQUE | Nome do grupo |
| `descricao` | text | Descrição |
| `status` | boolean | Ativo/Inativo |
| `idcriador` | uuid FK → Pessoa | Quem criou |

---

### `Grupo_Pessoa`
Associação N:N entre Grupo e Pessoa, com nível hierárquico.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `idgrupo` | uuid FK → Grupo | Grupo |
| `idpessoa` | uuid FK → Pessoa | Pessoa |
| `nivel_hierarquia` | integer | Calculado por trigger |
| `nivel_hierarquia_manual` | boolean | Se foi definido manualmente |

> **Trigger:** `trigger_ajustar_niveis` — executado antes de INSERT, ajusta automaticamente o nível hierárquico.

---

### `Lideranca`
Define se uma Pessoa é líder de uma Unidade ou Igreja.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `idpessoa` | uuid FK → Pessoa | Pessoa líder |
| `idunidade` | uuid FK → Unidade | Unidade (opcional) |
| `idigreja` | uuid FK → Igreja | Igreja (opcional) |
| `lider` | boolean | É líder principal |

---

### `Perfil`
Perfis de acesso do sistema.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador |
| `nome` | text | Nome do perfil |
| `descricao` | text | Descrição |
| `ativo` | boolean | Ativo/Inativo |

> ⚠️ **Problema:** não há FK entre `Perfil` e `Pessoa`. O vínculo de perfil ao usuário ainda precisa ser implementado.

---

### `membro`
Tabela central do domínio SIA. Representa um membro da comunidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | bigserial PK | Identificador |
| `nome` | varchar(100) | Nome completo |
| `codigo_membro` | varchar(50) | Código gerado pelo sistema |
| `telefone` | varchar(20) | Telefone |
| `data_nascimento` | date | Data de nascimento |
| `data_outorga` | date | Data de recebimento do cordão |
| `situacao` | integer FK → situacao | Status (Ativo/Inativo/Afastado) |
| `unidade` | uuid FK → Unidade | Unidade do membro |
| `chefe_familia` | bigint FK → membro | Auto-referência (chefe do próprio lar?) |
| `tipo_id` | integer FK → tipo_membro | Tipo de membro |
| `resp_membro` | bigint FK → membro | Responsável espiritual |

> ⚠️ **Campos faltantes a adicionar:**
> - `tipo_cordao` — 'ohikari' ou 'shoko'
> - `lar_id` — FK para `lar` (atualmente lar aponta para membro, não o contrário)
> - `observacoes` — campo de texto livre

---

### `tipo_membro`
Tipos possíveis de membro.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `nome` | varchar(50) UNIQUE | Ex: "Membro", "Não Membro" |

---

### `lar`
Representa uma família/lar da comunidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `chefe_familia` | integer FK → membro | Responsável do lar |
| `endereco_id` | integer FK → endereco_lar | Endereço |
| `setor_id` | integer FK → setor | Setor ao qual pertence |

> ⚠️ **Faltando:** vínculo com `subconjunto` (nível intermediário entre setor e lar).

---

### `endereco_lar`
Endereço de um lar.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `logradouro` | varchar(255) | Rua/Av |
| `numero` | varchar(10) | Número |
| `complemento` | varchar(100) | Complemento |
| `bairro` | varchar(100) | Bairro |
| `cidade` | varchar(100) | Cidade |
| `estado` | varchar(50) | Estado |
| `pais` | varchar(50) | País |
| `cep` | varchar(20) | CEP |
| `codigo_membro` | varchar | ⚠️ Relação por texto — sem integridade referencial |

---

### `setor`
Nível hierárquico intermediário (abaixo de Grupo, acima de Subconjunto).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `nome` | varchar(100) | Nome do setor |
| `situacao` | varchar(50) | Status em texto |
| `Status` | boolean | Ativo/Inativo |
| `coordenador_id` | bigint FK → membro | Coordenador (via membro) |
| `ass_ministro_id` | bigint FK → membro | Assistente de ministro (via membro) |
| `pessoa_coodernador_id` | uuid FK → Pessoa | ⚠️ Redundante com coordenador_id |
| `pessoa_assistente_id` | uuid FK → Pessoa | ⚠️ Redundante com ass_ministro_id |

---

### `evento`
Registro de eventos/atividades da comunidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `tipo_do_evento_id` | integer FK → tipo_evento | Tipo |
| `data` | date | Data do evento |
| `ativo` | boolean | Ativo/cancelado |
| `descricao` | text | Descrição livre |

---

### `tipo_evento`
Tipos de eventos cadastráveis pelo administrador.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `descricao` | varchar(100) | Ex: Culto, Aprimoramento |
| `tipo` | varchar(50) | Classificação adicional |

---

### `frequencia`
Registro de presença de um membro em um evento.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial PK | Identificador |
| `evento_id` | integer FK → evento | Evento |
| `membro_id` | integer FK → membro | Membro |
| `presente` | boolean | Presente ou não |
| `observacoes` | text | Observações |

---

## 4. Problemas Identificados e Ações Recomendadas

### 🔴 Críticos

| Problema | Ação |
|---|---|
| `setor` referencia `Pessoa` E `membro` para o mesmo responsável | Definir um padrão único. **Recomendação:** manter apenas `coordenador_id` e `ass_ministro_id` (FK → membro), remover as colunas `pessoa_coodernador_id` e `pessoa_assistente_id` |
| `endereco_lar.codigo_membro` é texto sem FK | Substituir por `lar_id integer FK → lar` |
| `Perfil` sem vínculo com usuários | Criar tabela `Pessoa_Perfil` ou adicionar `perfil_id` em `Pessoa` |

### 🟡 Melhorias necessárias

| Melhoria | Ação |
|---|---|
| `membro` não tem `tipo_cordao` | Adicionar coluna `tipo_cordao varchar CHECK IN ('ohikari', 'shoko')` |
| Não existe tabela `subconjunto` | Criar tabela (ver seção 5) |
| Não existe tabela de funções missionárias | Criar tabela `membro_funcao` (ver seção 5) |
| `setor` tem duas colunas de status (`situacao` varchar e `Status` boolean) | Unificar em apenas `status boolean` |

---

## 5. Tabelas a Criar

### `subconjunto` (novo)

```sql
create table public.subconjunto (
  id serial not null,
  nome character varying(100) not null,
  setor_id integer not null,
  responsavel_id bigint null,
  status boolean not null default true,
  constraint subconjunto_pkey primary key (id),
  constraint subconjunto_setor_id_fkey foreign key (setor_id) references setor (id),
  constraint subconjunto_responsavel_id_fkey foreign key (responsavel_id) references membro (id)
);
```

### Atualizar `lar` para incluir `subconjunto_id`

```sql
alter table public.lar add column subconjunto_id integer references subconjunto (id);
```

### `membro_funcao` — funções missionárias (novo)

```sql
create table public.membro_funcao (
  id serial not null,
  membro_id bigint not null,
  funcao character varying(50) not null,
  ativo boolean not null default true,
  constraint membro_funcao_pkey primary key (id),
  constraint membro_funcao_membro_id_fkey foreign key (membro_id) references membro (id) on delete cascade,
  constraint membro_funcao_funcao_check check (
    funcao in ('membro', 'resp_grupo', 'assistente_ministro', 'auxiliar', 'assistente_familia', 'resp_setor_interno')
  )
);
```

### `Pessoa_Perfil` — vínculo de perfil de acesso (novo)

```sql
create table public."Pessoa_Perfil" (
  id uuid not null default gen_random_uuid(),
  pessoa_id uuid not null,
  perfil_id uuid not null,
  constraint pessoa_perfil_pkey primary key (id),
  constraint pessoa_perfil_pessoa_id_fkey foreign key (pessoa_id) references "Pessoa" (id),
  constraint pessoa_perfil_perfil_id_fkey foreign key (perfil_id) references "Perfil" (id)
);
```

### Adicionar `tipo_cordao` em `membro`

```sql
alter table public.membro
  add column tipo_cordao character varying(10)
  check (tipo_cordao in ('ohikari', 'shoko'));
```

### Adicionar `observacoes` em `membro`

```sql
alter table public.membro add column observacoes text;
```

---

## 6. Diagrama Simplificado (pós-correções)

```
Igreja
  └── Unidade
        └── Pessoa (auth.users) → Perfil

Grupo
  └── Setor
        └── Subconjunto (NOVO)
              └── Lar → EnderecoLar
                    └── Membro → TipoMembro
                                └── Membro_Funcao (NOVO)
                                └── Situacao

Evento → TipoEvento
  └── Frequencia → Membro
```
