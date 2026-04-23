# 🔧 PATCH: Correção da Importação de Contemplados (Auto-Aprovado)

**Data:** 2026-02-25  
**Problema Crítico Resolvido:** Planilhas de contemplados sem coluna Status eram marcadas como "inscrito" ao invés de "aprovado"

---

## 🎯 PROBLEMA IDENTIFICADO

Quando importava a planilha dos **24 contemplados do Programa de Estímulo à Cultura 2024** na aba "🏆 Contemplados de Editais", o sistema estava:

❌ **ANTES:** Marcando TODOS como `status: "inscrito"` porque não havia coluna Status na planilha  
✅ **AGORA:** Marca automaticamente como `status: "aprovado"` ao importar pela aba Contemplados

### Consequência do Bug

- Contagem mostrava "86 Contemplados Carregados" (contando TODOS os projetos)
- Na verdade eram apenas **24 contemplados aprovados** do PEC 2024
- Dashboard exibia dados incorretos de demanda vs oferta

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. **Nova Flag de Contexto**
Adicionado estado `isContempladosImport` para diferenciar:
- **Aba Contemplados** → Importa como APROVADOS automaticamente
- **Outras abas** → Depende da coluna Status (padrão: inscrito)

### 2. **Modificação na Função `normalizeStatus`**
```typescript
const normalizeStatus = (status: any, forceApproved: boolean = false): string => {
  // 🎯 Se é importação de contemplados e não há status, marca como aprovado
  if (forceApproved && (!status || String(status).trim() === '')) {
    return 'aprovado';
  }
  
  if (!status) return 'inscrito'; // Padrão para outras importações
  
  // ... resto da lógica
}
```

### 3. **Modificação no `handleFileUpload`**
```typescript
const handleFileUpload = (
  event: React.ChangeEvent<HTMLInputElement>, 
  dataType: 'editais' | 'categorias' | 'evolucao' | 'agentes' | 'projetos' | 'grupos' | 'espacos',
  isContemplados: boolean = false // 🎯 Novo parâmetro
) => {
  // ...
  setIsContempladosImport(isContemplados);
  // ...
}
```

### 4. **Chamada na Aba Contemplados**
```typescript
// Linha 2247 - Aba "🏆 Contemplados de Editais"
onChange={(e) => handleFileUpload(e, 'projetos', true)} // ← true = auto-aprovado
```

### 5. **Chamada nas Outras Abas**
```typescript
// Linha 2631 - Outras abas de projetos (inscritos)
onChange={(e) => handleFileUpload(e, 'projetos')} // ← false (padrão) = depende da coluna Status
```

---

## 🧪 COMO TESTAR

### Teste 1: Importar Contemplados (deve marcar como aprovado)
1. Vá para **AdminPage** → Aba "🏆 Contemplados de Editais"
2. Preencha:
   - Nome do Edital: `Programa de Estímulo à Cultura`
   - Ano do Edital: `2024`
3. Importe planilha **SEM coluna Status** (apenas: Nome, CPF/CNPJ, Categoria, Valor, Bairro)
4. Verifique no console:
   ```
   🎯 Modo de importação: CONTEMPLADOS (auto-aprovado)
   🏆 Importação de CONTEMPLADOS: 24 de 24 marcados como APROVADO
   ```
5. Verifique no banner verde: **"✅ 24 Contemplados Carregados!"**
6. Verifique no preview: Cards devem mostrar "24 Contemplados" (não 0)

### Teste 2: Importar Inscritos (deve respeitar coluna Status)
1. Vá para **AdminPage** → Outra aba de projetos (se houver)
2. Importe planilha **COM coluna Status**
3. Verifique no console:
   ```
   🎯 Modo de importação: INSCRITOS (depende da coluna Status)
   ```
4. Projetos devem ter status conforme planilha (aprovado/suplente/inscrito/não aprovado)

---

## 📊 IMPACTO NO SISTEMA

### Arquivos Modificados
- ✅ `/src/app/pages/AdminPage.tsx` (6 modificações)

### Funções Alteradas
1. `normalizeStatus()` - Aceita parâmetro `forceApproved`
2. `handleFileUpload()` - Aceita parâmetro `isContemplados`
3. `processData()` - Passa flag para `normalizeStatus`

### Estados Adicionados
- `isContempladosImport: boolean` - Flag de contexto de importação

---

## 🔍 VALIDAÇÃO DA CORREÇÃO

### Antes
```typescript
// Linha 116 (antiga)
if (!status) return 'inscrito'; // ❌ SEMPRE inscrito sem coluna Status
```

### Depois
```typescript
// Linha 117 (nova)
if (forceApproved && (!status || String(status).trim() === '')) {
  return 'aprovado'; // ✅ Aprovado na aba Contemplados
}

if (!status) return 'inscrito'; // ✅ Inscrito nas outras abas
```

---

## 🚨 IMPORTANTE

### Diferença entre Abas
| Aba | Importa Como | Coluna Status Obrigatória? |
|-----|--------------|----------------------------|
| **🏆 Contemplados de Editais** | `aprovado` (automático) | ❌ NÃO (ignora se houver) |
| **Outras abas de projetos** | Depende da coluna | ✅ SIM (ou marca como `inscrito`) |

### Mensagem para o Usuário
A aba Contemplados já exibe:
> **NÃO precisa de coluna "Status" - todos são contemplados!**

---

## ✅ RESULTADO ESPERADO

Após importar os 24 contemplados do PEC 2024:

1. **Banner Verde:**
   ```
   ✅ 24 Contemplados Carregados!
   De 1 edital de premiação
   ```

2. **Console:**
   ```
   📊 Contagem de projetos: 24 total → 24 contemplados aprovados
   ```

3. **Preview:**
   - ✅ Cards: "24 Contemplados" (verde)
   - ⚠️ Cards: "0 Suplentes" (amarelo)
   - 👥 Cards: "24 Pessoas/Grupos Únicos" (azul)

4. **Dashboard:**
   - Mostra apenas os 24 contemplados aprovados
   - Não inclui inscritos não aprovados na contagem

---

## 🎉 PROBLEMA RESOLVIDO!

Agora o sistema diferencia corretamente:
- **Contemplados** (quem foi aprovado/premiado) → Oferta
- **Inscritos** (todos que tentaram) → Demanda

Isso permite a análise correta de **demanda vs oferta** para políticas públicas culturais! 🎭🎨🎪
