import { z } from 'zod'

export const membroSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  dataNascimento: z.string().optional(),
  dataOutorga: z.string().optional(),
  tipoCordao: z.enum(['ohikari', 'shoko'], { required_error: 'Tipo de cordão é obrigatório' }),
  telefone: z.string().optional(),
  tipoMembro: z.enum(['membro', 'nao_membro']),
  situacao: z.enum(['ativo', 'inativo', 'afastado']).optional(),
  larId: z.number().optional(),
  funcoes: z.array(z.string()).default([]),
  observacoes: z.string().optional(),
})

export const larSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  chefeFamiliaId: z.number().optional(),
  setorId: z.number().optional(),
  subconjuntoId: z.number().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
})

export const eventoSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  tipoEventoId: z.number({ required_error: 'Tipo de evento é obrigatório' }),
  descricao: z.string().optional(),
})

export type MembroFormData = z.infer<typeof membroSchema>
export type LarFormData = z.infer<typeof larSchema>
export type EventoFormData = z.infer<typeof eventoSchema>
