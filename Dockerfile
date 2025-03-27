FROM node:18-alpine AS base

# Diretório de trabalho
WORKDIR /app

# Instalar dependências necessárias
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Adicionar os argumentos de build para poder usá-los
FROM base AS builder
ARG MONGODB_URI
ARG NODE_ENV
ARG NEXT_PUBLIC_BASE_URL

# Configurar as variáveis de ambiente para o build
ENV MONGODB_URI=$MONGODB_URI
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Garantir que o diretório public existe
RUN mkdir -p public
RUN npm run build

# Imagem final de produção
FROM base AS runner
# Adicionar os argumentos para o estágio runner também
ARG MONGODB_URI
ARG NODE_ENV
ARG NEXT_PUBLIC_BASE_URL

# Configurar as variáveis de ambiente para runtime
ENV NODE_ENV=production
ENV MONGODB_URI=$MONGODB_URI
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

# Adicionar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Criar estrutura de diretórios necessária
WORKDIR /app
RUN mkdir -p public .next/static
RUN chown -R nextjs:nodejs /app

# Mudar para usuário não-root
USER nextjs

# Copiar arquivos necessários
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Expor a porta
EXPOSE 3000

# Definir variáveis de ambiente para a aplicação
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar a aplicação
CMD ["node", "server.js"] 