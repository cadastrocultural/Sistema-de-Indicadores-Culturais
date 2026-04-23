# 📋 GUIA: COMO IMPORTAR PROJETOS APROVADOS COM FAIXAS DE VALORES

## 🎯 PROBLEMA IDENTIFICADO

Você tem 87 projetos importados, mas o sistema mostra **"0 aprovados"** porque:

1. O sistema busca pela coluna **"status"** com as palavras: `aprovado`, `classificado`, `selecionado` ou `contemplado`
2. Sua planilha tem as colunas **"Faixa"** e **"Linguagem"**, mas **NÃO tem** a coluna "status" preenchida
3. Por isso, o sistema não reconhece os projetos como aprovados

---

## ✅ SOLUÇÕES DISPONÍVEIS

### **SOLUÇÃO 1: Adicionar Coluna "Status" na Planilha** (Recomendado)

1. **Abra sua planilha Excel**
2. **Adicione uma nova coluna** chamada `status`
3. **Preencha com "aprovado"** para TODOS os projetos que foram aprovados
4. **Salve a planilha**
5. **Reimporte** no sistema:
   - AdminPage → Tab 3 "📊 Editais (Resumo)"
   - Clique em **"DELETAR"** no edital antigo
   - Faça upload da planilha nova
   - Clique em **"Confirmar Importação"**

**Exemplo da planilha:**

| Nome do Projeto | Resumo | Qual a linguagem | Faixa | **status** |
|-----------------|--------|------------------|-------|------------|
| Projeto Margaridas 2 | Arte e Saberes... | Arte e Saberes Indígenas | Faixa 2: 04 projetos | **aprovado** |
| O Jardim das Memórias | Resumo... | Aurora | Faixa 3: 18 projetos | **aprovado** |
| Kamishibai | Resumo... | Teatro de Papel | Faixa 3: 18 projetos | **aprovado** |

---

### **SOLUÇÃO 2: Usar a Presença de "Faixa" como Indicador**

Se você **NÃO quer** editar a planilha, posso **modificar o código** para:

- **Reconhecer automaticamente como aprovado** todos os projetos que têm a coluna **"Faixa"** preenchida
- **Reconhecer automaticamente como aprovado** todos os projetos que têm a coluna **"Linguagem"** preenchida

**Vantagem:** Não precisa editar a planilha  
**Desvantagem:** Requer alteração no código do sistema

---

### **SOLUÇÃO 3: Importar Apenas Lista de Aprovados**

Se você tem uma **lista separada** de aprovados (PDF ou Excel):

1. **Crie uma nova planilha** apenas com os aprovados
2. **Adicione a coluna "status" com valor "aprovado"**
3. **Importe essa planilha**

O sistema vai:
- Comparar por CPF/CNPJ + Nome do Projeto
- Atualizar automaticamente o status dos existentes

---

## 🔧 COMO MAPEAR AS COLUNAS CORRETAMENTE

Quando você faz upload da planilha, o sistema pede para **mapear as colunas**. Para editais, mapeie assim:

| Campo do Sistema | Nome da Coluna na Planilha |
|------------------|----------------------------|
| **Nome do Projeto** | `Nome do Projeto` |
| **Resumo** | `Resumo da Proposta` ou `Resumo` |
| **Proponente** | (nome da coluna de proponente) |
| **CPF/CNPJ** | `CPF/CNPJ` |
| **Categoria** | `Categoria` |
| **Linguagem** | `Qual a linguagem` ✅ NOVA COLUNA |
| **Faixa** | Deixar em branco ou mapear se existir ✅ NOVA COLUNA |
| **Valor** | `Valor` |
| **Status** | `status` ⚠️ OBRIGATÓRIO PARA APROVADOS |
| **Bairro** | `Bairro` |

---

## 📊 FAIXAS DE VALORES DO EDITAL

Pelas imagens que você mostrou, o edital tem essas faixas:

- **Faixa 1**: 02 projetos (valores menores)
- **Faixa 2**: 04 projetos (valores médios - ex: R$ 50.000,00)
- **Faixa 3**: 18 projetos (valores maiores - ex: R$ 30.000,00)

### Como registrar no sistema:

