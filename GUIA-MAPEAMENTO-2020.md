# 🗺️ Guia: Importar Mapeamento Cultural 2020

## ✨ O que é o Mapeamento 2020?

O Mapeamento Cultural de 2020 é um **cadastro completo** de TODOS os agentes culturais de Ilhabela que se inscreveram, independente de terem sido contemplados em editais. 

Este dado é fundamental para:
- 📊 Estatísticas gerais de participação
- 🗺️ Visualização geográfica de todos os agentes
- 📈 Análise de alcance por bairro e categoria
- 🎯 Diferenciação entre inscritos vs contemplados

---

## 📋 Estrutura da Planilha do Mapeamento 2020

### Colunas Obrigatórias:

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| **nome** | Texto | Nome completo do agente/coletivo | `João da Silva` |
| **categoria** | Texto | Área de atuação cultural | `Música`, `Artesanato` |
| **bairro** | Texto | Localidade em Ilhabela | `Vila`, `Perequê`, `Castelhanos` |
| **cpf** ou **cnpj** | Texto | CPF para PF ou CNPJ para PJ | `***.***.***-00` |

### Colunas Opcionais (Recomendadas):

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| **lat** | Número | Latitude (decimal) | `-23.778` |
| **lng** | Número | Longitude (decimal) | `-45.358` |
| **email** | Texto | E-mail de contato | `agente@email.com` |
| **telefone** | Texto | Telefone | `(12) 98888-8888` |

---

## 🎯 Passo a Passo: Importação

### 1️⃣ **Acesse o Painel Admin**
- Clique em `⚙️ Admin` no menu superior
- Selecione a aba **"🗺️ Mapeamento 2020"**

### 2️⃣ **Baixe o Template**
- Clique em "Baixar Template"
- Arquivo: `template-mapeamento-2020.xlsx`

### 3️⃣ **Preencha com Seus Dados**

Abra no Excel e organize assim:

```
nome                           | categoria        | bairro      | cpf              | lat      | lng       | email                | telefone
João da Silva                  | Música           | Vila        | ***.***.***-00   | -23.778  | -45.358   | joao@email.com      | (12) 98888-8888
Maria Santos                   | Artesanato       | Perequê     | ***.***.***-11   | -23.815  | -45.362   | maria@email.com     | (12) 97777-7777
Associação Cultural XYZ        | Cultura Caiçara  | Castelhanos | 00.000.000/0001  | -23.855  | -45.295   | contato@xyz.com     | (12) 96666-6666
Pedro Oliveira                 | Audiovisual      | Vila        | ***.***.***-22   | 0        | 0         | pedro@email.com     | (12) 95555-5555
```

**⚠️ Observações:**
- Se não tiver coordenadas (lat/lng), use `0` ou deixe vazio
- CPF/CNPJ pode ser parcialmente mascarado por privacidade: `***.***.***-00`
- Email e telefone são opcionais

### 4️⃣ **Salve como .xlsx**
- Arquivo → Salvar Como
- Formato: "Pasta de Trabalho do Excel (.xlsx)"
- Nome sugerido: `mapeamento-ilhabela-2020.xlsx`

### 5️⃣ **Upload no Sistema**
- No painel Admin, tab "🗺️ Mapeamento 2020"
- Clique em "Upload Excel (Mapeamento 2020)"
- Selecione seu arquivo
- Aguarde o processamento

### 6️⃣ **Revise o Preview**

Você verá uma tabela com:
- ✅ Nome dos agentes
- ✅ Categoria de atuação
- ✅ Bairro
- ✅ Indicação se tem localização no mapa

**Exemplo de Preview:**

| Nome | Categoria | Bairro | CPF/CNPJ | Localização |
|------|-----------|--------|----------|-------------|
| João da Silva | Música | Vila | ***.***.***-00 | ✓ Com mapa |
| Maria Santos | Artesanato | Perequê | ***.***.***-11 | ✓ Com mapa |
| Pedro Oliveira | Audiovisual | Vila | ***.***.***-22 | Sem coord. |

### 7️⃣ **Aplique os Dados**
- Clique em **"Aplicar Dados no Sistema"**
- A página será recarregada
- Os dados aparecerão no mapa e estatísticas

---

## 🗺️ Como os Dados Aparecem no Sistema

### **1. Mapa Interativo (Dashboard)**
- Todos os agentes com lat/lng aparecem como pins no mapa
- Clique no pin para ver detalhes
- Diferenciação visual entre contemplados e não contemplados (próximo passo)

### **2. Estatísticas por Bairro**
- Total de inscritos por localidade
- Distribuição geográfica

### **3. Estatísticas por Categoria**
- Total de agentes por área cultural
- Comparação entre categorias

### **4. Insights Gerais**
- Total de inscritos: 1.240 (exemplo)
- Total de contemplados: 95 (exemplo)
- Taxa de sucesso por edital

---

## 📊 Diferença: Inscritos vs Contemplados

### **Mapeamento 2020 (Esta Planilha)**
- ✅ TODOS os agentes que se cadastraram
- ✅ Mostra o alcance total da política cultural
- ✅ Base para estatísticas gerais
- ✅ `eh_contemplado: false` (por padrão)

### **Editais Específicos (Próxima Etapa)**
- ✅ Apenas os contemplados de cada edital
- ✅ Valores individuais de cada projeto
- ✅ Datas de execução
- ✅ `eh_contemplado: true`

