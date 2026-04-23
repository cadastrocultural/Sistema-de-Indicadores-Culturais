import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-2320c79f/health", (c) => {
  return c.json({ status: "ok" });
});

// 💾 SALVAR DADOS CULTURAIS
app.post("/make-server-2320c79f/save-data", async (c) => {
  try {
    const body = await c.req.json();
    console.log('💾 [SERVER] Recebendo dados para salvar:', {
      mapeamento: body.mapeamento?.length || 0,
      agentes: body.agentes?.length || 0,
      grupos: body.grupos?.length || 0,
      espacos: body.espacos?.length || 0,
      editais: body.editais?.length || 0,
      projetos: body.projetos?.length || 0,
      categorias: body.categorias?.length || 0,
      evolucao: body.evolucao?.length || 0
    });

    // Salva no KV store do Supabase
    await kv.set('cadastro_cultural_data', body);
    
    console.log('✅ [SERVER] Dados salvos com sucesso no Supabase KV');
    
    return c.json({ 
      success: true, 
      message: 'Dados salvos com sucesso no servidor!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ [SERVER] Erro ao salvar dados:', err);
    return c.json({ 
      success: false, 
      error: `Erro ao salvar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}` 
    }, 500);
  }
});

// 📥 CARREGAR DADOS CULTURAIS
app.get("/make-server-2320c79f/load-data", async (c) => {
  try {
    console.log('📥 [SERVER] Carregando dados do Supabase KV...');
    
    const data = await kv.get('cadastro_cultural_data');
    
    if (!data) {
      console.log('⚠️ [SERVER] Nenhum dado encontrado no servidor');
      return c.json({ 
        success: true, 
        data: null,
        message: 'Nenhum dado salvo no servidor ainda'
      });
    }
    
    console.log('✅ [SERVER] Dados carregados do Supabase KV:', {
      mapeamento: data.mapeamento?.length || 0,
      agentes: data.agentes?.length || 0,
      grupos: data.grupos?.length || 0,
      espacos: data.espacos?.length || 0,
      editais: data.editais?.length || 0,
      projetos: data.projetos?.length || 0,
      categorias: data.categorias?.length || 0,
      evolucao: data.evolucao?.length || 0
    });
    
    return c.json({ 
      success: true, 
      data,
      message: 'Dados carregados com sucesso!'
    });
  } catch (err) {
    console.error('❌ [SERVER] Erro ao carregar dados:', err);
    return c.json({ 
      success: false, 
      error: `Erro ao carregar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}` 
    }, 500);
  }
});

Deno.serve(app.fetch);