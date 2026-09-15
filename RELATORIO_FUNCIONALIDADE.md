# 📊 Funcionalidade de Relatórios Mensais - London Tower

## 🔐 Acesso Exclusivo para Administradores

### Localização na Interface

A aba de **Relatórios Mensais** está localizada no **Painel Administrador**, que só é visível para usuários com role `admin`.

```
┌─────────────────────────────────────────────────────────────┐
│  London Tower - Área Administrativa                         │
├─────────────────────────────────────────────────────────────┤
│  [Reservas de espaços] [Reservas realizadas] [Painel admin]│ ← Aba visível só para admin
└─────────────────────────────────────────────────────────────┘
```

### Navegação Passo a Passo

1. **Login como administrador**
   - Página inicial: Login com CPF/ID e senha
   - Usuário deve ter `role: 'admin'` no banco de dados

2. **Acessar Painel Administrativo**
   - Após login, clicar na aba **"Painel admin"** (terceira aba no menu)
   - Esta aba **não aparece** para moradores ou portaria

3. **Dentro do Painel Admin, você verá:**

```
╔════════════════════════════════════════════════════════════╗
║  PAINEL ADMINISTRADOR                                      ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📋 Cadastrar nova conta                                   ║
║  ├─ CPF: [__________]                                     ║
║  ├─ Nome: [__________]                                    ║
║  ├─ Tipo: [Morador ▼]                                     ║
║  └─ [Cadastrar]                                           ║
║                                                            ║
║  👥 Contas cadastradas (X)                                 ║
║  ├─ João Silva (123.456.789-00) [Morador] [🗑️]          ║
║  ├─ Maria Santos (987.654.321-00) [Morador] [🗑️]        ║
║  └─ Portaria (superportaria) [Portaria] [🗑️]            ║
║                                                            ║
║  🏢 Salões disponíveis (3)                                 ║
║  ├─ Oxford - até 40 pessoas                               ║
║  ├─ Napoli - até 30 pessoas                               ║
║  └─ Rooftop - até 60 pessoas                              ║
║                                                            ║
║  📝 Termo de responsabilidade                              ║
║  ├─ [Textarea com o termo]                                ║
║  └─ [Salvar termo]                                        ║
║                                                            ║
║  📅 Reservas realizadas                                    ║
║  └─ Lista de todas as reservas do sistema                 ║
║                                                            ║
║  📊 RELATÓRIO MENSAL DE RESERVAS  ← AQUI!                 ║
║  ╔════════════════════════════════════════════════════════╗║
║  ║ Selecione o mês:                                      ║║
║  ║ [2024-09 ▼] [Gerar relatório]                        ║║
║  ║                                                        ║║
║  ║ ┌──────────────────────────────────────┐             ║║
║  ║ │ Estatísticas do mês                  │             ║║
║  ║ ├──────────────────────────────────────┤             ║║
║  ║ │ [15] Total de reservas               │             ║║
║  ║ │ [8] Oxford  [4] Napoli  [3] Rooftop  │             ║║
║  ║ └──────────────────────────────────────┘             ║║
║  ║                                                        ║║
║  ║ Reservas de setembro de 2024                          ║║
║  ║ [📄 Exportar PDF] [📊 Exportar CSV]                  ║║
║  ║                                                        ║║
║  ║ ┌────────────────────────────────────────────────┐   ║║
║  ║ │ Oxford · 05/09/2024 (quinta-feira) [Aniversário]│  ║║
║  ║ │ Responsável: João Silva                         │   ║║
║  ║ │ Apartamento: 101  |  Telefone: (11) 99999-9999 │   ║║
║  ║ └────────────────────────────────────────────────┘   ║║
║  ║                                                        ║║
║  ║ ┌────────────────────────────────────────────────┐   ║║
║  ║ │ Napoli · 12/09/2024 (quinta-feira) [Reunião]   │   ║║
║  ║ │ Responsável: Maria Santos                       │   ║║
║  ║ │ Apartamento: 203  |  Telefone: (11) 98888-8888 │   ║║
║  ║ └────────────────────────────────────────────────┘   ║║
║  ║                                                        ║║
║  ╚════════════════════════════════════════════════════════╝║
╚════════════════════════════════════════════════════════════╝
```

## 📥 Funcionalidades de Exportação

### 1. Exportar PDF (📄)
Ao clicar em **"Exportar PDF"**, o sistema:
- Abre uma nova janela do navegador
- Gera um documento profissional formatado
- Inclui estatísticas e tabela completa
- Aciona automaticamente o diálogo de impressão
- Permite salvar como PDF ou imprimir

**Conteúdo do PDF:**
```
┌─────────────────────────────────────────────────────┐
│ Relatório de Reservas de Salões de Festas          │
│ London Tower Condomínio · setembro de 2024         │
├─────────────────────────────────────────────────────┤
│ Estatísticas do Período                            │
│ [15] Total  [8] Oxford  [4] Napoli  [3] Rooftop    │
├─────────────────────────────────────────────────────┤
│ Detalhamento das Reservas                          │
│ ┌──────────────────────────────────────────────────┤
│ │Data │Dia│Salão  │Responsável│Apto│Telefone│Evento│
│ ├──────────────────────────────────────────────────┤
│ │05/09│qui│Oxford │João Silva │101 │(11)9999│Aniv. │
│ │12/09│qui│Napoli │Maria      │203 │(11)9888│Reun. │
│ └──────────────────────────────────────────────────┘
│                                                     │
│ Documento gerado em 15/09/2026 01:27 · London Tower│
└─────────────────────────────────────────────────────┘
```

### 2. Exportar CSV (📊)
Ao clicar em **"Exportar CSV"**, o sistema:
- Baixa automaticamente um arquivo `.csv`
- Nome: `reservas_2024-09.csv`
- Compatível com Excel e Google Sheets
- Codificação UTF-8 com BOM

**Estrutura do CSV:**
```csv
Data,Dia da Semana,Salão,Responsável,Apartamento,Telefone,Evento,Horário
"05 de setembro de 2024","quinta-feira","Oxford","João Silva","101","(11) 99999-9999","Aniversário","10:00 às 22:00"
"12 de setembro de 2024","quinta-feira","Napoli","Maria Santos","203","(11) 98888-8888","Reunião","10:00 às 22:00"
```

## 🔒 Segurança

### Proteções Implementadas:

1. **Frontend (Interface)**
   - Aba "Painel admin" oculta para não-admins
   - Função `page()` bloqueia navegação se `user.role !== 'admin'`
   - Relatório renderizado dentro de `#adminPage`

2. **Backend (API)**
   - Endpoint `/api/reports.js` verifica role do usuário
   - Retorna `403 Forbidden` se não for admin
   - Validação de sessão obrigatória

3. **Tentativas de Burlar**
   - ❌ URL direta: Bloqueado no backend
   - ❌ Manipular localStorage: Sessão validada no servidor
   - ❌ Alterar role no browser: Token JWT no servidor
   - ❌ Copiar cookies: Session-bound ao user_id

## 📁 Arquivos Relacionados

| Arquivo | Função |
|---------|--------|
| `api/reports.js` | Endpoint backend para gerar relatórios |
| `api/accounts.js` | Gerenciamento de usuários (incluindo DELETE) |
| `dist/portal.js` | Interface frontend com funções de relatório |

## 🧪 Testado e Validado

✅ 22/22 testes automatizados passando  
✅ Validação de permissões  
✅ Exportação PDF funcional  
✅ Exportação CSV com encoding correto  
✅ Responsivo e acessível  

---

**Nota:** Para testar em produção, faça deploy no Vercel e configure as variáveis de ambiente `MONGODB_URI` e `MONGODB_DB`.
