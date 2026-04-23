# 💾 Guia: Aba "Status dos Dados"

**Data:** 2026-02-25  
**Status:** ✅ IMPLEMENTADO  
**Localização:** AdminPage → Aba "💾 Status dos Dados"

---

## 🎯 O QUE É?

Uma nova aba na AdminPage que permite **visualizar, exportar, importar e gerenciar** todos os dados armazenados no sistema do Cadastro Cultural de Ilhabela.

---

## ✨ FUNCIONALIDADES

### 1. **Visualização Completa dos Dados** 📊

A aba mostra:
- **Cards de Resumo**: Total de agentes, grupos, espaços, editais e projetos
- **Análise Demanda vs Oferta**: 
  - Total de projetos
  - Quantos foram aprovados (oferta)
  - Quantos são inscritos (demanda)
  - Percentual de aprovação

### 2. **Exportar Backup** 💾

**Como usar:**
1. Clique em "Exportar Backup (JSON)"
2. Um arquivo JSON será baixado automaticamente
3. Nome do arquivo: `cadastro-cultural-backup-YYYY-MM-DD.json`

**Para que serve:**
- Fazer cópia de segurança dos dados
- Transferir dados entre navegadores/computadores
- Guardar snapshots de estados específicos do sistema

### 3. **Importar Backup** 📥

**Como usar:**
1. Clique em "Importar Backup (JSON)"
2. Selecione um arquivo `.json` exportado anteriormente
3. Confirme a substituição dos dados (⚠️ ATENÇÃO: substitui TUDO!)

**⚠️ IMPORTANTE:**
- Isso irá **substituir TODOS os dados atuais**
- Faça um backup antes de importar
- Só funciona com arquivos JSON válidos exportados pelo sistema

### 4. **Limpar Todos os Dados** 🗑️

**Como usar:**
1. Clique em "Limpar Todos os Dados" (botão vermelho)
2. Confirme **duas vezes** (dupla confirmação)
3. Todos os dados serão deletados e a página será recarregada

**⚠️ ATENÇÃO:**
- **Ação irreversível!**
- Faça backup antes se quiser recuperar os dados
- Use apenas quando quiser recomeçar do zero

---

## 📋 TABELAS DE DADOS

### Tabela de Editais
Mostra para cada edital:
- Nome do edital
- Ano
- Valor total investido
- Quantidade de contemplados
- Quantidade de aprovados
- **Demanda total** (quando disponível) com % de aprovação

### Tabela de Projetos
Mostra todos os projetos importados com:
- Edital e ano
- Nome do proponente
- Nome do projeto
- Categoria
- Valor
- **Status** (aprovado/inscrito/suplente/não aprovado) com cores:
  - 🟢 Verde: Aprovado
  - 🟠 Laranja: Suplente
  - 🔴 Vermelho: Não aprovado
  - ⚫ Cinza: Inscrito
- Bairro

**Limitação:** Mostra até 500 linhas (por performance). Para ver todos, exporte o backup.

### Tabela de Agentes Culturais
Mostra os primeiros 50 agentes com:
- Nome
- Categoria
- Bairro
- CPF/CNPJ (mascarado para privacidade: `***.***.***.79`)

**Nota:** Se houver mais de 50 agentes, aparece um alerta informando. Exporte o backup para ver todos.

---

## 🔍 ANÁLISE: DEMANDA VS OFERTA

Card especial que mostra:

```
📊 Análise: Demanda vs Oferta
─────────────────────────────────────────────
Total de Projetos:        87
✅ Aprovados (Oferta):    24  (28% do total)
📝 Inscritos (Demanda):   63  (72% do total)
```

**Interpretação:**
- **Aprovados**: Quantos projetos foram contemplados (oferta de vagas atendida)
- **Inscritos**: Quantos projetos participaram mas não foram aprovados (demanda não atendida)
- **Percentual**: Taxa de sucesso do edital

