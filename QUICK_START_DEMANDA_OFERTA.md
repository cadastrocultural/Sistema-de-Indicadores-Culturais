# 🚀 QUICK START: Usar o Sistema de Demanda vs Oferta

## 📋 Checklist Rápido

- [x] ✅ Sistema implementado e pronto
- [x] ✅ Compatível com editais antigos
- [ ] ⏳ Importar edital com dados de demanda
- [ ] ⏳ Visualizar análises automáticas
- [ ] ⏳ Usar insights para decisões

---

## 🎯 EXEMPLO PRÁTICO: Programa de Estímulo à Cultura 2024

### **Dados Reais**
- Total de inscritos: **87 projetos**
- Total contemplados: **24 projetos**
- Valor total: **R$ 980.000,00**
- Distribuição:
  - 2 projetos × R$ 120.000 (Faixa 1)
  - 4 projetos × R$ 50.000 (Faixa 2)
  - 18 projetos × R$ 30.000 (Faixa 3)

---

## ⚡ PASSO A PASSO RÁPIDO

### **1️⃣ Criar Planilha Excel (5 minutos)**

Abra o Excel e crie estas colunas:

```
editalNome | editalAno | nomeProponente | cpfCnpj | nomeProjeto | categoria | valor | status | bairro | qtdTotalInscritos
```

Preencha com os 24 contemplados:

```excel
Programa de Estímulo à Cultura | 2024 | Associação A | 11.111.111/0001-11 | Projeto A | Faixa 1 | 120000 | aprovado | Castelhanos | 87
Programa de Estímulo à Cultura | 2024 | Centro B     | 22.222.222/0001-22 | Projeto B | Faixa 1 | 120000 | aprovado | Vila        | 87
Programa de Estímulo à Cultura | 2024 | Pessoa C     | ***.***.***-33     | Projeto C | Faixa 2 | 50000  | aprovado | Perequê     | 87
... (mais 21 linhas)
```

⚠️ **CRÍTICO**: Coloque **87** em `qtdTotalInscritos` em **TODAS as 24 linhas**.

### **2️⃣ Importar no Sistema (2 minutos)**

1. Abra o sistema: **AdminPage**
2. Clique na **Tab 4: "📊 Projetos por Edital"**
3. Clique em **"+ Adicionar Novo Edital"**
4. Preencha:
   - Nome: `Programa de Estímulo à Cultura`
   - Ano: `2024`
5. Clique em **"UPLOAD PLANILHA DO EDITAL"**
6. Selecione sua planilha
7. Clique em **"PROCESSAR E VISUALIZAR"**
8. Verifique o preview (deve mostrar 24 projetos)
9. Clique em **"💾 SALVAR DADOS NO SISTEMA"**
10. Aguarde reload automático

### **3️⃣ Visualizar Análises (1 minuto)**

1. Vá para **Tab 3: "📊 Editais (Resumo)"**
2. Localize o card **"Programa de Estímulo à Cultura (2024)"**
3. Veja o painel de análise:

```
🎯 Análise de Demanda vs Oferta

✅ Taxa de Sucesso: 28%
   24 de 87 inscritos

⚠️ Demanda Não Atendida: 63
   72% dos inscritos

🔥 Competitividade: 3.6x
   inscrições por vaga

💵 Valor Médio: R$ 40.833
   por contemplado

💡 Insights:
• Alta demanda não atendida (72%): Considere aumentar
  o orçamento ou criar editais adicionais
• Competitividade elevada (3.6x): Há espaço para 
  expandir o número de vagas
• Taxa de sucesso baixa (28%): Pode ser necessário
  facilitar critérios ou aumentar investimento
```

---

## 📊 O QUE VOCÊ VERÁ

### **Console do Navegador (F12)**

Ao salvar os dados, você verá:

```
✅ Resumo de editais criado automaticamente: 1 editais
  → Programa de Estímulo à Cultura (2024): 24 contemplados, 24 aprovados, 
     R$ 980.000,00 | demanda total: 87 inscrições (28% aprovação)
```

### **Card do Edital**

```
┌─────────────────────────────────────────────┐
│ Programa de Estímulo à Cultura        [2024]│
│                                             │
│ 📝 Demanda Total: 87                        │
│    24 contemplados (28%)                    │
│                                             │
│ ✅ Aprovados: 24                            │
│ 💰 Valor Total: R$ 980.000,00               │
│ 📍 GPS: 24                                  │
│                                             │
│ [Painel de Análise de Demanda vs Oferta]    │
└─────────────────────────────────────────────┘
```

---

## ⚙️ DICAS E TRUQUES

### **Dica 1: Use o Template**
Ao invés de criar a planilha do zero:
1. Clique em **"BAIXAR TEMPLATE"** na AdminPage
2. Abra o arquivo Excel gerado
3. Veja os 3 exemplos prontos com `qtdTotalInscritos = 87`
4. Copie e cole suas linhas seguindo o mesmo padrão

### **Dica 2: Nomes de Colunas Flexíveis**
Não precisa usar exatamente `qtdTotalInscritos`. O sistema aceita:
- `total_inscritos`
- `totalInscritos`
- `demanda_total`
- `demandaTotal`
- `inscritos_total`
- `qtd_total_inscritos`

### **Dica 3: Editais Antigos**
Não precisa reimportar editais antigos. O sistema funciona com:
- **Editais novos**: Mostra análise de demanda vs oferta
- **Editais antigos**: Mostra apenas contemplados (comportamento normal)

