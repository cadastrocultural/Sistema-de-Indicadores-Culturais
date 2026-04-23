# 📍 GUIA DE RESPOSTAS - COORDENADAS E FUNCIONALIDADES

## ✅ COORDENADAS CORRIGIDAS

### 1. **Barra Velha**
- ❌ **Estava**: `-23.7950, -45.3570` (zona Centro)
- ✅ **Agora**: `-23.8023, -45.3598` (zona Centro-Sul)
- 📍 **Localização**: Entre Vila e Perequê (antes do Perequê, como solicitado)

### 2. **Bexiga**
- ❌ **Estava**: `-23.7985, -45.3615` (apontando no Perequê)
- ✅ **Agora**: `-23.8385, -45.3730` (zona Sul)
- 📍 **Localização**: Sul da ilha, próximo ao Saco da Capela

### 3. **Ilha de Vitória**
- ❌ **Estava**: `-23.7785, -45.3542` (mesma coordenada da comunidade Vitória)
- ✅ **Agora**: `-23.7798, -45.3498` (zona Centro)
- 📍 **Localização**: Pequena ilha no canal próxima à Vila (não é no continente)

---

## 🗺️ PROBLEMA DO MAPA INTERATIVO

### ⚠️ **PROBLEMA IDENTIFICADO:**
O componente `/src/app/components/IlhabelaMap.tsx` usa um **SVG estático** com pontos fixos. Por isso:

- ❌ Agentes culturais de Castelhanos não aparecem
- ❌ Comunidades tradicionais não aparecem  
- ❌ Dados reais do localStorage não são exibidos
- ❌ Apenas 7 pontos fixos são mostrados (hardcoded no código)

### ✅ **SOLUÇÃO:**
O Dashboard (`/src/app/pages/DashboardPage.tsx`) já possui um **mapa interativo REAL com Leaflet** que:

- ✅ Lê dados do localStorage
- ✅ Mostra TODOS os agentes culturais importados
- ✅ Mostra Castelhanos e todas as comunidades tradicionais
- ✅ Usa marcadores coloridos por tipo (agente, grupo, espaço, edital)
- ✅ Tem popup com informações detalhadas ao clicar

**🎯 RECOMENDAÇÃO:** Use o Dashboard para visualizar o mapa interativo real.

---

## 📊 ONDE APARECEM OS PROJETOS INSCRITOS?

### **1. Dashboard Page** (`/src/app/pages/DashboardPage.tsx`)

#### **Tab 0: "Mapeamento Cultural 2020"**
- Mostra **TODOS os inscritos**:
  - Agentes culturais (Mapeamento 2020)
  - Agentes importados (Excel)
  - Grupos importados (Excel)
  - Espaços culturais importados (Excel)

#### **Tab 1: "Editais (PNAB, Aldir Blanc, etc)"**
- Mostra **projetos de editais**:
  - PNAB
  - Aldir Blanc
  - Outros editais importados via Excel

### **2. Admin Page** (`/src/app/pages/AdminPage.tsx`)

#### **Tab 3: "📊 Editais (Resumo)"**
- Lista todos os editais importados
- Mostra contadores:
  - **📝 Inscritos**: Total de projetos no edital
  - **✅ Aprovados**: Projetos com status "aprovado", "classificado", "selecionado" ou "contemplado"
- Exibe cards com detalhes de cada edital

---

## 📄 COMO INSERIR PDF DE APROVADOS?

### ⚠️ **ATUALMENTE:**
O sistema **NÃO possui funcionalidade** para importar PDFs diretamente.

### ✅ **SOLUÇÕES DISPONÍVEIS:**

#### **Opção 1: Importar Excel (Recomendado)**
1. Converta o PDF para Excel
2. Use a Tab 3 "📊 Editais (Resumo)" no AdminPage
3. Preencha:
   - Nome do Edital
   - Ano do Edital
4. Faça upload do arquivo Excel
5. Clique em **"Confirmar Importação"**

**Formato da planilha de editais:**
```
| nomeDoProjeto | proponente | cpfCnpj | categoria | bairro | endereco | valor | status |
|---------------|------------|---------|-----------|--------|----------|-------|--------|
| Projeto X     | João Silva | 123...  | Música    | Vila   | Rua...   | 5000  | aprovado |
```

#### **Opção 2: Marcar Manualmente os Aprovados**
Após importar a planilha de inscritos, você pode:
1. Editar a planilha Excel
2. Adicionar uma coluna **"status"**
3. Preencher com:
   - `"aprovado"` para contemplados
   - `"não aprovado"` ou deixar vazio para não contemplados