**Para Políticas Públicas:**
- Taxa < 30% → Alta competitividade, considerar ampliar edital
- Taxa > 70% → Baixa procura, considerar ajustar divulgação
- Taxa 30-70% → Equilíbrio razoável

---

## 🛡️ INFORMAÇÕES TÉCNICAS

A aba mostra no rodapé:
- **Tamanho do localStorage**: Quantos caracteres estão armazenados
- **Capacidade usada**: Percentual do limite de ~5MB do navegador
- **Alerta**: Lembrete de fazer backups regulares

**Limites do localStorage:**
- Navegadores modernos: ~5MB a 10MB
- Dados ficam apenas neste navegador
- Limpar histórico/cache pode apagar os dados

---

## 📂 ESTRUTURA DO BACKUP (JSON)

O arquivo exportado tem esta estrutura:

```json
{
  "agentes": [
    {
      "nome": "Maria Silva",
      "categoria": "Artesanato",
      "bairro": "Vila",
      "cpf_cnpj": "123.456.789-00"
    }
  ],
  "grupos": [...],
  "espacos": [...],
  "editais": [
    {
      "id": "edital-2024-programa-de-estimulo-a-cultura",
      "nome": "Programa de Estímulo à Cultura",
      "ano": 2024,
      "valorTotal": 980000,
      "qtdInscritos": 24,
      "qtdAprovados": 24,
      "qtdTotalInscritos": 87,
      "cor": "#0b57d0",
      "projetos": [...]
    }
  ],
  "projetos": [
    {
      "editalNome": "Programa de Estímulo à Cultura",
      "editalAno": 2024,
      "nomeProponente": "Associação Castelhanos Vive",
      "cpfCnpj": "26.664.171/0001-09",
      "nomeProjeto": "Projeto Cultural A",
      "categoria": "Faixa 1 - R$ 120.000",
      "valor": 120000,
      "status": "aprovado",
      "bairro": "Castelhanos",
      "qtdTotalInscritos": 87
    }
  ],
  "categorias": [...],
  "evolucao": [...]
}
```

---

## 🎨 DESIGN E CORES

### Cards de Resumo
- Azul institucional: `#0b57d0`
- Fundo branco com sombra suave
- Ícones grandes e números em destaque

### Tabelas
- Cabeçalho: Fundo azul claro (`#f0f9ff`)
- Linhas alternadas com hover
- Texto em hierarquia visual (negrito para principais)

### Chips de Status
- 🟢 Aprovado: Verde (`#22c55e`)
- 🟠 Suplente: Laranja (`#f59e0b`)
- 🔴 Não aprovado: Vermelho (`#ef4444`)
- ⚫ Inscrito: Cinza (`#6b7280`)

---

## 🔧 CASOS DE USO

### Caso 1: Backup Regular
**Cenário:** Sexta-feira, fim do expediente  
**Ação:**
1. AdminPage → Aba "💾 Status dos Dados"
2. Clicar "Exportar Backup (JSON)"
3. Salvar arquivo em pasta segura (Dropbox, Google Drive, etc.)

### Caso 2: Mudança de Computador
**Cenário:** Precisa trabalhar em outro computador  
**Ação:**
1. No computador antigo: Exportar backup
2. Transferir arquivo JSON (email, pen drive, nuvem)
3. No computador novo: Importar backup

### Caso 3: Recuperação de Erro
**Cenário:** Importação incorreta sobrescreveu dados  
**Ação:**
1. Localizar backup anterior
2. AdminPage → "Importar Backup (JSON)"
3. Selecionar backup correto
4. Confirmar substituição

### Caso 4: Recomeçar do Zero
**Cenário:** Quer limpar tudo e começar de novo  
**Ação:**
1. AdminPage → "Limpar Todos os Dados"
2. Confirmar duas vezes
3. Sistema recarrega com dados limpos

### Caso 5: Auditoria de Dados
**Cenário:** Verificar quantos contemplados há realmente  
**Ação:**
1. AdminPage → Aba "💾 Status dos Dados"
2. Ver card "✅ Aprovados (Oferta)"
3. Conferir na tabela de projetos com filtro verde

