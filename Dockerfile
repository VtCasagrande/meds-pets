FROM node:18-alpine AS base

# Diretório de trabalho
WORKDIR /app

# Instalar dependências necessárias
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Construir a aplicação
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Garantir que o diretório public existe
RUN mkdir -p public
RUN npm run build

# Imagem final de produção
FROM base AS runner
ENV NODE_ENV=production

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

# Definir variáveis de ambiente
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar a aplicação
CMD ["node", "server.js"] 