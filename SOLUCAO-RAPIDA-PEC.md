# 🚨 SOLUÇÃO RÁPIDA: IMPORTAR OS 24 PROJETOS APROVADOS DO PEC

## ⚠️ PROBLEMA ATUAL:
- Sistema mostra **98 projetos** (inscritos + aprovados misturados)
- Valores mostram **R$ 0,00** (não detectou)
- PDF dos habilitados em: https://www.ilhabela.sp.gov.br/editais/comunicado_1_27045930.pdf

---

## ✅ SOLUÇÃO IMEDIATA (SEM CÓDIGO):

### **PASSO 1: FILTRAR APENAS OS APROVADOS NA PLANILHA**

1. **Abra sua planilha Excel** dos 98 projetos
2. **Identifique quais são os 24 aprovados** (compare com o PDF do link)
3. **Crie uma nova aba** ou **nova planilha** chamada "PEC_Aprovados"
4. **Copie APENAS os 24 projetos aprovados** para essa nova planilha
5. **Adicione a coluna "status"** e preencha com `aprovado` em todas as linhas

**Exemplo:**

| Nome do Projeto | Faixa | Valor | status |
|-----------------|-------|-------|--------|
| Projeto Margaridas 2 | Faixa 2 | 50000 | aprovado |
| O Jardim das Memórias | Faixa 3 | 30000 | aprovado |
| Kamishibai | Faixa 3 | 30000 | aprovado |
| ... | ... | ... | aprovado |

---

### **PASSO 2: PREENCHER OS VALORES MANUALMENTE**

Na sua planilha, preencha a coluna **"Valor"** de acordo com a faixa:

- **Faixa 1**: `120000` (2 projetos)
- **Faixa 2**: `50000` (4 projetos)
- **Faixa 3**: `30000` (18 projetos)

**⚠️ IMPORTANTE:** Use números sem pontos ou vírgulas:
- ✅ CORRETO: `120000`
- ❌ ERRADO: `120.000,00` ou `R$ 120.000`

---

### **PASSO 3: DELETAR O EDITAL ANTIGO**

1. Vá em **AdminPage → Tab 3 "📊 Editais (Resumo)"**
2. Localize o card **"Programa de Estímulo à Cultura (2024)"**
3. Clique no botão vermelho **"DELETAR"**
4. Confirme a exclusão
5. **Aguarde a página recarregar**

---

### **PASSO 4: IMPORTAR A PLANILHA FILTRADA**

1. Clique em **"+ Adicionar Novo Edital"**
2. Preencha:
   - **Nome do Edital**: `Programa de Estímulo à Cultura`
   - **Ano**: `2024`
3. Clique em **"UPLOAD PLANILHA DO EDITAL"**
4. Selecione a planilha **com apenas os 24 aprovados**
5. O sistema vai mostrar a tela de mapeamento

---

### **PASSO 5: MAPEAR AS COLUNAS CORRETAMENTE**

Na tela de mapeamento, configure assim:

| Campo do Sistema | Nome da Coluna na sua Planilha |
|------------------|-------------------------------|
| **Nome do Projeto** | `Nome do Projeto` ou similar |
| **Proponente** | Nome da coluna de proponente |
| **CPF/CNPJ** | `CPF/CNPJ` ou similar |
| **Categoria** | `Categoria` ou similar |
| **Linguagem** | `Qual a linguagem` ✅ |
| **Faixa** | `Faixa` ✅ |
| **Valor** | `Valor` ✅ OBRIGATÓRIO |
| **Status** | `status` ✅ OBRIGATÓRIO |
| **Bairro** | `Bairro` (ou deixe em branco) |

⚠️ **CRÍTICO:** 
- Mapeie **"Valor"** corretamente!
- Mapeie **"Status"** corretamente!
- Se não mapear, vai dar R$ 0,00 novamente

---

### **PASSO 6: CONFERIR O PREVIEW**

Depois de mapear, o sistema mostra um preview. **Confira se:**

