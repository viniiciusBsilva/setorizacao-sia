# SIA — Princípios de Desenvolvimento

> Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase

---

## 1. Estrutura de Pastas

```
sia/
├── app/                        # App Router (Next.js 14)
│   ├── (auth)/                 # Grupo de rotas — autenticação
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/            # Grupo de rotas — sistema principal
│   │   ├── layout.tsx          # Layout com sidebar + topbar
│   │   ├── page.tsx            # Dashboard
│   │   ├── membros/
│   │   │   ├── page.tsx        # Lista de membros
│   │   │   ├── novo/
│   │   │   │   └── page.tsx    # Formulário de cadastro
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Detalhe/edição do membro
│   │   ├── lares/
│   │   ├── setorizacao/
│   │   │   ├── grupos/
│   │   │   ├── setores/
│   │   │   └── subconjuntos/
│   │   ├── frequencia/
│   │   │   ├── eventos/
│   │   │   └── lancamento/
│   │   └── relatorios/
├── components/
│   ├── ui/                     # Componentes shadcn/ui (não editar)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageHeader.tsx
│   ├── membros/
│   │   ├── MemberTable.tsx
│   │   ├── MemberForm.tsx
│   │   └── MemberFilters.tsx
│   ├── lares/
│   ├── frequencia/
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       ├── DataTable.tsx
│       └── HierarchyTree.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Supabase client (browser)
│   │   └── server.ts           # Supabase client (server)
│   ├── hooks/
│   │   ├── useMembros.ts
│   │   ├── useLares.ts
│   │   └── useSetorizacao.ts
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript do domínio
│   └── utils/
│       ├── formatters.ts       # Formatação de datas, telefones
│       └── validators.ts       # Validações de formulário
├── middleware.ts               # Proteção de rotas por perfil
└── .env.local
```

---

## 2. Convenções de Nomenclatura

| Elemento | Padrão | Exemplo |
|---|---|---|
| Componentes React | PascalCase | `MemberTable.tsx` |
| Hooks | camelCase com `use` | `useMembros.ts` |
| Funções utilitárias | camelCase | `formatarData()` |
| Variáveis | camelCase | `membroSelecionado` |
| Tipos/Interfaces | PascalCase | `type Membro = {...}` |
| Rotas (pastas) | kebab-case | `/membros/novo` |
| Constantes | UPPER_SNAKE_CASE | `STATUS_MEMBRO` |

---

## 3. Tipos TypeScript do Domínio

```ts
// lib/types/index.ts

export type StatusMembro = 'ativo' | 'inativo' | 'afastado'
export type TipoCordao = 'ohikari' | 'shoko'
export type TipoMembro = 'membro' | 'nao_membro'

export type FuncaoMissionaria =
  | 'membro'
  | 'resp_grupo'
  | 'assistente_ministro'
  | 'auxiliar'
  | 'assistente_familia'
  | 'resp_setor_interno'

export type PerfilAcesso = 'administrador' | 'resp_grupo' | 'resp_setor' | 'resp_subconjunto'

export interface Membro {
  id: number
  nome: string
  codigoMembro: string
  telefone?: string
  dataNascimento?: string
  dataOutorga?: string
  tipoCordao: TipoCordao
  situacao?: StatusMembro
  tipoMembro: TipoMembro
  larId?: number
  funcoes: FuncaoMissionaria[]
  observacoes?: string
}

export interface Lar {
  id: number
  chefeFamiliaId?: number
  enderecoId?: number
  setorId?: number
  membros?: Membro[]
}

export interface Setor {
  id: number
  nome: string
  status: boolean
  coordenadorId?: number
  assMinistroId?: number
}

export interface Subconjunto {
  id: number
  nome: string
  setorId: number
  responsavelId?: number
}

export interface Grupo {
  id: string
  nome: string
  descricao?: string
  status: boolean
}

export interface Evento {
  id: number
  data: string
  tipoEventoId: number
  descricao?: string
  ativo: boolean
}

export interface Frequencia {
  id: number
  eventoId: number
  membroId: number
  presente: boolean
  observacoes?: string
}
```