### **Dica 4: Deletar e Reimportar**
Se errar:
1. Vá para **Tab 3: "📊 Editais (Resumo)"**
2. Localize o card do edital
3. Clique no botão **vermelho "DELETAR"**
4. Confirme
5. Importe novamente com os dados corretos

### **Dica 5: Verificar Console**
Sempre abra o console (F12) ao importar para ver:
- Quantos projetos foram processados
- Quantos editais foram criados
- Se há erros de mapeamento

---

## ❓ PERGUNTAS FREQUENTES

### **P: Preciso reimportar editais antigos?**
R: Não! Editais antigos continuam funcionando normalmente. Só importa editais novos se quiser análise de demanda vs oferta.

### **P: O que acontece se não preencher qtdTotalInscritos?**
R: O sistema funciona normalmente, mas não mostra o painel de análise de demanda vs oferta.

### **P: Por que preciso repetir o valor 87 em todas as linhas?**
R: Cada linha representa um contemplado. O campo `qtdTotalInscritos` indica quantos concorreram para aquele edital. Como todos concorreram no mesmo edital, o valor é igual (87).

### **P: Posso ter editais com e sem qtdTotalInscritos?**
R: Sim! O sistema é inteligente e mostra:
- Análise completa para editais COM `qtdTotalInscritos`
- Visualização simples para editais SEM `qtdTotalInscritos`

### **P: Como ver análises de todos os editais juntos?**
R: Atualmente cada edital mostra sua própria análise. Em versões futuras haverá um dashboard consolidado.

---

## 🎨 EXEMPLO VISUAL COMPLETO

### **Antes da Importação**

```
AdminPage → Tab 3: Editais (Resumo)

[Lista vazia ou com editais antigos]
```

### **Após Importação com qtdTotalInscritos**

```
AdminPage → Tab 3: Editais (Resumo)

┌──────────────────────────────────────────────────┐
│ Programa de Estímulo à Cultura           [2024] │
│                                                  │
│ ┌───────────┬──────────┬───────────┬──────────┐ │
│ │📝 Demanda │✅ Aprova │💰 Valor   │📍 GPS    │ │
│ │  Total    │  dos     │  Total    │          │ │
│ │    87     │    24    │R$ 980.000 │    24    │ │
│ │24 contem- │          │           │          │ │
│ │plados 28% │          │           │          │ │
│ └───────────┴──────────┴───────────┴──────────┘ │
│                                                  │
│ 🎯 Análise de Demanda vs Oferta                 │
│ ┌──────────────────────────────────────────────┐│
│ │✅ 28% Taxa │⚠️ 63 Não  │🔥 3.6x   │💵 R$     ││
│ │de Sucesso  │Atendida   │Competit. │40.833    ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ 💡 Insights:                                     │
│ • Alta demanda não atendida (72%)               │
│ • Competitividade elevada (3.6x)                │
│ • Taxa de sucesso baixa (28%)                   │
│                                                  │
│ 📎 Documentos do Edital                         │
│ [Upload planilha inscritos] [Upload PDF]        │
│                                                  │
│                                    [❌ DELETAR]  │
└──────────────────────────────────────────────────┘
```

---

## 🎯 PRÓXIMOS PASSOS

### **Imediatos (hoje)**
1. ✅ Ler este guia
2. ⏳ Criar planilha do PEC 2024 com 24 contemplados
3. ⏳ Importar no sistema
4. ⏳ Visualizar as análises

### **Esta Semana**
1. ⏳ Importar outros editais com dados de demanda (se disponível)
2. ⏳ Compartilhar insights com equipe
3. ⏳ Usar dados para planejar editais de 2026

### **Este Mês**
1. ⏳ Criar relatório de demanda não atendida
2. ⏳ Identificar categorias subatendidas
3. ⏳ Propor novos editais baseados em dados

---

## 📞 SUPORTE

### **Problemas Comuns**

**Erro: "Coluna qtdTotalInscritos não encontrada"**
- Verifique se a coluna existe na planilha
- Verifique se o nome está correto (sem espaços extras)
- Tente usar `total_inscritos` ou outra variação

**Erro: "Dados não foram salvos"**
- Verifique o console (F12) para ver erro específico
- Recarregue a página e tente novamente
- Deletar edital e reimportar

**Card não mostra análise de demanda**
- Verifique se `qtdTotalInscritos` foi importado (abra console)
- Verifique se o valor é maior que 0
- Recarregue a página

---

## ✅ CHECKLIST FINAL

Antes de considerar completo, verifique:

- [ ] Planilha Excel criada com coluna `qtdTotalInscritos`
- [ ] Valor `87` preenchido em todas as 24 linhas
- [ ] Edital importado com sucesso (viu mensagem de confirmação)
- [ ] Card do edital mostra "📝 Demanda Total: 87"
- [ ] Painel de análise aparece com 4 métricas
- [ ] Insights automáticos são exibidos
- [ ] Console mostra "demanda total: 87 inscrições (28% aprovação)"

---

## 🎉 PRONTO!

Você agora tem um sistema completo de análise de demanda vs oferta para editais culturais.

**Use os dados para tomar decisões baseadas em evidências sobre políticas públicas de cultura!** 🚀

---

**Tempo estimado total**: 10 minutos  
**Dificuldade**: Fácil  
**Pré-requisitos**: Planilha Excel e navegador web
