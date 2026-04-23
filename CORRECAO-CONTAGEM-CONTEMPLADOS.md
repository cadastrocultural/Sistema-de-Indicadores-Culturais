# 🔧 CORREÇÃO: Contagem de "Projetos Contemplados"

**Data:** 2026-02-25  
**Status:** ✅ CORRIGIDO  
**Problema:** Sistema contava TODOS os inscritos como "contemplados"  
**Solução:** Alterado para contar apenas os APROVADOS

---

## 🚨 O PROBLEMA

### Situação Reportada:
```
Usuário importou:
- 1ª importação: 87 projetos INSCRITOS (demanda total)
- 2ª importação: 24 projetos CONTEMPLADOS (aprovados)

❌ Sistema mostrava: "87 Projetos Contemplados"
✅ Deveria mostrar: "24 Projetos Contemplados"
```

### Causa Raiz:
No arquivo `/src/app/pages/HomePage.tsx` linha 148, o código estava:

```javascript
const totalProjetos = editaisFinais.reduce((acc: number, e: any) => acc + (e.qtdProjetos || 0), 0);
```

**Problema:** `qtdProjetos` conta TODOS os projetos (inscritos + aprovados)

---

## ✅ A SOLUÇÃO

### Arquivo Modificado:
`/src/app/pages/HomePage.tsx` - linha 148

### Código ANTES:
```javascript
const totalProjetos = editaisFinais.reduce((acc: number, e: any) => acc + (e.qtdProjetos || 0), 0);
```

### Código DEPOIS:
```javascript
// 🎯 CORREÇÃO: totalProjetos = apenas APROVADOS (contemplados), não todos os inscritos
const totalProjetos = editaisFinais.reduce((acc: number, e: any) => acc + (e.qtdAprovados || 0), 0);
```

### Mudança:
- **ANTES:** Somava `qtdProjetos` (todos os inscritos)
- **DEPOIS:** Soma `qtdAprovados` (apenas os contemplados)

---

## 🎯 RESULTADO ESPERADO

### No Card da HomePage:
```
┌─────────────────────────────────┐
│  🏆                              │
│                        Aprovados │
│  24                              │
│  Projetos Contemplados           │
└─────────────────────────────────┘
```

### Interpretação Correta:
- **24 = Oferta** (quantos foram aprovados/contemplados)
- **87 = Demanda** (quantos tentaram participar)
- **Taxa de sucesso** = 24/87 = 28%

---

## 📊 COMO OS DADOS SÃO CALCULADOS

### Fluxo de Importação:

1. **Importar Planilha de Inscritos (87 projetos)**
   - Aba: "📊 Editais (Resumo)" ou "🏆 Contemplados de Editais"
   - Status: `inscrito` (padrão)
   - Resultado:
     - `qtdInscritos` = 87
     - `qtdAprovados` = 0
     - `qtdTotalInscritos` = 87

2. **Importar Planilha de Contemplados (24 projetos)**
   - Aba: "🏆 Contemplados de Editais"
   - ✅ MARCAR checkbox "Esta é uma planilha de CONTEMPLADOS"
   - Status: `aprovado` (automático)
   - Resultado:
     - `qtdInscritos` = 87 + 24 = 111 (total de projetos)
     - `qtdAprovados` = 24 (apenas os aprovados)
     - `qtdTotalInscritos` = 87 (demanda original)

### Cálculo Automático do Edital:
```javascript
// No AdminPage.tsx, linha 772-806
merged.projetos.forEach((projeto) => {
  const editalData = projetosPorEdital.get(key);
  
  editalData.qtdInscritos++;  // Conta TODOS os projetos
  editalData.valorTotal += projeto.valor || 0;
  
  // Conta apenas os APROVADOS
  if (projeto.status === 'aprovado' || 
      projeto.status.includes('contemplado')) {
    editalData.qtdAprovados++;
  }
});
```

---

## ⚠️ IMPORTANTE: VALOR TOTAL R$ 0,00

### Problema Adicional Observado:
Na imagem, o card "Recursos Destinados" mostra **R$ 0,00**.

### Possíveis Causas:

1. **Planilha não tem coluna "Valor"**
   - Solução: Adicionar coluna "Valor" ou "ValorProjeto"

2. **Valores estão como texto (ex: "R$ 120.000")**
   - Solução: Converter para número (120000)

3. **Valores estão vazios**
   - Solução: Preencher os valores dos projetos

### Como Verificar:
1. Vá para **AdminPage → 💾 Status dos Dados**
2. Role até a tabela "Projetos Cadastrados"
3. Verifique a coluna "Valor"
4. Se estiver tudo R$ 0,00, reimporte a planilha com valores corretos