4. Reimportar a planilha

O sistema conta automaticamente os aprovados buscando nas palavras-chave:
- "aprovado"
- "classificado"
- "selecionado"
- "contemplado"

#### **Opção 3: Funcionalidade Futura (Implementação Necessária)**
**Podemos adicionar:**
- Upload de PDF com lista de aprovados
- Extração automática de dados via OCR
- Comparação com planilha de inscritos via CPF/CNPJ
- Atualização automática do status para "aprovado"

---

## 🎯 RESUMO DAS COORDENADAS UTILIZADAS

### **Principais Bairros (Norte → Sul):**

| Bairro | Latitude | Longitude | Zona |
|--------|----------|-----------|------|
| Pacuíba | -23.7165 | -45.3245 | Norte |
| Ponta Azeda | -23.7098 | -45.3198 | Norte |
| Armação | -23.7512 | -45.3445 | Norte |
| Itaguaçu | -23.7425 | -45.3385 | Norte |
| Viana | -23.7650 | -45.3520 | Norte |
| **Vila/Centro** | **-23.7784** | **-45.3581** | **Centro** |
| **Ilha de Vitória** | **-23.7798** | **-45.3498** | **Centro** ✅ |
| **Barra Velha** | **-23.8023** | **-45.3598** | **Centro-Sul** ✅ |
| São Pedro | -23.7950 | -45.3590 | Sul |
| Portinho | -23.8095 | -45.3625 | Sul |
| **Perequê** | **-23.8223** | **-45.3648** | **Sul** |
| Itaquanduba | -23.8282 | -45.3689 | Sul |
| **Bexiga** | **-23.8385** | **-45.3730** | **Sul** ✅ |
| Saco da Capela | -23.8385 | -45.3742 | Sul |
| Feiticeira | -23.8465 | -45.3798 | Sul |
| Curral | -23.8520 | -45.3865 | Sul |

### **Lado Leste (Oceânico):**

| Comunidade | Latitude | Longitude | Zona |
|------------|----------|-----------|------|
| **Castelhanos** | **-23.8145** | **-45.2568** | **Leste** |
| Bonete | -23.8912 | -45.3198 | Sul-Leste |
| Enchovas | -23.8585 | -45.2898 | Sul-Leste |
| Indaiaúba | -23.8298 | -45.3285 | Sul-Leste |
| Guanxuma | -23.7385 | -45.2965 | Norte-Leste |
| Fome | -23.7312 | -45.2895 | Norte-Leste |
| Serraria | -23.7825 | -45.3145 | Centro-Leste |

---

## 🔍 VERIFICAÇÃO DE COORDENADAS

### Como conferir se as coordenadas estão corretas:

1. Abra o **Google Maps**
2. Cole as coordenadas no formato: `-23.8145, -45.2568`
3. Verifique se o marcador aparece no local correto

### Exemplos de verificação:

- **Castelhanos**: `-23.8145, -45.2568` → Lado Leste (oceânico) ✅
- **Barra Velha**: `-23.8023, -45.3598` → Entre Vila e Perequê ✅
- **Bexiga**: `-23.8385, -45.3730` → Sul da ilha ✅
- **Ilha de Vitória**: `-23.7798, -45.3498` → Ilha no canal próxima à Vila ✅

---

## 📌 PRÓXIMOS PASSOS SUGERIDOS

### **1. Implementar Upload de PDF de Aprovados**
- Adicionar Tab no AdminPage para upload de PDF
- Extrair CPF/CNPJ dos aprovados
- Comparar com planilha de inscritos
- Atualizar status automaticamente

### **2. Melhorar Validação de Coordenadas**
- Adicionar ferramenta de debug de coordenadas
- Mostrar lista de bairros sem coordenadas
- Permitir correção manual via interface

### **3. Adicionar Filtro de Aprovados no Dashboard**
- Checkbox "Mostrar apenas aprovados"
- Estatísticas separadas de inscritos vs aprovados
- Gráficos comparativos

---

## ❓ PRECISA DE AJUDA?

### **Para corrigir mais coordenadas:**
1. Identifique o bairro errado
2. Busque no Google Maps
3. Copie as coordenadas (clique direito → "O que há aqui?")
4. Edite o arquivo `/src/app/data/bairros-coords.ts`

### **Para implementar nova funcionalidade:**
1. Descreva o que precisa
2. Mostre exemplo de dados (planilha/PDF)
3. Indique onde deve aparecer no sistema
