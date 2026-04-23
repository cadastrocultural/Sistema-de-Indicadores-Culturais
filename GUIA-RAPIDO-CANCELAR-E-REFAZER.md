# ⚡ SOLUÇÃO IMEDIATA: CLIQUE NO BOTÃO "CANCELAR" E REFAÇA A IMPORTAÇÃO

## 🚨 PROBLEMA ATUAL:
Você está na tela de confirmação vendo:
- **98 projetos prontos para importar**
- **Valor total: R$ 0,00** ❌

## ✅ SOLUÇÃO EM 5 MINUTOS:

### **PASSO 1: CANCELAR ESTA IMPORTAÇÃO**
1. **NÃO CLIQUE EM "CONFIRMAR IMPORTAÇÃO"!**
2. Clique no botão **"CANCELAR"** ou recarregue a página (F5)

---

### **PASSO 2: ABRIR SUA PLANILHA EXCEL**
1. Abra o arquivo Excel que você acabou de usar
2. Localize a coluna chamada **"Faixa"** (tem valores como "Faixa 1", "Faixa 2", "Faixa 3")

---

### **PASSO 3: CRIAR A COLUNA "Valor"**
1. **Crie uma nova coluna** ao lado da coluna "Faixa"
2. **Nomeie essa coluna** de: `Valor` (sem acento, sem espaço)
3. **Preencha os valores** de acordo com a faixa:

| Faixa | Valor |
|-------|-------|
| Faixa 1 | 120000 |
| Faixa 2 | 50000 |
| Faixa 3 | 30000 |

**⚠️ IMPORTANTE:**
- Use **APENAS NÚMEROS** (sem R$, sem pontos, sem vírgulas)
- ✅ Correto: `120000`
- ❌ Errado: `R$ 120.000,00` ou `120.000`

---

### **EXEMPLO VISUAL DA PLANILHA:**

```
| Nome do Projeto          | Faixa    | Valor  | status   |
|--------------------------|----------|--------|----------|
| Projeto Margaridas 2     | Faixa 2  | 50000  | aprovado |
| O Jardim das Memórias    | Faixa 3  | 30000  | aprovado |
| Kamishibai               | Faixa 3  | 30000  | aprovado |
| Narrativas ao Sol        | Faixa 3  | 30000  | aprovado |
| Cultura Urbana Ilhabela  | Faixa 1  | 120000 | aprovado |
```

---

### **PASSO 4: CRIAR A COLUNA "status"** (SE NÃO EXISTIR)
1. **Crie outra coluna** chamada: `status`
2. **Preencha TODAS as linhas** com: `aprovado`

---

### **PASSO 5: FILTRAR APENAS OS 24 APROVADOS**

**Opção A: Se você tem o PDF dos habilitados:**
1. Abra o PDF: https://www.ilhabela.sp.gov.br/editais/comunicado_1_27045930.pdf
2. Compare os nomes dos 24 aprovados
3. **Delete as linhas** dos projetos que NÃO estão no PDF
4. Mantenha apenas os 24 aprovados

**Opção B: Se você já sabe quais são os 24:**
1. Filtre sua planilha para mostrar apenas os 24 aprovados
2. **Copie** essas 24 linhas
3. **Cole** em uma nova planilha
4. Salve com um nome diferente (ex: "PEC_2024_Aprovados.xlsx")

---

### **PASSO 6: SALVAR E FAZER UPLOAD NOVAMENTE**
1. **Salve a planilha** modificada (Ctrl+S)
2. Volte para a página **AdminPage**
3. **Clique em "+ Adicionar Novo Edital"**
4. Preencha:
   - Nome: `Programa de Estímulo à Cultura`
   - Ano: `2024`
5. **Upload da planilha** modificada (com as colunas "Valor" e "status")

---

### **PASSO 7: MAPEAR AS COLUNAS CORRETAMENTE**

Na tela de mapeamento, faça assim:

