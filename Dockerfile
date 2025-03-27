FROM node:18-alpine AS base

# Definir diretório de trabalho
WORKDIR /app

# Camada de dependências
FROM base AS deps

# Copiar arquivos de configuração do projeto
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Camada de build
FROM deps AS builder

# Argumentos de build e variáveis de ambiente para build
ARG MONGODB_URI
ARG NODE_ENV
ARG NEXT_PUBLIC_BASE_URL

# Definir variáveis de ambiente para o processo de build
ENV NODE_ENV=$NODE_ENV
ENV MONGODB_URI=$MONGODB_URI
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

# Exibir variáveis para debug
RUN echo "Variáveis de ambiente para build:"
RUN echo "NODE_ENV=$NODE_ENV"
RUN echo "MONGODB_URI existe: $(if [ -n \"$MONGODB_URI\" ]; then echo 'sim'; else echo 'não'; fi)"
RUN echo "NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL"

# Copiar arquivos do projeto
COPY . .

# Garantir que o diretório public existe
RUN mkdir -p public
RUN npm run build

# Imagem final de produção
FROM base AS runner

# Argumentos de build e variáveis de ambiente para runtime
ARG MONGODB_URI
ARG NODE_ENV
ARG NEXT_PUBLIC_BASE_URL

# Definir variáveis de ambiente para o runtime
ENV NODE_ENV=production
ENV MONGODB_URI=$MONGODB_URI
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

# Exibir variáveis para debug
RUN echo "Variáveis de ambiente para runtime:"
RUN echo "NODE_ENV=production"
RUN echo "MONGODB_URI existe: $(if [ -n \"$MONGODB_URI\" ]; then echo 'sim'; else echo 'não'; fi)"
RUN echo "NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL"

# Definir usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copiar os arquivos necessários do estágio de build
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Expor porta 3000
EXPOSE 3000

# Definir o comando de inicialização
ENV PORT=3000

# Iniciar aplicação
CMD ["npm", "start"] 