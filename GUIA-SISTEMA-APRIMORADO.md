# 🎯 Sistema de Importação Aprimorado - Guia Completo

## ✨ Novidades na Versão 2.0

### 🔍 **Detecção Automática Inteligente**

O sistema agora reconhece automaticamente variações de nomes de colunas:

| Campo Esperado | Aceita Também |
|----------------|---------------|
| **nome** | name, agente, proponente, razao_social, razão social |
| **categoria** | area, área, segmento, linguagem |
| **bairro** | localidade, local, endereco, endereço, regiao, região |
| **cpf_cnpj** | cpf, cnpj, documento, cpf_cnpj, cpf/cnpj |
| **lat** | latitude |
| **lng** | lon, longitude |
| **email** | e-mail, mail |
| **telefone** | tel, fone, celular, whatsapp |

---

## 🚀 Como Usar

### **Método 1: Detecção Automática** (Recomendado)

1. **Prepare sua planilha Excel** com os dados do Mapeamento 2020
2. **Use qualquer nome de coluna** (o sistema detecta automaticamente)
3. **Faça upload** no painel Admin
4. **Revise o preview** - mostra exatamente o que foi detectado
5. **Aplique os dados**

**Exemplo de planilha que funciona:**

```excel
Nome do Agente         | Área de Atuação  | Localidade    | CPF/CNPJ
João da Silva          | Música           | Vila          | 123.456.789-00
Maria Santos           | Artes Manuais    | Perequê       | 234.567.890-11
Associação Cultural    | Cultura Caiçara  | Castelhanos   | 12.345.678/0001-00
```

O sistema vai detectar automaticamente:
- "Nome do Agente" → `nome`
- "Área de Atuação" → `categoria`
- "Localidade" → `bairro`
- "CPF/CNPJ" → `cpf_cnpj`

---

### **Método 2: Mapeamento Manual** (Se necessário)

Se o sistema não detectar alguma coluna automaticamente:

1. **Dialog de mapeamento** aparece automaticamente
2. **Selecione manualmente** qual coluna corresponde a cada campo
3. **Confirme** e os dados serão processados

**Exemplo:**

```
Campo Sistema    →    Coluna da sua Planilha
─────────────────────────────────────────────
nome             →    [Razão Social           ▼]
categoria        →    [Segmento Cultural      ▼]
bairro           →    [Região de Ilhabela     ▼]
cpf_cnpj         →    [Documento              ▼]
```

---

## 📊 Preview Aprimorado

### **Visualização em Tabela**

Agora o preview mostra:

✅ **Todas as colunas principais**
✅ **Status de coordenadas GPS** (✓ Com GPS / Sem coord.)
✅ **Quantidade total de registros**
✅ **Primeiros 50 registros** (todos serão importados)

**Exemplo de Preview:**

| Nome | Categoria | Bairro | Mapa |
|------|-----------|--------|------|
| João da Silva | Música | Vila | ✓ Com GPS |
| Maria Santos | Artesanato | Perequê | ✓ Com GPS |
| Pedro Oliveira | Audiovisual | Vila | Sem coord. |

---

## ✏️ **NOVO: Modo de Edição**

### Como Funciona:

1. **Após o upload**, clique em **"Editar Dados"**
2. **Campos se tornam editáveis** diretamente na tabela
3. **Corrija** nomes, categorias ou bairros se necessário
4. **Delete** linhas com dados inválidos (botão 🗑️)
5. **Clique "Concluir Edição"** quando terminar
6. **Aplique os dados** corrigidos

### Quando Usar:

- ✅ Corrigir erros de digitação na planilha original
- ✅ Padronizar nomes de categorias
- ✅ Ajustar nomes de bairros
- ✅ Remover registros duplicados ou inválidos

---

## 🔍 Diagnóstico Automático

### **Console do Navegador (F12)**

O sistema agora mostra logs detalhados:

```
📊 Dados brutos do Excel: [Array com os dados originais]
📋 Total de linhas: 1240
📋 Colunas detectadas: ["Nome do Agente", "Área de Atuação", ...]
🔄 Mapeamento automático: {nome: "Nome do Agente", categoria: "Área de Atuação", ...}
✅ Dados processados: 1240 registros
```

### **Alertas Visuais**

- 🟢 **Sucesso:** "✅ Arquivo processado! **1240** registros carregados"
- 🟡 **Aviso:** "⚠️ Algumas colunas não foram detectadas"
- 🔴 **Erro:** "❌ Planilha vazia! Certifique-se de que há dados"

---

## 📋 Formatos de Planilha Aceitos

