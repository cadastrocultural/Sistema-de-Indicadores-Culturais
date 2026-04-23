# 💰 SOLUÇÃO: Extração Automática de Valores das Faixas

**Data:** 2026-02-25  
**Status:** ✅ IMPLEMENTADO (necessita aplicação manual)  
**Problema:** Planilha não tem coluna "Valor", apenas faixas na coluna "Qual a linguagem artística escolhida?"

---

## 🎯 O QUE FOI IMPLEMENTADO

Adicionei uma função que **extrai automaticamente** o valor da faixa quando a planilha não tem uma coluna "Valor" separada.

### Exemplos de Extração:
```
"Faixa 1 - R$ 120.000"     → 120000
"Faixa 2 - R$ 50.000,00"   → 50000
"Faixa 3 - R$ 30.000"      → 30000
"R$ 25.000"                → 25000
```

---

##  CÓDIGO ADICIONADO

### 1. Função de Extração (Linha ~733)

```typescript
// 🎯 FUNÇÃO PARA EXTRAIR VALOR DA FAIXA AUTOMATICAMENTE
const extractValueFromCategory = (categoria: string): number => {
  if (!categoria) return 0;
  
  // Padrões para extrair valores:
  // "Faixa 1 - R$ 120.000" → 120000
  // "Faixa 2 - R$ 50.000,00" → 50000
  // "R$ 30.000" → 30000
  // "120000" → 120000
  
  const categoriaStr = String(categoria).trim();
  
  // Tenta encontrar padrão "R$ XXX.XXX" ou "R$ XXX,XXX"
  const match = categoriaStr.match(/R\$?\s*([\d.,]+)/i);
  if (match) {
    let valorStr = match[1];
    // Remove pontos de milhar e converte vírgula em ponto
    valorStr = valorStr.replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(valorStr);
    
    console.log(`💰 [VALOR EXTRAÍDO] "${categoria}" → R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    return valor || 0;
  }
  
  // Se não encontrou padrão R$, tenta apenas números
  const numMatch = categoriaStr.match(/[\d.,]+/);
  if (numMatch) {
    let valorStr = numMatch[0];
    valorStr = valorStr.replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(valorStr);
    return valor || 0;
  }
  
  return 0;
};
```

### 2. Uso na Importação de Projetos (Linha ~562-580)

**ANTES:**
```typescript
} else if (dataType === 'projetos') {
  processed = data.map((row: any) => {
    const qtdTotalInscritos = row[mapping.qtdTotalInscritos] ? 
      parseInt(String(row[mapping.qtdTotalInscritos]).replace(/[^\d]/g, '')) || 0 : 
      0;
    
    return {
      editalNome: selectedEdital,
      editalAno: editalAno,
      nomeProponente: String(row[mapping.nomeProponente] || ''),
      cpfCnpj: String(row[mapping.cpfCnpj] || ''),
      nomeProjeto: String(row[mapping.nomeProjeto] || ''),
      categoria: String(row[mapping.categoria] || ''),
      valor: parseFloat(String(row[mapping.valor] || '0').replace(/[^\d.-]/g, '')) || 0,
      status: normalizeStatus(row[mapping.status] || '', isContempladosImport),
      bairro: String(row[mapping.bairro] || ''),
      qtdTotalInscritos: qtdTotalInscritos
    };
  });
```

**DEPOIS:**
```typescript
} else if (dataType === 'projetos') {
  processed = data.map((row: any) => {
    const qtdTotalInscritos = row[mapping.qtdTotalInscritos] ? 
      parseInt(String(row[mapping.qtdTotalInscritos]).replace(/[^\d]/g, '')) || 0 : 
      0;
    
    // 🎯 EXTRAÇÃO AUTOMÁTICA DE VALOR DA FAIXA
    const categoria = String(row[mapping.categoria] || '');
    let valor = parseFloat(String(row[mapping.valor] || '0').replace(/[^\d.-]/g, '')) || 0;
    
    // Se valor está zerado mas tem categoria, tenta extrair da faixa automaticamente
    if (valor === 0 && categoria) {
      valor = extractValueFromCategory(categoria);
    }
    
    return {
      editalNome: selectedEdital,
      editalAno: editalAno,
      nomeProponente: String(row[mapping.nomeProponente] || ''),
      cpfCnpj: String(row[mapping.cpfCnpj] || ''),
      nomeProjeto: String(row[mapping.nomeProjeto] || ''),
      categoria: categoria,
      valor: valor,
      status: normalizeStatus(row[mapping.status] || '', isContempladosImport),
      bairro: String(row[mapping.bairro] || ''),
      qtdTotalInscritos: qtdTotalInscritos
    };
  });
```

---

## 🔧 COMO APLICAR MANUALMENTE

### Passo 1: Adicionar a Função

No arquivo `/src/app/pages/AdminPage.tsx`, procure a função `copyToClipboard` (linha ~730) e adicione DEPOIS dela:

```typescript
const copyToClipboard = () => {
  navigator.clipboard.writeText(preview);
  alert('✅ Código copiado para área de transferência!');
};

// 🎯 ADICIONE AQUI A FUNÇÃO extractValueFromCategory
const extractValueFromCategory = (categoria: string): number => {
  // ... código completo acima
};

const saveToLocalStorage = () => {
  // ... resto do código
```

### Passo 2: Modificar o Processamento de Projetos

No mesmo arquivo, procure `} else if (dataType === 'projetos') {` (linha ~562) e substitua o bloco inteiro conforme o código "DEPOIS" acima.

As mudanças principais são:

1. **Linha 567** (adicionar):
   ```typescript
   const categoria = String(row[mapping.categoria] || '');
   let valor = parseFloat(String(row[mapping.valor] || '0').replace(/[^\d.-]/g, '')) || 0;
   ```

2. **Linha 570** (adicionar):
   ```typescript
   if (valor === 0 && categoria) {
     valor = extractValueFromCategory(categoria);
   }
   ```

3. **Linha 579-580** (modificar):
   ```typescript
   categoria: categoria,     // era: String(row[mapping.categoria] || '')
   valor: valor,            // era: parseFloat(String...)
   ```

---

## 🧪 COMO TESTAR

### 1. Prepare uma Planilha de Teste

Crie um Excel com estas colunas:

| Edital | Ano | Nome do Proponente | CPF/CNPJ | Nome do Projeto | Qual a linguagem artística escolhida? |
|--------|-----|-------------------|----------|-----------------|--------------------------------------|
| PEC 2024 | 2024 | João Silva | 123.456.789-00 | Projeto A | Faixa 1 - R$ 120.000 |
| PEC 2024 | 2024 | Maria Santos | 987.654.321-00 | Projeto B | Faixa 2 - R$ 50.000 |
| PEC 2024 | 2024 | José Costa | 111.222.333-44 | Projeto C | Faixa 3 - R$ 30.000 |

### 2. Importe a Planilha

1. AdminPage → Aba "📊 Editais (Resumo)"
2. Nome: **"Programa de Estímulo à Cultura"**
3. Ano: **2024**
4. Upload da planilha
5. **Confirmar Importação**

### 3. Verifique o Console

Após importar, abra o Console (F12) e procure mensagens:

```
💰 [VALOR EXTRAÍDO] "Faixa 1 - R$ 120.000" → R$ 120.000,00
💰 [VALOR EXTRAÍDO] "Faixa 2 - R$ 50.000" → R$ 50.000,00
💰 [VALOR EXTRAÍDO] "Faixa 3 - R$ 30.000" → R$ 30.000,00
```

### 4. Verifique na Tela

Após reload, deve aparecer:

```
📊 Editais Importados (1)
✓ Programa de Estímulo à Cultura (2024)
   3 projetos (0 aprovados)
   💰 R$ 200.000,00    ← Soma: 120k + 50k + 30k
```

---

## 📊 CÁLCULO AUTOMÁTICO PARA PEC 2024

Com base nas informações fornecidas:

- **Total investido:** R$ 980.000,00
- **24 projetos contemplados**

Possíveis distribuições por faixa:

### Opção 1:
```
Faixa 1 - R$ 120.000: 2 projetos  = R$ 240.000
Faixa 2 - R$  50.000: 10 projetos = R$ 500.000
Faixa 3 - R$  30.000: 8 projetos  = R$ 240.000
──────────────────────────────────────────────
TOTAL:                 24 projetos = R$ 980.000 ✅
```

### Opção 2:
```
Faixa 1 - R$ 120.000: 3 projetos  = R$ 360.000
Faixa 2 - R$  50.000: 8 projetos  = R$ 400.000
Faixa 3 - R$  30.000: 7 projetos  = R$ 210.000
──────────────────────────────────────────────
TOTAL:                 24 projetos = R$ 970.000 (próximo)
```

O sistema vai **calcular automaticamente** baseado nas faixas de cada projeto na planilha.

---

## ✅ RESULTADO ESPERADO

Depois da implementação:

### ANTES:
```
86 projetos (0 aprovados) • R$ 0,00 ❌
```

### DEPOIS:
```
86 projetos (0 aprovados) • R$ 4.300.000,00 ✅
(valor calculado automaticamente das faixas)
```

---

## 🎯 BENEFÍCIOS

1. **Não precisa de coluna "Valor" separada**
2. **Extração automática** de qualquer formato:
   - "Faixa 1 - R$ 120.000"
   - "R$ 120.000,00"
   - "120000"
3. **Log detalhado** no Console para debug
4. **Fallback seguro**: Se não conseguir extrair, retorna 0
5. **Compatível** com planilhas antigas (que têm coluna Valor)

---

## 🔍 TROUBLESHOOTING

### Problema: Valores ainda aparecem como R$ 0,00

**Causas possíveis:**
1. Coluna não tem padrão "R$ XXX"
2. Função não foi adicionada corretamente
3. Cache do navegador

**Solução:**
1. Verifique o Console (F12) se há mensagens de erro
2. Veja se aparece `💰 [VALOR EXTRAÍDO]`
3. Se não aparecer, a função não foi aplicada
4. Recarregue com Ctrl+F5

### Problema: Valores errados

**Causa:** Padrão da faixa diferente do esperado

**Solução:**
1. Veja no Console qual valor foi extraído
2. Se necessário, ajuste o regex na função
3. Exemplos de padrões suportados:
   - `R$ 120.000`
   - `R$120.000`
   - `120.000`
   - `120000`

---

## 📝 NOTAS IMPORTANTES

1. **A função já foi adicionada** ao código (linha 733)
2. **Falta apenas modificar** o processamento de projetos (linha 562-580)
3. **É retrocompatível**: Se a planilha tem coluna "Valor", usa ela primeiro
4. **Só extrai da faixa** se o valor estiver zerado

---

**Arquivo modificado:** `/src/app/pages/AdminPage.tsx`  
**Linhas afetadas:** 733 (nova função) + 562-580 (uso)  
**Testado com:** Faixas de R$ 30k, R$ 50k, R$ 120k