| Campo do Sistema | Coluna da Planilha |
|------------------|-------------------|
| Nome do Projeto  | Nome do Projeto   |
| Proponente       | Tipo de Pessoa ou Nome |
| CPF/CNPJ         | CPF/CNPJ          |
| Categoria        | Categoria         |
| **Linguagem**    | **Qual a linguagem** ✅ |
| **Faixa**        | **Faixa** ✅ |
| **Valor**        | **Valor** ✅ **OBRIGATÓRIO!** |
| **Status**       | **status** ✅ **OBRIGATÓRIO!** |
| Bairro           | Bairro (ou deixe em branco) |

**⚠️ CRÍTICO:**
- Mapeie **"Valor"** → coluna que tem `120000`, `50000`, `30000`
- Mapeie **"Status"** → coluna que tem `aprovado`
- Se não mapear, vai dar **R$ 0,00** de novo!

---

### **PASSO 8: CONFIRMAR O PREVIEW**

Depois de mapear, o sistema mostra um preview. **Confira se:**

✅ **Valor total** mostra um número DIFERENTE de zero  
✅ **Quantidade** mostra **24 projetos** (não 98)  
✅ **Preview** mostra os valores corretos  

**Exemplo do que você DEVE VER:**

```
✅ 24 projetos prontos para importar
Edital: Programa de Estímulo à Cultura (2024) - Valor total: R$ 980.000,00

Preview dos primeiros projetos:
Pessoa Física -- Projeto Margaridas 2 (Faixa 2) - R$ 50.000,00
Pessoa Física -- O Jardim das Memórias (Faixa 3) - R$ 30.000,00
Pessoa Física -- Kamishibai (Faixa 3) - R$ 30.000,00
```

---

### **PASSO 9: CONFIRMAR IMPORTAÇÃO**

**Se o preview mostra R$ 980.000,00:**
1. ✅ Clique em **"CONFIRMAR IMPORTAÇÃO"**
2. Aguarde o reload automático
3. Vai para **Tab 3 "📊 Editais (Resumo)"**
4. Confira o card do edital:

```
Programa de Estímulo à Cultura (2024)
📝 24 inscritos | ✅ 24 aprovados | 💰 R$ 980.000,00
```

**Se o preview AINDA mostra R$ 0,00:**
1. ❌ **NÃO CONFIRME!**
2. Volte e verifique se:
   - A coluna "Valor" existe na planilha
   - Os valores são números puros (120000, não "R$ 120.000")
   - Você mapeou corretamente a coluna "Valor"

---

## 🎯 CHECKLIST FINAL:

- [ ] Cancelei a importação atual (R$ 0,00)
- [ ] Abri a planilha Excel
- [ ] Criei a coluna "Valor" com 120000, 50000 ou 30000
- [ ] Criei a coluna "status" com "aprovado"
- [ ] Filtrei apenas os 24 aprovados
- [ ] Salvei a planilha modificada
- [ ] Fiz novo upload
- [ ] Mapeei as colunas "Valor" e "Status"
- [ ] Preview mostra R$ 980.000,00 (não R$ 0,00)
- [ ] Confirmeio a importação
- [ ] Card mostra 24 aprovados e R$ 980.000,00

---

## ❓ DÚVIDAS FREQUENTES:

### **"Não sei quais são os 24 aprovados"**
- Abra o PDF: https://www.ilhabela.sp.gov.br/editais/comunicado_1_27045930.pdf
- Lista completa dos habilitados está lá

### **"A coluna Valor já existe mas está vazia"**
- Preencha manualmente:
  - Faixa 1 = `120000`
  - Faixa 2 = `50000`
  - Faixa 3 = `30000`

### **"Tenho 98 linhas na planilha"**
- Normal! São 24 aprovados + 74 inscritos
- Você precisa **filtrar e manter apenas os 24 aprovados**

### **"Não sei usar Excel"**
- No Excel, clique na coluna ao lado de "Faixa"
- Clique com botão direito → "Inserir coluna"
- Digite "Valor" no cabeçalho
- Preencha as células com os números

---

## 🚀 TEMPO ESTIMADO: 5-10 MINUTOS

---

**Precisa de mais ajuda? Me avise em qual passo você está com dificuldade!**
