'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GitHubConfig {
  repositoryOwner: string;
  repositoryName: string;
  token: string;
  branch: string;
}

export default function GitHubConfigPage() {
  const [config, setConfig] = useState<GitHubConfig>({
    repositoryOwner: '',
    repositoryName: '',
    token: '',
    branch: 'main'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  
  useEffect(() => {
    // Carregar configuração salva do localStorage
    const savedConfig = localStorage.getItem('githubConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
      } catch (e) {
        console.error('Erro ao carregar configuração do GitHub:', e);
      }
    }
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const saveConfig = () => {
    try {
      localStorage.setItem('githubConfig', JSON.stringify(config));
      setResultMessage({
        type: 'success',
        message: 'Configuração salva localmente com sucesso'
      });
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setResultMessage(null);
      }, 3000);
    } catch (e) {
      console.error('Erro ao salvar configuração do GitHub:', e);
      setResultMessage({
        type: 'error',
        message: 'Erro ao salvar configuração localmente'
      });
    }
  };
  
  const testConnection = async () => {
    if (!config.repositoryOwner || !config.repositoryName || !config.token) {
      setResultMessage({
        type: 'error',
        message: 'Preencha todos os campos obrigatórios'
      });
      return;
    }
    
    setIsLoading(true);
    setResultMessage(null);
    
    try {
      const response = await fetch('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setResultMessage({
          type: 'success',
          message: result.message
        });
        
        // Salvar a URL de webhook
        if (result.data && result.data.webhookUrl) {
          setWebhookUrl(result.data.webhookUrl);
          
          // Salvar a URL também no localStorage
          localStorage.setItem('webhookUrl', result.data.webhookUrl);
          localStorage.setItem('webhookSecret', config.token);
        }
      } else {
        setResultMessage({
          type: 'error',
          message: result.message || result.error || 'Erro desconhecido ao testar conexão'
        });
      }
    } catch (error) {
      console.error('Erro ao testar conexão com GitHub:', error);
      setResultMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao conectar com o GitHub'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateReminders = async () => {
    if (!webhookUrl) {
      setResultMessage({
        type: 'error',
        message: 'Teste a conexão com o GitHub primeiro para obter a URL de webhook'
      });
      return;
    }
    
    setIsLoading(true);
    setResultMessage(null);
    
    try {
      // Fazer requisição para atualizar todos os lembretes com a URL do webhook
      const response = await fetch('/api/reminders/update-webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl,
          webhookSecret: config.token
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setResultMessage({
          type: 'success',
          message: `Lembretes atualizados com sucesso: ${result.updatedCount} lembrete(s)`
        });
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao atualizar lembretes');
      }
    } catch (error) {
      console.error('Erro ao atualizar lembretes com webhook:', error);
      setResultMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao atualizar lembretes'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/webhook" className="text-blue-600 hover:text-blue-800">
          &larr; Voltar para a página de webhooks
        </Link>
        <h2 className="text-2xl font-bold mt-2">Configuração do GitHub</h2>
        <p className="text-gray-600 mt-1">
          Configure a integração com o GitHub para enviar atualizações a cada frequência de medicamento
        </p>
      </div>
      
      {resultMessage && (
        <div className={`p-4 mb-6 rounded-md ${resultMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {resultMessage.message}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label htmlFor="repositoryOwner" className="block text-sm font-medium text-gray-700 mb-1">
            Proprietário do Repositório*
          </label>
          <input
            type="text"
            id="repositoryOwner"
            name="repositoryOwner"
            value={config.repositoryOwner}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="seu-username"
            required
          />
          <p className="mt-1 text-sm text-gray-500">Nome de usuário ou organização do GitHub</p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="repositoryName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Repositório*
          </label>
          <input
            type="text"
            id="repositoryName"
            name="repositoryName"
            value={config.repositoryName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="meu-repositorio"
            required
          />
          <p className="mt-1 text-sm text-gray-500">Nome do repositório do GitHub</p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
            Token de Acesso*
          </label>
          <input
            type="password"
            id="token"
            name="token"
            value={config.token}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="ghp_..."
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Token de acesso pessoal do GitHub com permissão para "contents" (criação/edição de arquivos)
          </p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
            Branch
          </label>
          <input
            type="text"
            id="branch"
            name="branch"
            value={config.branch}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="main"
          />
          <p className="mt-1 text-sm text-gray-500">Branch onde os arquivos serão criados (padrão: main)</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={saveConfig}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Salvar Configuração
          </button>
          <button 
            onClick={testConnection}
            disabled={isLoading || !config.repositoryOwner || !config.repositoryName || !config.token}
            className="px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? 'Testando...' : 'Testar Conexão'}
          </button>
          <button 
            onClick={updateReminders}
            disabled={isLoading || !webhookUrl}
            className="px-4 py-2 bg-purple-500 text-white font-medium rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            Atualizar Lembretes
          </button>
        </div>
      </div>
      
      {webhookUrl && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Configuração de Webhook</h3>
          <div className="bg-gray-100 p-3 rounded-md">
            <p className="font-mono break-all text-sm">{webhookUrl}</p>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Esta URL será usada para enviar atualizações para o GitHub. O token de acesso será usado como segredo.
          </p>
        </div>
      )}
    </div>
  );
} 