### ✅ **Formato Ideal** (Recomendado)

```excel
nome               | categoria        | bairro      | cpf            | lat      | lng       | email
João da Silva      | Música           | Vila        | 123.456.789-00 | -23.778  | -45.358   | joao@email.com
Maria Santos       | Artesanato       | Perequê     | 234.567.890-11 | -23.815  | -45.362   | maria@email.com
```

### ✅ **Formato Simplificado** (Mínimo)

```excel
nome               | categoria        | bairro
João da Silva      | Música           | Vila
Maria Santos       | Artesanato       | Perequê
```

### ✅ **Formato com Variações** (Também funciona!)

```excel
Razão Social              | Segmento Cultural  | Localidade
João da Silva             | Músico             | Vila - Centro
Associação de Artesãos    | Artes Manuais      | Perequê
```

### ❌ **Formato NÃO Suportado**

```excel
Dados do Agente: João da Silva, Música, Vila
[Dados em uma única célula ou formato não tabular]
```

---

## 🎯 Passo a Passo Completo

### **1. Organize sua Planilha Excel**

**Regras básicas:**
- ✅ Primeira linha = Cabeçalho (nomes das colunas)
- ✅ Dados começam na segunda linha
- ✅ Uma linha = um agente/registro
- ✅ Use a primeira planilha (Sheet1)

### **2. Acesse o Painel Admin**

```
Menu → ⚙️ Admin → Tab "🗺️ Mapeamento 2020"
```

### **3. Faça Upload**

- Clique em **"Upload Planilha Excel"**
- Selecione seu arquivo `.xlsx` ou `.xls`
- Aguarde alguns segundos

### **4. Sistema Processa Automaticamente**

Você verá:
```
📊 Lendo arquivo...
📋 Detectando colunas...
🔄 Mapeando automaticamente...
✅ 1240 registros processados!
```

### **5. Revise o Preview**

**Verifique:**
- ✅ Nomes estão corretos?
- ✅ Categorias estão padronizadas?
- ✅ Bairros estão corretos?
- ✅ Coordenadas GPS estão ok?

### **6. Edite se Necessário** (Opcional)

- Clique em **"Editar Dados"**
- Corrija campos diretamente na tabela
- Delete linhas inválidas
- Clique **"Concluir Edição"**

### **7. Aplique os Dados**

- Clique em **"Aplicar Dados no Sistema"**
- Aguarde a confirmação
- Página recarrega automaticamente
- **Pronto!** Dados estão no sistema

---

## 🗺️ O Que Acontece Após a Importação

### **1. Dados são Salvos Localmente**

```javascript
localStorage.setItem('editais_imported_data', {
  agentes: [...1240 registros...]
})
```

### **2. Sistema Recarrega a Página**

Automaticamente após salvar.

### **3. Dados Aparecem em Todo o Sistema**

**Home Page:**
- ✅ Total de agentes cadastrados: **1.240**
- ✅ Estatísticas por bairro
- ✅ Estatísticas por categoria

**Dashboard (Painel):**
- ✅ Mapa com pins de todos os agentes com GPS
- ✅ Filtros por bairro e categoria funcionando
- ✅ Tabela completa de agentes

**Estatísticas Automáticas:**
- ✅ Total de inscritos vs contemplados
- ✅ Distribuição geográfica
- ✅ Distribuição por área cultural

---

## 📊 Estatísticas Geradas Automaticamente

Após importar, o sistema calcula:

### **Por Bairro:**
```
Vila: 320 agentes
Perequê: 280 agentes
Castelhanos: 95 agentes
Bonete: 68 agentes
...
```

### **Por Categoria:**
```
Música: 350 agentes
Artesanato: 280 agentes
Audiovisual: 210 agentes
Cultura Caiçara: 150 agentes
...
```

### **Com/Sem Coordenadas:**
```
Com GPS: 892 agentes (72%)
Sem coordenadas: 348 agentes (28%)
```

---

## 🐛 Solução de Problemas Avançada

### **Problema: "Preview em branco"**

**Diagnóstico:**

1. Abra o Console (F12)
2. Procure por:
   ```
   📊 Dados brutos do Excel: []
   ```
3. Se o array estiver vazio:
   - ✅ Arquivo tem dados além do cabeçalho?
   - ✅ Está usando a primeira planilha (Sheet1)?
   - ✅ Primeira linha tem os nomes das colunas?

**Solução:**
- Abra o Excel
- Certifique-se de ter pelo menos 2 linhas (1 cabeçalho + 1 dado)
- Salve novamente como `.xlsx`
- Tente novamente

---