**Fluxo Completo:**
1. **Agora:** Importar Mapeamento 2020 (todos inscritos)
2. **Depois:** Importar planilhas de contemplados por edital
   - Lei Paulo Gustavo 2023
   - Lei Aldir Blanc 2020 (Editais 01 e 02)
   - PEC Local 2021
3. **Sistema:** Cruza os dados automaticamente

---

## 🎨 Categorias Aceitas

Use estas categorias padrão (ou similares):

- Música
- Audiovisual
- Artesanato / Artes Manuais
- Cultura Caiçara / Cultura Popular
- Dança
- Teatro / Artes Cênicas
- Literatura
- Artes Visuais / Artes Plásticas
- Patrimônio Imaterial
- Cultura Afro-brasileira
- Cultura Indígena
- Grupos e Coletivos
- Espaços Culturais
- Agentes Culturais

---

## 📍 Como Obter Coordenadas (lat/lng)

### **Opção 1: Google Maps**
1. Abra Google Maps
2. Clique com botão direito no local
3. Clique em "O que há aqui?"
4. Anote os números (exemplo: `-23.778, -45.358`)

### **Opção 2: Endereço Aproximado**
- Use coordenadas do centro do bairro
- Vila: `-23.778, -45.358`
- Perequê: `-23.815, -45.362`
- Castelhanos: `-23.855, -45.295`
- Bonete: `-23.835, -45.320`

### **Opção 3: Sem Coordenadas**
- Use `0` para lat e lng
- O agente aparecerá nas estatísticas mas não no mapa
- Você pode adicionar coordenadas depois

---

## ✅ Checklist Antes de Importar

- [ ] Planilha tem coluna `nome` (ou similar)
- [ ] Planilha tem coluna `categoria` (ou `area`)
- [ ] Planilha tem coluna `bairro` (ou `localidade`)
- [ ] Planilha tem coluna `cpf` ou `cnpj` (ou `documento`)
- [ ] Se tiver coordenadas, são números decimais (ex: `-23.778`)
- [ ] Arquivo salvo como .xlsx ou .xls
- [ ] Primeira linha é o cabeçalho
- [ ] Dados começam na segunda linha

---

## 🐛 Solução de Problemas

### **Preview aparece em branco**

**Causas possíveis:**
1. Arquivo sem dados (apenas cabeçalho)
2. Nomes de colunas muito diferentes do esperado
3. Dados em planilhas secundárias (use a primeira)

**Solução:**
1. Abra o Console do navegador (F12)
2. Procure por mensagens de erro em vermelho
3. Verifique se os nomes das colunas estão próximos de: `nome`, `categoria`, `bairro`, `cpf/cnpj`
4. Se necessário, renomeie as colunas no Excel

### **Coordenadas não aparecem no mapa**

**Causas:**
- lat/lng = 0 ou vazio
- Formato errado (ex: texto em vez de número)

**Solução:**
- Certifique-se que lat/lng são números
- Formato correto: `-23.778` (não `-23,778`)
- Use ponto (.) como separador decimal

### **Erro ao processar arquivo**

**Causas:**
- Arquivo corrompido
- Formato não suportado

**Solução:**
- Abra o arquivo no Excel
- Salve novamente como .xlsx
- Tente fazer upload novamente

---

## 💡 Exemplo Completo: Seu Excel Deve Ficar Assim

```
nome                           | categoria         | bairro       | cpf              | lat       | lng        | email
João da Silva                  | Música            | Vila         | 123.456.789-00   | -23.7780  | -45.3580   | joao@email.com
Maria Santos                   | Artesanato        | Perequê      | 234.567.890-11   | -23.8150  | -45.3620   | maria@email.com
Associação Castelhanos Vive    | Cultura Caiçara   | Castelhanos  | 12.345.678/0001  | -23.8550  | -45.2950   | castelhanos@org.br
Pedro Oliveira                 | Audiovisual       | Vila         | 345.678.901-22   | 0         | 0          | pedro@email.com
Ana Paula Costa                | Dança             | Bonete       | 456.789.012-33   | -23.8350  | -45.3200   | ana@email.com
Coletivo Cultural ABC          | Teatro            | Itaquanduba  | 23.456.789/0001  | -23.8200  | -45.3700   | contato@abc.com
```

---

## 🎉 Após a Importação

O sistema irá:
1. ✅ Salvar todos os agentes no banco de dados local
2. ✅ Calcular estatísticas automáticas:
   - Total de inscritos
   - Distribuição por bairro
   - Distribuição por categoria
3. ✅ Exibir os agentes com coordenadas no mapa
4. ✅ Preparar base para cruzamento com contemplados

**Próxima etapa:** Importar planilhas dos contemplados de cada edital específico!

---

## 📞 Precisa de Ajuda?

**Me envie:**
- ✅ Sua planilha Excel do Mapeamento 2020
- ✅ Print de tela do erro (se houver)
- ✅ Descrição do problema

**Eu vou:**
- ✅ Validar a estrutura
- ✅ Corrigir formatação se necessário
- ✅ Fazer a importação para você
- ✅ Confirmar que funcionou

---

**Última atualização:** Fevereiro 2026  
**Arquivo:** Guia de Importação do Mapeamento 2020  
**Status:** Sistema pronto para receber seus dados reais! 🚀