### Formato Correto da Coluna Valor:
```
❌ ERRADO:
- "R$ 120.000,00"
- "R$ 120000"
- "120.000,00"

✅ CORRETO:
- 120000
- 120000.00
```

---

## 🧪 COMO TESTAR A CORREÇÃO

### Teste 1: Verificar Card da HomePage
```
1. Abrir sistema → HomePage
2. Ver card "🏆 Projetos Contemplados"
3. Confirmar: deve mostrar 24 (não 87)
```

### Teste 2: Verificar Aba Status dos Dados
```
1. AdminPage → 💾 Status dos Dados
2. Ver card "Análise: Demanda vs Oferta"
3. Confirmar:
   - Total de Projetos: 111 (87 inscritos + 24 contemplados)
   - ✅ Aprovados (Oferta): 24
   - 📝 Inscritos (Demanda): 87
```

### Teste 3: Verificar Console do Navegador
```
1. Pressionar F12 → Console
2. Buscar log: "✅ Resumo de editais criado automaticamente"
3. Confirmar linha mostra:
   → Programa de Estímulo à Cultura (2024): 
      24 contemplados, 24 aprovados, R$ XXX.XXX,XX
```

---

## 📋 CHECKLIST DE IMPORTAÇÃO CORRETA

Para garantir que os dados sejam importados corretamente:

### ✅ Planilha de INSCRITOS (Demanda):
- [ ] Coluna "Nome do Proponente" preenchida
- [ ] Coluna "Nome do Projeto" preenchida
- [ ] Coluna "Edital" = nome do edital
- [ ] Coluna "Ano" = ano do edital (ex: 2024)
- [ ] Coluna "Status" = `inscrito` (ou vazio)
- [ ] Coluna "qtdTotalInscritos" = 87 (total de inscrições)

### ✅ Planilha de CONTEMPLADOS (Oferta):
- [ ] **CHECKBOX MARCADO** "Esta é uma planilha de CONTEMPLADOS"
- [ ] Coluna "Nome do Proponente" preenchida
- [ ] Coluna "Nome do Projeto" preenchida
- [ ] Coluna "Edital" = MESMO nome do edital dos inscritos
- [ ] Coluna "Ano" = MESMO ano (2024)
- [ ] Coluna "Valor" = valor numérico (ex: 120000)
- [ ] Coluna "Categoria" ou "Faixa" preenchida
- [ ] Status automático = `aprovado` (sistema marca automaticamente)

---

## 🎯 VALORES CORRETOS PARA PEC 2024

Baseado na informação fornecida:

```
Edital: Programa de Estímulo à Cultura 2024
Valor Total: R$ 980.000,00
Inscritos: 87 projetos
Contemplados: 24 projetos
Taxa de Aprovação: 28% (24/87)
```

### Distribuição por Faixa (exemplo):
```
Faixa 1 - R$ 120.000: ?  projetos × R$ 120.000 = R$ ?
Faixa 2 - R$  50.000: ?  projetos × R$  50.000 = R$ ?
Faixa 3 - R$  30.000: ?  projetos × R$  30.000 = R$ ?
─────────────────────────────────────────────────────
TOTAL:                   24 projetos = R$ 980.000
```

---

## 🔍 COMO IDENTIFICAR PROBLEMAS

### Sintoma: "87 Projetos Contemplados" (errado)
**Diagnóstico:** HomePage usando `qtdProjetos` ao invés de `qtdAprovados`  
**Status:** ✅ CORRIGIDO neste commit

### Sintoma: "R$ 0,00" em Recursos Destinados
**Diagnóstico:** Planilha sem coluna "Valor" ou valores zerados  
**Solução:** Verificar na aba "Status dos Dados" e reimportar com valores

### Sintoma: Todos marcados como "inscrito"
**Diagnóstico:** Esqueceu de marcar checkbox "Esta é planilha de CONTEMPLADOS"  
**Solução:** Reimportar a planilha de contemplados com checkbox marcado

### Sintoma: Duplicatas (24 + 24 = 48 contemplados)
**Diagnóstico:** Importou a mesma planilha duas vezes  
**Solução:** AdminPage → Botão "🗑️ Remover Duplicatas de Projetos"

---

## 📞 PRÓXIMOS PASSOS

1. **Recarregue a página** para aplicar a correção
2. **Verifique o card** "Projetos Contemplados" → deve mostrar **24**
3. **Se valor continuar R$ 0,00**:
   - Vá para "💾 Status dos Dados"
   - Verifique se a coluna "Valor" está preenchida
   - Se não, reimporte a planilha com valores corretos
4. **Exporte um backup** dos dados atuais

---

**Desenvolvido para:** Cadastro Cultural de Ilhabela  
**Correção aplicada em:** 2026-02-25  
**Arquivos modificados:** `/src/app/pages/HomePage.tsx`