- ✅ **Valor total** mostra um número (não R$ 0,00)
- ✅ **Quantidade** mostra 24 projetos (não 98)
- ✅ **Preview** mostra os valores corretos

**Exemplo do que você DEVE VER:**

```
✅ 24 projetos prontos para importar
Edital: Programa de Estímulo à Cultura (2024) - Valor total: R$ 980.000,00

Preview dos primeiros projetos:
Pessoa Física -- Projeto Margaridas 2 - Arte e Saberes Indígenas (Faixa 2) - R$ 50.000,00
Pessoa Física -- O Jardim das Memórias de Aurora (Faixa 3) - R$ 30.000,00
Pessoa Física -- Kamishibai - O Teatro de Papel (Faixa 3) - R$ 30.000,00
```

---

### **PASSO 7: CONFIRMAR IMPORTAÇÃO**

1. Se o preview está correto, clique em **"CONFIRMAR IMPORTAÇÃO"** (botão verde)
2. **Aguarde o reload automático** da página
3. Depois do reload, volte para **Tab 3 "📊 Editais (Resumo)"**
4. Verifique o card do edital:

```
Programa de Estímulo à Cultura
2024
📝 Inscritos: 24
✅ Aprovados: 24
💰 Valor Total: R$ 980.000,00
```

---

## 🎯 CHECKLIST FINAL:

- [ ] Filtrei apenas os 24 aprovados na planilha
- [ ] Adicionei a coluna "status" com valor "aprovado"
- [ ] Preenchi a coluna "Valor" com 120000, 50000 ou 30000
- [ ] Deletei o edital antigo (98 projetos)
- [ ] Fiz upload da planilha nova (24 projetos)
- [ ] Mapeei corretamente as colunas "Valor" e "Status"
- [ ] Preview mostra R$ 980.000,00 (não R$ 0,00)
- [ ] Confirmeio a importação
- [ ] Card mostra 24 aprovados e R$ 980.000,00

---

## 🔴 SE AINDA DER ERRO:

### **Erro: "Valor total: R$ 0,00"**
**Causa:** Coluna "Valor" não foi mapeada ou está vazia  
**Solução:** Volte e mapeie a coluna "Valor" corretamente

### **Erro: "0 Aprovados"**
**Causa:** Coluna "status" não foi mapeada ou não contém "aprovado"  
**Solução:** Verifique se a coluna "status" tem exatamente a palavra `aprovado`

### **Erro: "98 projetos" ainda aparece**
**Causa:** Não deletou o edital antigo antes de reimportar  
**Solução:** Delete o edital e importe novamente

### **Erro: "Duplicatas detectadas"**
**Causa:** Mesmos projetos foram importados duas vezes  
**Solução:** Normal! O sistema remove duplicatas automaticamente

---

## 📄 SOBRE O PDF DOS HABILITADOS:

O PDF em https://www.ilhabela.sp.gov.br/editais/comunicado_1_27045930.pdf **NÃO pode ser importado diretamente** pelo sistema atual.

**Você precisa:**
1. **Abrir o PDF** manualmente
2. **Copiar a lista de nomes** dos 24 habilitados
3. **Filtrar sua planilha Excel** para mostrar apenas esses 24 projetos
4. **Importar a planilha filtrada** (não o PDF)

---

## 💡 RESUMO EM 3 PASSOS:

1. **FILTRE**: Crie planilha com apenas 24 aprovados + coluna "status=aprovado" + valores corretos
2. **DELETE**: Remova o edital antigo dos 98 projetos
3. **IMPORTE**: Upload da planilha filtrada e mapeie "Valor" e "Status"

---

**🎯 RESULTADO ESPERADO:**

```
Programa de Estímulo à Cultura (2024)
📝 24 inscritos | ✅ 24 aprovados | 💰 R$ 980.000,00
```

**Distribuição:**
- Faixa 1: 2 projetos × R$ 120.000 = R$ 240.000
- Faixa 2: 4 projetos × R$ 50.000 = R$ 200.000
- Faixa 3: 18 projetos × R$ 30.000 = R$ 540.000

---

**Precisa de mais ajuda com algum passo específico?**