---

## 🚨 AVISOS IMPORTANTES

### ⚠️ Privacidade
- CPFs/CNPJs são **mascarados** na visualização: `***.***.***.79`
- No backup JSON, os dados **completos** são exportados
- **NÃO compartilhe** backups publicamente (contém dados sensíveis)

### ⚠️ Limite de Armazenamento
- localStorage tem limite de ~5MB
- Se ultrapassar, o navegador pode recusar salvar
- Solução: Exportar backup e limpar dados antigos

### ⚠️ Compatibilidade
- Dados ficam **apenas neste navegador**
- Chrome, Firefox, Edge, Safari têm limites diferentes
- **NÃO funciona** em modo anônimo/privado

---

## 📊 EXEMPLO DE TELA

```
┌─────────────────────────────────────────────────────────────┐
│  💾 Status dos Dados Armazenados                            │
│  Visualize, edite e gerencie todos os dados salvos         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │
│  │ 👥  │  │ 🎭  │  │ 🏛️  │  │ 📊  │  │ 📝  │              │
│  │ 245 │  │  18 │  │  12 │  │   3 │  │  87 │              │
│  │Agent│  │Grupo│  │Espaç│  │Edita│  │Proje│              │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘              │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📊 Análise: Demanda vs Oferta                         │  │
│  │                                                        │  │
│  │  Total: 87   │  ✅ Aprovados: 24 (28%)  │  📝 Inscr: 63 │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [💾 Exportar Backup] [📥 Importar Backup] [🗑️ Limpar]     │
│                                                              │
│  ▼ Editais Cadastrados (3)                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Nome                │ Ano │ Valor    │ Contemplados   │  │
│  │ PEC 2024           │ 2024│ R$ 980k  │ 24 (28% aprov) │  │
│  │ Aldir Blanc        │ 2020│ R$ 1.2M  │ 45 (45% aprov) │  │
│  │ PNAB 2022          │ 2022│ R$ 500k  │ 18 (36% aprov) │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ▼ Projetos Cadastrados (87) [24 Aprovados] [63 Inscritos] │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Edital  │ Proponente      │ Projeto   │ Status │ Valor│  │
│  │ PEC2024 │ Assoc. Cast...  │ Preserv...│[Aprov.]│120k │  │
│  │ PEC2024 │ Centro Cult...  │ Festival..│[Aprov.]│ 50k │  │
│  │ PEC2024 │ Maria Silva     │ Artesa... │[Inscr.]│ 30k │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ RESUMO

**Benefícios:**
- ✅ Visualização completa e organizada dos dados
- ✅ Backup e restauração fácil
- ✅ Análise de demanda vs oferta em tempo real
- ✅ Identificação rápida de problemas nos dados
- ✅ Gestão segura com confirmações duplas

**Principais Recursos:**
- 📊 Cards de resumo com totais
- 📈 Análise de aprovação/rejeição
- 💾 Exportar backup JSON
- 📥 Importar backup JSON
- 🗑️ Limpar todos os dados
- 📋 Tabelas completas e navegáveis
- 🎨 Interface limpa e profissional

---

## 🚀 PRÓXIMAS MELHORIAS POSSÍVEIS

1. **Filtros nas Tabelas**
   - Buscar por nome, categoria, bairro
   - Ordenação por colunas

2. **Edição Individual**
   - Corrigir dados diretamente na tabela
   - Deletar registros específicos

3. **Estatísticas Avançadas**
   - Gráficos de distribuição por bairro
   - Evolução temporal dos editais

4. **Exportação em Excel**
   - Além de JSON, permitir `.xlsx`
   - Múltiplas abas (uma por tipo de dado)

5. **Validação de Dados**
   - Detectar registros duplicados
   - Identificar campos obrigatórios vazios
   - Sugerir correções automáticas

---

**Desenvolvido para:** Cadastro Cultural de Ilhabela  
**Objetivo:** Gestão transparente e eficiente dos dados culturais  
**Implementado em:** 2026-02-25
