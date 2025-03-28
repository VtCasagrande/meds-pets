import { NextRequest, NextResponse } from 'next/server';

// Interface para o payload de teste
interface TestWebhookPayload {
  webhookUrl: string;
  webhookSecret?: string;
}

// Função para enviar webhook de teste
async function sendTestWebhook(webhookUrl: string, webhookSecret?: string) {
  try {
    console.log(`Enviando webhook de teste para ${webhookUrl}`);
    
    // Configurar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
      console.log('Webhook Secret configurado no header');
    }
    
    // Payload de teste
    const testPayload = {
      eventType: 'webhook_test',
      timestamp: new Date().toISOString(),
      message: 'Este é um webhook de teste do sistema Lembrete Meds',
      status: 'success'
    };
    
    // Enviar webhook
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload)
    });
    
    const elapsedTime = Date.now() - startTime;
    const status = response.status;
    
    // Tentar obter corpo da resposta
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      responseText = 'Não foi possível obter a resposta';
    }
    
    return {
      success: status >= 200 && status < 300,
      status,
      elapsedTime,
      response: responseText
    };
  } catch (error) {
    console.error('Erro ao enviar webhook de teste:', error);
    return {
      success: false,
      status: 0,
      elapsedTime: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Endpoint POST para testar webhook
export async function POST(request: NextRequest) {
  try {
    // Obter body da requisição
    const body: TestWebhookPayload = await request.json();
    
    // Verificar se a URL foi fornecida
    if (!body.webhookUrl) {
      return NextResponse.json(
        { error: 'URL de webhook é obrigatória' },
        { status: 400 }
      );
    }
    
    console.log(`Requisição para testar webhook - URL: ${body.webhookUrl}`);
    
    // Enviar webhook de teste
    const result = await sendTestWebhook(body.webhookUrl, body.webhookSecret);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook de teste enviado com sucesso',
        details: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Falha ao enviar webhook de teste',
        details: result
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao processar requisição de teste de webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 