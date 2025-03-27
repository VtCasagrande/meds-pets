# Sistema de Lembretes de Medicamentos para Pets

Um sistema web para gerenciar lembretes de medicamentos para tutores de pets, com notificações automáticas via webhook.

## Funcionalidades

- Cadastro de lembretes para medicamentos de pets
- Controle de múltiplos medicamentos por lembrete
- Agendamento de notificações baseado em datas e frequências
- Disparo de webhooks para integrações com outros sistemas
- Visualização de lembretes ativos e finalizados
- Interface responsiva e amigável

## Tecnologias Utilizadas

- Next.js 14 (App Router)
- React 18
- TypeScript
- MongoDB/Mongoose
- Tailwind CSS
- React Hook Form
- Date-fns para manipulação de datas

## Instalação e Uso

### Método Tradicional

1. Clone o repositório
```bash
git clone https://github.com/VtCasagrande/meds-pets.git
cd meds-pets
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
Crie um arquivo `.env.local` com as seguintes variáveis:
```
MONGODB_URI=sua_uri_do_mongodb
```

4. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

5. Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

### Utilizando Docker

1. Clone o repositório
```bash
git clone https://github.com/VtCasagrande/meds-pets.git
cd meds-pets
```

2. Inicialize com Docker Compose
```bash
docker-compose up -d
```

3. Acesse a aplicação em [http://localhost:3000](http://localhost:3000)

### Implantação em VPS ou Produção com Docker

1. Clone o repositório em sua VPS
```bash
git clone https://github.com/VtCasagrande/meds-pets.git
cd meds-pets
```

2. Ajuste as variáveis de ambiente no arquivo `docker-compose.yml` conforme necessário
```yaml
environment:
  - MONGODB_URI=sua_uri_mongodb
  - NODE_ENV=production
  - NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
```

3. Inicialize com Docker Compose
```bash
docker-compose up -d
```

4. Configure um proxy reverso (Nginx ou similar) para direcionar o tráfego para a porta 3000

## Estrutura do Projeto

```
lembrete-meds/
├── app/
│   ├── api/                  # Rotas da API (serverless functions)
│   ├── components/           # Componentes React reutilizáveis
│   ├── lib/                  # Utilitários, tipos e modelos
│   ├── routes/               # Páginas da aplicação
│   ├── globals.css           # Estilos globais
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Página inicial
├── public/                   # Arquivos estáticos
├── .env.local                # Variáveis de ambiente (não versionado)
├── Dockerfile                # Configuração para build Docker
├── docker-compose.yml        # Configuração para orquestração de containers
├── next.config.js            # Configuração do Next.js
├── package.json              # Dependências do projeto
└── tsconfig.json             # Configuração do TypeScript
```

## API Webhooks

O sistema possui um endpoint para webhooks que pode ser integrado com serviços externos de notificação. Os webhooks são disparados automaticamente na data e horário definidos para cada medicamento.

Exemplo de payload:
```json
{
  "reminderId": "123456789",
  "tutorName": "João Silva",
  "petName": "Rex",
  "phoneNumber": "(11) 98765-4321",
  "medicationProduct": {
    "title": "Antibiótico Amoxicilina",
    "quantity": "1 comprimido"
  }
}
```

## Licença

MIT 