1. **Na planilha**, mantenha a coluna "Faixa" com o texto:
   - `Faixa 1: 02 projetos com...`
   - `Faixa 2: 04 projetos com...`
   - `Faixa 3: 18 projetos com...`

2. **Adicione a coluna "status" = "aprovado"**

3. **O sistema vai reconhecer** automaticamente e criar estatísticas por faixa

---

## 🎯 PASSO A PASSO COMPLETO

### **PREPARAR A PLANILHA:**

1. Abra sua planilha Excel dos **87 projetos**
2. Adicione uma nova coluna chamada **"status"**
3. Preencha **"aprovado"** em todas as linhas de projetos aprovados
4. Se alguns não foram aprovados, deixe em branco ou escreva **"não aprovado"**
5. Salve a planilha

### **DELETAR O EDITAL ANTIGO:**

1. Vá em **AdminPage → Tab 3 "📊 Editais (Resumo)"**
2. Clique no botão vermelho **"DELETAR"** no card do edital
3. Confirme a exclusão

### **IMPORTAR NOVAMENTE:**

1. Clique em **"+ Adicionar Novo Edital"**
2. Preencha:
   - **Nome do Edital**: `Programa de Estímulo à Cultura` (ou o nome correto)
   - **Ano**: `2024`
3. Clique em **"BAIXAR TEMPLATE"** para ver o exemplo
4. Faça **upload da sua planilha** (com a coluna "status" adicionada)
5. **Mapeie as colunas** corretamente (veja tabela acima)
6. Verifique o preview que mostra os primeiros projetos
7. Clique em **"CONFIRMAR IMPORTAÇÃO"** (botão verde)
8. Aguarde o reload automático da página

### **VERIFICAR:**

1. Depois do reload, vá até o card do edital
2. Verifique se mostra:
   - **📝 Inscritos**: 87
   - **✅ Aprovados**: 87 (ou o número correto se alguns não foram aprovados)
   - **💰 Valor Total**: (soma dos valores)

---

## 🔴 ERROS COMUNS

### **1. "0 Aprovados" mesmo depois de importar**
**Causa:** Coluna "status" não foi mapeada ou está vazia  
**Solução:** Verifique se a coluna "status" tem o valor "aprovado" (tudo minúsculo)

### **2. "87 Inscritos, 0 Aprovados"**
**Causa:** A coluna "status" não contém as palavras-chave reconhecidas  
**Solução:** Use exatamente: `aprovado`, `classificado`, `selecionado` ou `contemplado`

### **3. "Duplicatas detectadas"**
**Causa:** O sistema compara por CPF/CNPJ + Nome do Projeto  
**Solução:** Isso é normal! O sistema remove duplicatas automaticamente

### **4. "Preview mostra dados errados"**
**Causa:** Mapeamento de colunas incorreto  
**Solução:** Refaça o mapeamento com atenção à tabela acima

---

## 💡 DICAS IMPORTANTES

1. **Sempre** adicione a coluna "status" com valor "aprovado" para projetos aprovados
2. **Sempre** clique em "DELETAR" antes de reimportar o mesmo edital (evita duplicatas)
3. **Sempre** verifique o preview antes de confirmar a importação
4. **Sempre** aguarde o reload automático após a importação
5. **Mantenha** as colunas "Faixa" e "Linguagem" - o sistema reconhece automaticamente

---

## 📞 PRECISA DE AJUDA?

Se ainda tiver problemas:

1. **Mostre** a estrutura da sua planilha (nomes das colunas)
2. **Mostre** exemplos de dados (sem informações sensíveis)
3. **Descreva** o erro exato que está acontecendo
4. **Indique** se prefere editar a planilha ou modificar o código

---

## 🆕 PRÓXIMAS MELHORIAS SUGERIDAS

### **Funcionalidade Automática:**
- **Reconhecer automaticamente como aprovado** projetos com "Faixa" preenchida
- **Importar PDF de aprovados** e cruzar com lista de inscritos
- **Dashboard de Faixas** mostrando estatísticas separadas por Faixa 1, 2 e 3
- **Filtro por Faixa** no Dashboard

Quer que eu implemente alguma dessas melhorias?