### **Problema: "Colunas não detectadas"**

**Diagnóstico:**

No console, procure por:
```
⚠️ Colunas faltando: ['lat', 'lng', 'email']
```

**Solução:**
- Dialog de mapeamento manual aparece
- Selecione as colunas corretas
- Ou deixe como "-- Não mapear --" se não tiver esses dados

---

### **Problema: "Dados importados mas não aparecem"**

**Diagnóstico:**

1. Dados foram salvos?
   ```javascript
   console.log(localStorage.getItem('editais_imported_data'))
   ```

2. Se mostrar `null`:
   - ✅ Clicou em "Aplicar Dados no Sistema"?
   - ✅ Aguardou a confirmação?

**Solução:**
- Importe novamente
- Certifique-se de clicar em "Aplicar Dados"
- Aguarde o reload automático

---

### **Problema: "Erro ao processar arquivo"**

**Causas comuns:**
- ❌ Arquivo corrompido
- ❌ Formato não suportado (.csv, .txt)
- ❌ Excel com macros (.xlsm)

**Solução:**
1. Abra no Excel
2. Arquivo → Salvar Como → "Pasta de Trabalho do Excel (.xlsx)"
3. Tente novamente

---

## 💾 Backup e Segurança

### **Os dados ficam onde?**

```javascript
localStorage.setItem('editais_imported_data', ...)
```

- ✅ Armazenamento local do navegador
- ✅ Não são enviados para servidores
- ✅ Ficam salvos mesmo após fechar o navegador

### **Como fazer backup?**

```javascript
// No Console (F12):
console.log(localStorage.getItem('editais_imported_data'))
// Copie o JSON e salve em um arquivo .txt
```

### **Como limpar dados?**

```javascript
// No Console (F12):
localStorage.removeItem('editais_imported_data')
// Recarregue a página
```

---

## 🎉 Casos de Uso Reais

### **Cenário 1: Planilha Simples**

Você tem:
```excel
Nome | Area | Local
João | Música | Vila
Maria | Artesanato | Perequê
```

Sistema detecta:
- "Nome" → `nome` ✅
- "Area" → `categoria` ✅
- "Local" → `bairro` ✅

**Resultado:** 2 agentes importados com sucesso!

---

### **Cenário 2: Planilha Complexa**

Você tem:
```excel
Razão Social | Segmento Cultural | Região de Ilhabela | Documento | Latitude | Longitude
João da Silva | Músico Profissional | Vila - Centro | 123.456.789-00 | -23.778 | -45.358
```

Sistema detecta:
- "Razão Social" → `nome` ✅
- "Segmento Cultural" → `categoria` ✅
- "Região de Ilhabela" → `bairro` ✅
- "Documento" → `cpf_cnpj` ✅
- "Latitude" → `lat` ✅
- "Longitude" → `lng` ✅

**Resultado:** Dados completos com GPS! 🗺️

---

### **Cenário 3: Planilha com Erros**

Você tem:
```excel
nome | categoria | bairro
João Silva | Música | Vila
João Silva | Música | Vila  (duplicado)
   | Artesanato | Perequê  (nome vazio)
Maria | | Vila  (categoria vazia)
```

**Solução com Modo de Edição:**
1. Import detecta 4 registros
2. Clique "Editar Dados"
3. Delete linha duplicada (🗑️)
4. Preencha nome vazio: "Agente Anônimo"
5. Preencha categoria vazia: "Não Informado"
6. Clique "Concluir Edição"
7. Aplique os dados corrigidos

**Resultado:** 3 agentes válidos importados!

---

## 📞 Suporte

**Me envie:**
1. ✅ Print da planilha Excel (primeiras linhas)
2. ✅ Print do Console (F12) após upload
3. ✅ Descrição do erro ou problema

**Responderei com:**
1. ✅ Diagnóstico do problema
2. ✅ Solução passo a passo
3. ✅ Planilha corrigida (se necessário)

---

## 🎯 Checklist Final

Antes de importar, confirme:

- [ ] Planilha tem cabeçalho na primeira linha
- [ ] Dados começam na segunda linha
- [ ] Pelo menos 3 colunas (nome, categoria, bairro)
- [ ] Arquivo salvo como .xlsx ou .xls
- [ ] Primeira planilha (Sheet1) contém os dados
- [ ] Não há células mescladas
- [ ] Nomes de colunas fazem sentido

**Pronto para importar?** 🚀

---

**Última atualização:** Fevereiro 2026  
**Versão:** 2.0 - Sistema Inteligente com Edição  
**Status:** Pronto para receber seus dados reais do Mapeamento 2020!