---

## 4. Supabase — Padrões de Uso

### Client Browser vs Server

```ts
// lib/supabase/client.ts — usar em Client Components
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts — usar em Server Components e Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
```

### Padrão de Query

```ts
// ✅ Sempre tipar o retorno
const { data, error } = await supabase
  .from('membro')
  .select('id, nome, codigo_membro, situacao, tipo_id')
  .eq('unidade', unidadeId)
  .order('nome')

if (error) throw new Error(error.message)
return data as Membro[]
```

### Nomear tabelas — atenção às aspas

```ts
// Tabelas com nomes em PascalCase precisam de aspas no Supabase
.from('"Membro"')   // ❌ errado — tabela se chama membro (minúscula)
.from('membro')     // ✅ correto

.from('"Pessoa"')   // ✅ correto — tabela criada com PascalCase
.from('"Unidade"')  // ✅ correto
```

---

## 5. Autenticação e Controle de Acesso

### Middleware — proteção de rotas

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas
  if (pathname.startsWith('/login')) return NextResponse.next()

  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Perfil do usuário logado

```ts
// Buscar perfil via Pessoa → Lideranca → Perfil
const { data: pessoa } = await supabase
  .from('"Pessoa"')
  .select('id, "Nome", "idUnidade"')
  .eq('"idUsuario"', user.id)
  .single()
```

### Regras de escopo por perfil

| Perfil | Filtro obrigatório nas queries |
|---|---|
| `administrador` | Sem filtro — acessa tudo |
| `resp_grupo` | Filtrar por `grupo_id` do responsável |
| `resp_setor` | Filtrar por `setor_id` do responsável |
| `resp_subconjunto` | Filtrar por `subconjunto_id` do responsável |

> **Importante:** o filtro de escopo deve ser aplicado no servidor (Server Component ou Server Action), nunca apenas no frontend.

---

## 6. Server Actions

Preferir Server Actions a rotas de API para operações de CRUD simples:

```ts
// app/(dashboard)/membros/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarMembro(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('membro').insert({
    nome: formData.get('nome') as string,
    data_nascimento: formData.get('dataNascimento') as string,
    // ...
  })

  if (error) return { erro: error.message }

  revalidatePath('/membros')
  return { sucesso: true }
}
```

---

## 7. Formulários

Usar **React Hook Form** + **Zod** para validação:

```ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  dataNascimento: z.string().optional(),
  tipoCordao: z.enum(['ohikari', 'shoko']),
})

type FormData = z.infer<typeof schema>

const form = useForm<FormData>({ resolver: zodResolver(schema) })
```

---

## 8. Padrões Gerais

### ✅ Fazer sempre

- Usar `Server Components` por padrão; adicionar `'use client'` só quando necessário (interatividade, hooks)
- Tratar erros em toda chamada ao Supabase (`if (error) throw...`)
- Usar `revalidatePath()` após mutações para atualizar dados em cache
- Tipar todos os retornos de queries com os tipos definidos em `lib/types`
- Componentes de formulário sempre em Client Components
- Componentes de listagem/visualização em Server Components

### ❌ Nunca fazer

- Nunca expor a `service_role` key no frontend
- Nunca fazer queries ao Supabase diretamente em componentes — usar hooks ou Server Actions
- Nunca armazenar dados sensíveis no `localStorage`
- Nunca confiar apenas no filtro de escopo do frontend — sempre validar no servidor

---

## 9. Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # apenas no servidor, nunca expor
```

---

## 10. Ordem de Desenvolvimento Recomendada

1. Configurar projeto Next.js + Supabase + shadcn/ui
2. Implementar autenticação (login/logout com Supabase Auth)
3. Criar middleware de proteção de rotas
4. Implementar layout base (Sidebar + Topbar)
5. **Módulo Membros** — listagem, cadastro, edição
6. **Módulo Lares** — listagem, cadastro, vínculo com membros
7. **Módulo Setorização** — Grupos, Setores, Subconjuntos
8. **Módulo Frequência** — eventos e lançamento
9. **Relatórios e Consultas**
10. **Importação de dados** (Excel/CSV)
