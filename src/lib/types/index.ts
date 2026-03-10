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
