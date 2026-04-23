// 🎯 FUNÇÃO AUXILIAR PARA PROCESSAR PROJETOS COM FAIXAS
// Adicione esta função ANTES da função processData() no AdminPage.tsx

const processProjetosComFaixas = (data: any[], mapping: ColumnMapping, selectedEdital: string, editalAno: number, normalizeStatus: (s: string) => string) => {
  const processed = data.map((row: any) => {
    // 🎯 DETECÇÃO INTELIGENTE DE FAIXA E VALOR
    let valor = parseFloat(String(row[mapping.valor] || '0').replace(/[^\d.-]/g, '')) || 0;
    let faixa = row[mapping.faixa] ? String(row[mapping.faixa]).trim() : '';
    let linguagem = row[mapping.linguagem] ? String(row[mapping.linguagem]).trim() : '';
    
    // 🎯 SE VALOR ESTÁ VAZIO MAS TEM FAIXA, PREENCHE AUTOMATICAMENTE
    if (valor === 0 && faixa) {
      const faixaLower = faixa.toLowerCase();
      if (faixaLower.includes('faixa 1') || faixaLower.includes('faixa1')) {
        valor = 120000; // R$ 120.000,00
        console.log(`💰 Faixa 1 detectada → Valor: R$ 120.000,00`);
      } else if (faixaLower.includes('faixa 2') || faixaLower.includes('faixa2')) {
        valor = 50000; // R$ 50.000,00
        console.log(`💰 Faixa 2 detectada → Valor: R$ 50.000,00`);
      } else if (faixaLower.includes('faixa 3') || faixaLower.includes('faixa3')) {
        valor = 30000; // R$ 30.000,00
        console.log(`💰 Faixa 3 detectada → Valor: R$ 30.000,00`);
      }
    }
    
    // 🎯 DETECÇÃO INTELIGENTE DE STATUS DE APROVAÇÃO
    let status = normalizeStatus(row[mapping.status] || '');
    let ehAprovado = false;
    
    // Método 1: Verifica se status contém palavras de aprovação
    const statusLower = status.toLowerCase();
    if (statusLower.includes('aprovado') || 
        statusLower.includes('classificado') || 
        statusLower.includes('selecionado') ||
        statusLower.includes('contemplado')) {
      ehAprovado = true;
    }
    
    // Método 2: Se tem "faixa" preenchida, considera aprovado
    if (faixa && faixa !== '' && faixa !== '-' && faixa !== 'null') {
      ehAprovado = true;
      if (!status) status = 'aprovado';
    }
    
    // Método 3: Se tem "linguagem" preenchida, considera aprovado
    if (linguagem && linguagem !== '' && linguagem !== '-') {
      ehAprovado = true;
      if (!status) status = 'aprovado';
    }
    
    return {
      editalNome: selectedEdital,
      editalAno: editalAno,
      nomeProponente: row[mapping.nomeProponente] || '',
      cpfCnpj: row[mapping.cpfCnpj] || '',
      nomeProjeto: row[mapping.nomeProjeto] || '',
      categoria: row[mapping.categoria] || '',
      linguagem: linguagem,
      faixa: faixa,
      valor: valor,
      status: status || (ehAprovado ? 'aprovado' : ''),
      bairro: row[mapping.bairro] || ''
    };
  });

  // 🎯 VALIDAÇÃO: Calcula totais por faixa
  const faixa1 = processed.filter((p: any) => p.faixa && p.faixa.toLowerCase().includes('faixa 1'));
  const faixa2 = processed.filter((p: any) => p.faixa && p.faixa.toLowerCase().includes('faixa 2'));
  const faixa3 = processed.filter((p: any) => p.faixa && p.faixa.toLowerCase().includes('faixa 3'));
  const totalValor = processed.reduce((sum: number, p: any) => sum + p.valor, 0);
  const totalAprovados = processed.filter((p: any) => {
    const st = (p.status || '').toLowerCase();
    return st.includes('aprovado') || st.includes('classificado') || st.includes('selecionado') || st.includes('contemplado');
  }).length;
  
  console.log('📊 RESUMO DO EDITAL:');
  console.log(`   Faixa 1: ${faixa1.length} projetos × R$ 120.000 = R$ ${(faixa1.length * 120000).toLocaleString('pt-BR')}`);
  console.log(`   Faixa 2: ${faixa2.length} projetos × R$ 50.000 = R$ ${(faixa2.length * 50000).toLocaleString('pt-BR')}`);
  console.log(`   Faixa 3: ${faixa3.length} projetos × R$ 30.000 = R$ ${(faixa3.length * 30000).toLocaleString('pt-BR')}`);
  console.log(`   TOTAL: ${processed.length} projetos (${totalAprovados} aprovados) = R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  const code = `export const PROJETOS_EDITAIS: ProjetoEdital[] = [\n${processed.slice(0, 3).map((item: any) => 
    `  { editalNome: '${item.editalNome}', editalAno: ${item.editalAno}, nomeProponente: '${item.nomeProponente}', cpfCnpj: '${item.cpfCnpj}', nomeProjeto: '${item.nomeProjeto}', categoria: '${item.categoria}', linguagem: '${item.linguagem}', faixa: '${item.faixa}', valor: ${item.valor}, status: '${item.status}', bairro: '${item.bairro}' }`
  ).join(',\n')}\n  // ... mais ${processed.length - 3} projetos\n];`;

  return { processed, code };
};
