# 📋 Fluxo de Importação - Sistema de Cadastro Cultural

## ✅ Implementações Concluídas

### 1. **Dados Reais Apenas**
- ✅ Removido TODOS os dados inventados
- ✅ Sistema usa APENAS dados importados via localStorage
- ✅ Arrays vazios se não houver dados importados

### 2. **Geocodificação Melhorada** 
- ✅ Suporte para coluna `endereco` além de `bairro`
- ✅ Banco de endereços expandido (ruas, avenidas, praças)
- ✅ Normalização automática (remove acentos)
- ✅ Relatório detalhado: "X via bairro + Y via endereço"

### 3. **Fluxo de PDFs Corrigido**
- ✅ PDF é anexado ao EDITAL, não aos projetos individuais
- ✅ Instruções claras na interface sobre o fluxo em 3 passos

---

## 🔄 Fluxo Correto de Importação

### **Passo 1: Importar Inscritos**
📂 **Aba:** "Projetos de Editais (Detalhado)"

**Planilha deve conter:**
- `edital` - Nome do edital (ex: "PNAB 2024")
- `ano` - Ano do edital (ex: 2024)
- `proponente` - Nome do inscrito
- `cpf_cnpj` - CPF ou CNPJ
- `nome_projeto` - Título do projeto inscrito
- `categoria` - Área cultural
- `valor` - Valor solicitado
- `bairro` - Localização

**Status inicial:** TODOS começam como "inscrito"

---

### **Passo 2: Anexar PDF do Resultado**
📂 **Aba:** "Editais (Resumo)"

1. Importe primeiro a planilha com os editais (id, nome, ano, valorTotal, qtdProjetos, cor)
2. Para cada edital listado, clique em **"Anexar PDF"**
3. Selecione o PDF oficial com o resultado final
4. O sistema armazena o PDF no card do edital

---

### **Passo 3: Sistema Processa Automaticamente**
🤖 **O sistema deve:**
- Ler os nomes dos aprovados/suplentes do PDF
- Atualizar o `status` dos projetos de "inscrito" para:
  - `aprovado` - se consta como contemplado no PDF
  - `suplente` - se consta como suplente/reserva no PDF
  - `inscrito` - se não consta no PDF (não aprovado)

---

## 📊 Estrutura de Dados

### **Editais** (Resumo geral)
```typescript
{
  id: string,           // Ex: 'pnab2024'
  nome: string,         // Ex: 'PNAB 2024'
  ano: number,          // Ex: 2024
  valorTotal: number,   // Ex: 260000
  qtdProjetos: number,  // Ex: 13
  cor: string,          // Ex: '#FFC857'
  pdfUrl?: string,      // Base64 do PDF anexado
  pdfFileName?: string  // Nome do arquivo PDF
}
```

### **Projetos** (Detalhamento dos inscritos)
```typescript
{
  editalNome: string,     // Ex: 'PNAB 2024'
  editalAno: number,      // Ex: 2024
  nomeProponente: string, // Ex: 'Patricia Eugenia da Silva'
  cpfCnpj: string,        // Ex: '***.***.***-79'
  nomeProjeto: string,    // Ex: 'Projeto Margaridas 2'
  categoria: string,      // Ex: 'Artes Visuais'
  valor: number,          // Ex: 20000
  status: string,         // 'inscrito' | 'aprovado' | 'suplente' | 'não aprovado'
  bairro: string          // Ex: 'Vila'
}
```

---

## 🗺️ Sistema de Mapas (Com Abas)

### **Abas Necessárias:**

1. **📍 Mapeamento 2020** (349 agentes)
   - Todos os agentes culturais cadastrados em 2020
   - Fonte: `parsedData.agentes`

2. **🎯 Projetos Aprovados**
   - Apenas projetos com `status === 'aprovado'`
   - Fonte: `parsedData.projetos.filter(p => p.status === 'aprovado')`

3. **🎪 Grupos e Coletivos**
   - Grupos culturais importados
   - Fonte: `parsedData.grupos`

4. **🏛️ Espaços Culturais**
   - Espaços/equipamentos culturais
   - Fonte: `parsedData.espacos`

5. **👥 Todos os Inscritos**
   - Todos os projetos independente do status
   - Fonte: `parsedData.projetos`

---

## 📈 Gráficos Necessários

Baseado na imagem enviada pelo usuário, os gráficos devem ser:

### **1. Evolução do Investimento** (Gráfico de Linha)
- Eixo X: Anos (2020-2024)
- Eixo Y: Valor investido
- Dados: `EVOLUCAO_INVESTIMENTO`

### **2. Projetos por Categoria** (Gráfico de Barras)
- Eixo X: Categorias culturais
- Eixo Y: Quantidade de projetos
- Dados: `CATEGORIAS_GERAL`

### **3. Timeline de Editais** (Cards em linha do tempo)
- Mostra todos os editais em ordem cronológica
- Dados: `EDITAIS_STATS`

---

## 🔧 Pendências Técnicas

### **A implementar:**

1. ✅ Ajustar função `processData()` para status default "inscrito"
2. ⏳ Criar sistema de leitura/processamento de PDF
3. ⏳ Adicionar abas no componente de Mapa
4. ⏳ Adicionar importação de Grupos e Espaços na AdminPage
5. ⏳ Garantir que gráficos apareçam corretamente na HomePage

---

## 💡 Observações Importantes

- ⚠️ **NUNCA inventar dados** - usar apenas dados importados
- ⚠️ **PDF é do edital inteiro**, não de projetos individuais
- ⚠️ **Status inicial sempre "inscrito"** até processar PDF
- ⚠️ **Geocodificação**  tenta primeiro bairro, depois endereço completo
- ⚠️ **Templates de planilha** devem refletir o fluxo correto
