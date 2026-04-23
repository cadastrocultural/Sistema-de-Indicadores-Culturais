# 🎯 GUIA RÁPIDO: Ajustar dados do PEC 2024

## Dados corretos do Programa de Estímulo à Cultura 2024

- **Total inscritos**: 87 projetos
- **Total contemplados**: 24 projetos
- **Valor total**: R$ 980.000,00
- **Distribuição**:
  - Faixa 1: 2 projetos × R$ 120.000 = R$ 240.000
  - Faixa 2: 4 projetos × R$ 50.000 = R$ 200.000
  - Faixa 3: 18 projetos × R$ 30.000 = R$ 540.000

---

## PASSO 1: Deletar o edital existente

1. Vá em **AdminPage → Tab 3 "📊 Editais (Resumo)"**
2. Localize o card **"Programa de Estímulo à Cultura (2024)"**
3. Clique no botão vermelho **"DELETAR"**
4. Confirme a exclusão

---

## PASSO 2: Preparar a planilha Excel

### Estrutura da planilha:

| editalNome | editalAno | nomeProponente | cpfCnpj | nomeProjeto | categoria | valor | status | bairro | qtdTotalInscritos |
|---|---|---|---|---|---|---|---|---|---|
| Programa de Estímulo à Cultura | 2024 | Associação Castelhanos Vive | 26.664.171/0001-09 | Projeto Cultural A | Faixa 1 - R$ 120.000 | 120000 | aprovado | Castelhanos | 87 |
| Programa de Estímulo à Cultura | 2024 | Centro Cultural B | 12.345.678/0001-90 | Projeto Cultural B | Faixa 1 - R$ 120.000 | 120000 | aprovado | Vila | 87 |
| Programa de Estímulo à Cultura | 2024 | Pessoa Física C | ***.***.***-12 | Projeto Cultural C | Faixa 2 - R$ 50.000 | 50000 | aprovado | Perequê | 87 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | 87 |

### ⚠️ IMPORTANTE:
- Coloque **87** na coluna `qtdTotalInscritos` em **TODAS as 24 linhas**
- A coluna `categoria` deve indicar a faixa (ex: "Faixa 1 - R$ 120.000")
- A coluna `valor` deve ser apenas o número (120000, 50000 ou 30000)
- A coluna `status` deve ser "aprovado" para todos os contemplados

---

## PASSO 3: Importar no sistema

1. Vá em **AdminPage → Tab 4 "📊 Projetos por Edital"**
2. Clique em **"+ Adicionar Novo Edital"**
3. Preencha:
   - **Nome do Edital**: `Programa de Estímulo à Cultura`
   - **Ano**: `2024`
4. Clique em **"BAIXAR TEMPLATE"** para ver o exemplo
5. Clique em **"UPLOAD PLANILHA DO EDITAL"**
6. Selecione sua planilha Excel preparada
7. Mapear as colunas (deve ser automático se seguiu os nomes acima):
   - `editalNome` → **editalNome**
   - `editalAno` → **editalAno** 
   - `nomeProponente` → **nomeProponente**
   - `cpfCnpj` → **cpfCnpj**
   - `nomeProjeto` → **nomeProjeto**
   - `categoria` → **categoria**
   - `valor` → **valor**
   - `status` → **status**
   - `bairro` → **bairro**
   - `qtdTotalInscritos` → **qtdTotalInscritos** ← NOVO!
8. Clique em **"PROCESSAR E VISUALIZAR"**

---

## PASSO 4: Confirmar a importação

Você verá algo como:

```
✅ 24 projetos prontos para importar
Edital: Programa de Estímulo à Cultura (2024) - Valor total: R$ 980.000,00

Preview dos primeiros projetos:
- Associação Castelhanos Vive: Projeto Cultural A (Faixa 1) - R$ 120.000,00
- Centro Cultural B: Projeto Cultural B (Faixa 1) - R$ 120.000,00  
- Pessoa Física C: Projeto Cultural C (Faixa 2) - R$ 50.000,00
...
```

Clique em **"💾 SALVAR DADOS NO SISTEMA"**

---

## RESULTADO ESPERADO

### No card do edital (Tab 3):

```
Programa de Estímulo à Cultura (2024)

📝 Demanda Total: 87
24 contemplados (27%)

✅ Aprovados: 24

💰 Valor Total: R$ 980.000,00

📍 GPS: [número de projetos com bairro informado]
```

### Análise disponível:

- **Taxa de sucesso**: 24/87 = 27,6%
- **Demanda não atendida**: 63 proponentes (72,4%)
- **Competitividade**: 3,6 inscrições por vaga
- **Valor médio por contemplado**: R$ 40.833,33

---

## ONDE USAR ESSES DADOS

### Dashboard Principal:
- Mostrará a **demanda total vs oferta** em gráficos
- Permitirá análise de **gaps de investimento**

### Página de Análise de Editais:
- Comparação entre editais por taxa de sucesso
- Identificação de categorias com maior demanda não atendida
- Visualização de bairros com maior competitividade

### Tomada de Decisão:
- **"Precisamos aumentar o orçamento?"** → Veja a demanda não atendida
- **"Qual categoria precisa de mais editais?"** → Compare demanda vs oferta por categoria
- **"O edital está acessível para todos os bairros?"** → Analise distribuição geográfica da demanda

---

## PRÓXIMOS PASSOS

1. ✅ Importe o PEC 2024 com os 24 contemplados + campo qtdTotalInscritos=87
2. 📋 Faça o mesmo para outros editais se quiser análise de demanda
3. 📊 Acesse o Dashboard para ver as análises automáticas
4. 🎯 Use os dados para planejar editais futuros baseado na demanda real

---

## DÚVIDAS?

- Se não colocar `qtdTotalInscritos`, o sistema funcionará normal mostrando apenas contemplados
- O campo é OPCIONAL - só use quando quiser análise de demanda vs oferta
- Você pode reimportar o edital a qualquer momento sem perder outros dados
