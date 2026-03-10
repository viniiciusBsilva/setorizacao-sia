# SIA — Design System

> Sistema de Informação e Acompanhamento  
> Stack: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui

---

## 1. Identidade Visual

### Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `primary-900` | `#1F4E79` | Sidebar, cabeçalhos, botão primário |
| `primary-700` | `#2E74B5` | Links, badges, hover |
| `primary-100` | `#EBF3FB` | Backgrounds de cards ativos, linhas de tabela selecionadas |
| `gray-50` | `#F5F7FA` | Background geral da aplicação |
| `gray-200` | `#E5E7EB` | Bordas, divisores |
| `gray-500` | `#6B7280` | Texto secundário, labels |
| `gray-900` | `#111827` | Texto principal |
| `success` | `#16A34A` | Status ativo, confirmações |
| `warning` | `#D97706` | Status afastado, alertas |
| `danger` | `#DC2626` | Status inativo, erros, exclusão |
| `white` | `#FFFFFF` | Cards, modais, inputs |

### Configuração no Tailwind (`tailwind.config.ts`)

```ts
theme: {
  extend: {
    colors: {
      primary: {
        100: '#EBF3FB',
        700: '#2E74B5',
        900: '#1F4E79',
      },
    },
  },
}
```

---

## 2. Tipografia

| Elemento | Classe Tailwind | Uso |
|---|---|---|
| Título de página | `text-2xl font-bold text-gray-900` | H1 de cada tela |
| Título de seção | `text-lg font-semibold text-gray-800` | H2 dentro de cards |
| Label de campo | `text-sm font-medium text-gray-700` | Labels de formulário |
| Texto padrão | `text-sm text-gray-900` | Conteúdo geral |
| Texto secundário | `text-sm text-gray-500` | Descrições, datas, hints |
| Texto de tabela | `text-sm text-gray-800` | Células de tabela |

**Fonte:** Inter (Google Fonts)

```ts
// layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

---

## 3. Layout Geral

### Estrutura de Tela

```
┌─────────────────────────────────────────────┐
│  TOPBAR (h-16, bg-white, border-b)          │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ SIDEBAR  │  MAIN CONTENT                    │
│ (w-64)   │  (flex-1, p-6, bg-gray-50)       │
│          │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### Sidebar

- Largura: `w-64`
- Background: `bg-primary-900`
- Texto: `text-white`
- Item ativo: `bg-primary-700 rounded-lg`
- Item hover: `hover:bg-primary-700/50`

### Topbar

- Altura: `h-16`
- Background: `bg-white border-b border-gray-200`
- Conteúdo: logo à esquerda, usuário + badge de perfil à direita

### Área de conteúdo

- Padding: `p-6`
- Background: `bg-gray-50`
- Max width: sem limite (fullscreen responsivo)

---

## 4. Componentes

### Card

```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
  {children}
</div>
```

### Card de Estatística (Dashboard)

```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
  <p className="text-sm text-gray-500">{label}</p>
  <p className="text-3xl font-bold text-gray-900 mt-1">{valor}</p>
  <p className="text-xs text-gray-400 mt-1">{subtexto}</p>
</div>
```

### Botões

| Variante | Classe base | Uso |
|---|---|---|
| Primário | `bg-primary-900 text-white hover:bg-primary-700` | Ação principal (Salvar, Novo) |
| Secundário | `border border-gray-300 text-gray-700 hover:bg-gray-50` | Cancelar, Voltar |
| Destrutivo | `bg-red-600 text-white hover:bg-red-700` | Excluir |
| Ghost | `text-primary-700 hover:bg-primary-100` | Ações em tabela (Ver, Editar) |

> Usar sempre o componente `<Button>` do shadcn/ui com a prop `variant`.

### Badge de Status

```tsx
// Ativo
<span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
  Ativo
</span>

// Inativo
<span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
  Inativo
</span>

// Afastado
<span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
  Afastado
</span>
```

### Badge de Perfil (Topbar)

```tsx
<span className="bg-primary-100 text-primary-900 text-xs font-semibold px-3 py-1 rounded-full">
  {perfil} {/* Ex: Administrador, Resp. de Setor */}
</span>
```

### Tabela de Dados

```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {coluna}
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-gray-800">{valor}</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Barra de Filtros

```tsx
<div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-xl p-4">
  <Input placeholder="Buscar..." className="w-64" />
  <Select placeholder="Setor" />
  <Select placeholder="Status" />
  <Button variant="ghost">Limpar filtros</Button>
</div>
```

### Formulário

- Layout: grid de 2 colunas em desktop (`grid grid-cols-2 gap-4`), 1 coluna em mobile
- Labels: sempre acima do campo
- Campos obrigatórios: asterisco vermelho `*` no label
- Erros: `text-red-500 text-xs mt-1` abaixo do campo
- Textarea: `min-h-[100px]`
- Ações: alinhadas à direita, Cancelar antes de Salvar

---

## 5. Hierarquia Visual — Setorização

Para exibir a hierarquia Grupo > Setor > Subconjunto > Lar visualmente:

```tsx
// Cada nível tem indentação e cor de borda diferente
<div className="border-l-4 border-primary-900 pl-4">  {/* Grupo */}
  <div className="border-l-4 border-primary-700 pl-4">  {/* Setor */}
    <div className="border-l-4 border-primary-100 pl-4">  {/* Subconjunto */}
      <div className="pl-4">  {/* Lar */}
      </div>
    </div>
  </div>
</div>
```

---

## 6. Responsividade

| Breakpoint | Comportamento |
|---|---|
| `sm` (< 640px) | Sidebar vira drawer (menu hambúrguer) |
| `md` (640–1024px) | Sidebar colapsada (apenas ícones) |
| `lg` (> 1024px) | Layout completo com sidebar expandida |

- Formulários: 2 colunas em `lg`, 1 coluna em mobile
- Tabelas: scroll horizontal em mobile (`overflow-x-auto`)
- Cards de estatística: `grid-cols-2` em mobile, `grid-cols-4` em desktop

---

## 7. Ícones

Usar **Lucide React** (já incluso no shadcn/ui):

| Elemento | Ícone |
|---|---|
| Dashboard | `LayoutDashboard` |
| Membros | `Users` |
| Lares | `Home` |
| Hierarquia | `GitBranch` |
| Frequência | `CalendarCheck` |
| Relatórios | `BarChart2` |
| Configurações | `Settings` |
| Novo registro | `Plus` |
| Editar | `Pencil` |
| Excluir | `Trash2` |
| Filtrar | `Filter` |
| Buscar | `Search` |

---

## 8. Feedback e Estados

| Estado | Componente shadcn | Uso |
|---|---|---|
| Carregando | `Skeleton` | Enquanto dados carregam |
| Erro | `Alert variant="destructive"` | Erros de API |
| Sucesso | `Toast` | Após salvar/editar |
| Confirmação de exclusão | `AlertDialog` | Antes de deletar |
| Sem dados | Ilustração + texto `text-gray-400` | Tabela vazia |
