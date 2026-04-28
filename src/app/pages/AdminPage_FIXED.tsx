  // 🔒 FUNÇÃO CORRIGIDA: Salva no servidor Supabase
  const saveToLocalStorage = async () => {
    if (Object.keys(parsedData).length === 0) {
      alert('❌ Nenhum dado para salvar!');
      return;
    }
    
    try {
      console.log('💾 [SAVE] Preparando dados para salvar:', {
        agentes: parsedData.agentes?.length || 0,
        grupos: parsedData.grupos?.length || 0,
        espacos: parsedData.espacos?.length || 0,
        editais: parsedData.editais?.length || 0,
        projetos: parsedData.projetos?.length || 0,
        categorias: parsedData.categorias?.length || 0,
        evolucao: parsedData.evolucao?.length || 0
      });
      
      const dataToSave = JSON.stringify(parsedData);
      console.log('💾 [SAVE] JSON gerado - tamanho:', dataToSave.length, 'bytes');
      
      // 🌐 SALVA NO SERVIDOR
      console.log('🌐 [CLIENT] Enviando dados para o servidor...');
      
      const { projectId, publicAnonKey } = await import('../../lib/supabaseProjectInfo');
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f/save-data`;
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: dataToSave
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar no servidor');
      }
      
      console.log('✅ [CLIENT] Dados salvos no servidor com sucesso!');
      
      // 💾 BACKUP NO LOCALSTORAGE
      localStorage.setItem('editais_imported_data', dataToSave);
      console.log('💾 [SAVE] Backup local salvo');
      
      alert('✅ Dados salvos com sucesso no servidor! Recarregando a página...');
      
      // Aguarda para garantir que foi persistido
      setTimeout(() => {
        console.log('🔄 Recarregando página...');
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('❌ Erro ao salvar:', err);
      alert(`❌ Erro ao salvar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };
