# Jonas Pacheco - Estrutura do Projeto

Este repositório reúne a presença web e aplicações de apoio do ecossistema Jonas Pacheco. Hoje ele funciona mais como um pequeno monorepo, com uma landing page principal e outros sistemas separados por pasta.

## Objetivo

O projeto centraliza:

- a landing page pública de portfólio
- o formulário de contato e páginas institucionais
- um hub interno com backend, painel administrativo e portal
- o sistema `licita`, voltado para fluxo de licitações com IA

## Visão Geral da Estrutura

```text
jonaspacheco/
├── index.html                  # Landing page principal
├── styles.css                  # Estilos da landing page
├── script.js                   # Interações da landing page
├── contact.php                 # Endpoint PHP do formulário de contato
├── .htaccess                   # Regras Apache da raiz
├── sitemap.xml                 # Sitemap público
├── privacy-policy*.html        # Políticas de privacidade
├── terms-of-service*.html      # Termos de uso
├── logos.html                  # Página utilitária para logos
├── assets/                     # Assets usados na landing
├── deploy/                     # Snapshot pronto para publicação da landing
├── hub/
│   ├── backend/                # API Node.js/Express
│   ├── frontend/               # Painel admin React + Vite
│   └── portal/                 # Portal React + Vite
├── licita/                     # App Next.js + TypeScript
├── start-local.sh              # Sobe ambiente local completo
├── stop-local.sh               # Para os processos locais
└── README.md                   # Esta documentação
```

## Módulos

### 1. Landing Page

Arquivos principais:

- [index.html](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/index.html:1)
- [styles.css](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/styles.css:1)
- [script.js](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/script.js:1)

Responsável pela apresentação pública do portfólio, branding, projetos, stack técnica e canais de contato.

Recursos principais:

- hero com apresentação profissional
- seções de sobre, especialidades, projetos e tecnologias
- animações e navegação responsiva
- integração com formulário de contato
- páginas legais e sitemap

### 2. Contato e Páginas Institucionais

Arquivos principais:

- [contact.php](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/contact.php:1)
- [privacy-policy.html](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/privacy-policy.html:1)
- [privacy-policy-en.html](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/privacy-policy-en.html:1)
- [terms-of-service.html](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/terms-of-service.html:1)
- [terms-of-service-en.html](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/terms-of-service-en.html:1)

O formulário de contato:

- recebe `POST` via PHP
- valida campos
- aplica rate limit simples por IP
- envia email via SMTP usando PHPMailer
- pode abrir ticket automaticamente no `hub/backend`

Dependências operacionais dessa parte:

- `config.php` fora do Git com credenciais SMTP
- `vendor/autoload.php` do Composer para PHPMailer
- backend do hub acessível em `http://localhost:3200` se o auto-ticket estiver ativo

### 3. Hub

O `hub` é dividido em três aplicações.

#### `hub/backend`

Stack:

- Node.js
- Express
- PostgreSQL

Arquivos-chave:

- [hub/backend/src/index.js](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/hub/backend/src/index.js:1)
- [hub/backend/src/db/migrate.js](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/hub/backend/src/db/migrate.js:1)
- [hub/backend/.env.example](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/hub/backend/.env.example:1)

Função:

- autenticação
- dashboard
- projetos
- financeiro
- monitoramento
- tickets
- usuários
- portal
- task flow

Porta padrão:

- `3200`

#### `hub/frontend`

Stack:

- React
- Vite

Função:

- painel administrativo do hub

Porta local usada pelo script:

- `5175`

#### `hub/portal`

Stack:

- React
- Vite

Função:

- portal público ou portal do cliente para chamados e acompanhamento

Porta local usada pelo script:

- `5174`

### 4. Licita

Arquivos principais:

- [licita/package.json](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/licita/package.json:1)
- [licita/database/schema.sql](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/licita/database/schema.sql:1)
- [licita/.env.example](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/licita/.env.example:1)

Stack:

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- Anthropic SDK

Função:

- fluxo de licitações
- análise de documentos
- uso de IA
- dashboard e áreas autenticadas

Porta padrão:

- `3100`

## Execução Local

### Padrão recomendado

O repositório já possui um fluxo local padronizado:

- [start-local.sh](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/start-local.sh:1)
- [stop-local.sh](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/stop-local.sh:1)

O `start-local.sh` faz o seguinte:

- sobe um PostgreSQL Docker em `localhost:55432`
- cria `.env` do `hub/backend` e `licita` se não existirem
- executa migração do hub
- cria um usuário admin local
- inicia landing, API, frontend, portal e licita

Para subir tudo:

```bash
cd jonaspacheco
bash start-local.sh
```

URLs locais:

- Landing: `http://localhost:8080`
- Hub API: `http://localhost:3200`
- Hub Admin: `http://localhost:5175`
- Hub Portal: `http://localhost:5174`
- Licita: `http://localhost:3100`

Credenciais locais do hub:

- `admin@local.dev`
- `admin123`

Credenciais demo do licita:

- `licitacoes@local.dev`
- `123456`

Logs:

- `/tmp/jonaspacheco-local`

Para parar os processos locais:

```bash
cd jonaspacheco
bash stop-local.sh
```

### Subir módulos separadamente

Landing page:

```bash
cd jonaspacheco
python3 -m http.server 8080
```

Hub backend:

```bash
cd jonaspacheco/hub/backend
npm install
npm run dev
```

Hub frontend:

```bash
cd jonaspacheco/hub/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5175
```

Hub portal:

```bash
cd jonaspacheco/hub/portal
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Licita:

```bash
cd jonaspacheco/licita
npm install
npm run dev
```

## Variáveis de Ambiente

### Landing e raiz

Existe um arquivo [`.env.example`](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/.env.example:1), mas ele parece representar uma configuração mais ampla ou legado de uma estrutura anterior. Ele pode servir como referência, mas hoje os módulos com uso mais claro de ambiente são `hub/backend` e `licita`.

### Hub backend

Base:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PORT`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `NOTIFY_EMAIL`
- `PUBLIC_TICKET_KEY`

Arquivo base:

- [hub/backend/.env.example](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/hub/backend/.env.example:1)

### Licita

Base:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LOCAL_MODE`
- `ANTHROPIC_API_KEY`
- `NODE_ENV`
- `PORT`

Arquivo base:

- [licita/.env.example](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/licita/.env.example:1)

## Padrão de Deploy

Como o repositório mistura stacks diferentes, o deploy recomendado é por módulo.

### 1. Landing page

Padrão recomendado:

- hospedar como site estático
- usar Apache ou Nginx
- publicar a raiz do projeto ou a pasta `deploy/`

Quando usar `deploy/`:

- quando quiser subir apenas os arquivos finais da landing
- quando não precisar incluir `hub/` e `licita/` no servidor web público

Arquivos esperados:

- `index.html`
- `styles.css`
- `script.js`
- `assets/`
- `favicon.svg`
- imagens
- `.htaccess` se usar Apache

Observações:

- `contact.php` precisa de PHP habilitado
- envio de email precisa de `config.php` e dependências Composer no servidor

### 2. Hub backend

Padrão recomendado:

- deploy como serviço Node.js persistente
- executar atrás de Nginx/Apache reverse proxy
- usar PostgreSQL dedicado
- gerenciar processo com `pm2`, `systemd` ou Docker

Fluxo mínimo:

```bash
cd hub/backend
npm install --production
node src/db/migrate.js
npm start
```

Checklist:

- configurar `.env`
- garantir banco PostgreSQL acessível
- liberar porta interna da API
- apontar proxy para a porta `3200` ou a porta definida em `PORT`

### 3. Hub frontend e portal

Padrão recomendado:

- gerar build estática com Vite
- servir conteúdo via Nginx, Apache, Netlify ou Vercel

Build do admin:

```bash
cd hub/frontend
npm install
npm run build
```

Build do portal:

```bash
cd hub/portal
npm install
npm run build
```

Publicar:

- `hub/frontend/dist/`
- `hub/portal/dist/`

Importante:

- os frontends precisam apontar para a URL correta do backend
- se o domínio mudar, revise CORS e endpoints consumidos

### 4. Licita

Padrão recomendado:

- deploy como aplicação Next.js
- ideal para Vercel, VPS com Node.js ou container

Fluxo mínimo:

```bash
cd licita
npm install
npm run build
npm start
```

Checklist:

- configurar variáveis de Supabase
- configurar `ANTHROPIC_API_KEY` se IA estiver habilitada
- publicar na porta `3100` ou via proxy reverso

## Branding e Assets

O projeto inclui materiais de identidade visual:

- `logo-jonas-dvlpr.svg`
- `logo-jonas-dvlpr-transparent.svg`
- `logo-jonas-icon.svg`
- `logos.html`

Uso típico:

- site
- avatar
- Canva
- materiais institucionais

## Tecnologias Utilizadas

Por módulo:

- Landing: HTML5, CSS3, JavaScript, PHP
- Hub backend: Node.js, Express, PostgreSQL
- Hub frontend/portal: React, Vite
- Licita: Next.js, TypeScript, Tailwind, Supabase, Anthropic

## Observações Importantes

- Este repositório não é mais apenas uma landing page.
- O `README` anterior documentava bem a parte pública, mas não cobria `hub/` e `licita/`.
- O caminho mais seguro de manutenção é tratar cada pasta principal como um módulo com deploy próprio.

## Próximos Passos Recomendados

- criar um `README` próprio dentro de `hub/backend`
- criar um `README` próprio dentro de `hub/frontend`
- criar um `README` próprio dentro de `hub/portal`
- criar um `README` próprio dentro de `licita`
- documentar variáveis obrigatórias de produção por ambiente
- adicionar exemplo de reverse proxy para Nginx

## Documentação Adicional

- [docs/blog.md](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/docs/blog.md:1) — estrutura, rotas e fluxo do módulo Blog integrado ao Hub
- [docs/deploy-production.md](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/docs/deploy-production.md:1) — deploy em VPS com Nginx, PM2, PostgreSQL, HTTPS e subdomínios
- [docs/nginx-production.conf](/home/jonjon/Desktop/Projects/jonas-pacheco/jonaspacheco/docs/nginx-production.conf:1) — exemplo de configuração Nginx para produção
