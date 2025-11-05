# Portfolio Jonas Pacheco - Landing Page Profissional

Landing page profissional desenvolvida para apresentar o portfólio de Jonas Pacheco, Desenvolvedor Fullstack e especialista em DevSecOps.

## Características

### Design Moderno e Tecnológico
- Interface dark mode com paleta de cores profissional (Preto, Azul Ciano, Verde Neon, Amarelo)
- Animações suaves e interativas
- Design 100% responsivo (Mobile, Tablet, Desktop)
- Tipografia moderna com fontes Inter e Fira Code

### Seções Implementadas

1. **Hero Section**
   - Apresentação com efeito de digitação dinâmica
   - Terminal animado mostrando stack tecnológico
   - Links para redes sociais (GitHub, LinkedIn, Instagram)
   - CTAs para contato e projetos

2. **Sobre**
   - Descrição profissional completa
   - Cards com destaques (Segurança, Escalabilidade, Automação)
   - Estatísticas animadas com contadores

3. **Especialidades**
   - 6 áreas de expertise detalhadas:
     - Desenvolvimento Backend
     - Desenvolvimento Frontend
     - Sistemas ERP
     - DevSecOps
     - Desenvolvimento Mobile
     - Automação & Compliance

4. **Projetos**
   - Showcase de 6 projetos principais do GitHub
   - Links diretos para os repositórios
   - Informações sobre tecnologias utilizadas

5. **Tecnologias**
   - Stack completo organizado por categorias:
     - Linguagens (PHP, Python, JavaScript, Kotlin, HTML, CSS)
     - Frameworks (React, Node.js, Laravel, Django)
     - Banco de Dados (MySQL, PostgreSQL, MongoDB)
     - DevOps & Tools (Docker, Git, CI/CD, Linux)

6. **Contato**
   - Formulário funcional com validação
   - Múltiplos canais de contato
   - Notificações de sucesso/erro

### Funcionalidades JavaScript

- **Animações on scroll** - Elementos animam conforme aparecem na tela
- **Efeito de digitação** - Títulos profissionais animados no hero
- **Contadores animados** - Estatísticas com animação de números
- **Menu mobile responsivo** - Navegação otimizada para mobile
- **Formulário de contato** - Com validação e feedback visual
- **Botão voltar ao topo** - Aparece após scroll
- **Smooth scrolling** - Navegação suave entre seções
- **Parallax effect** - Efeito de profundidade no background
- **Lazy loading** - Otimização de carregamento de imagens
- **Navegação por teclado** - Suporte para atalhos (ESC, Ctrl+K)

## Estrutura de Arquivos

```
jonas/
├── index.html                         # Estrutura HTML principal
├── styles.css                         # Estilos CSS com design system
├── script.js                          # Funcionalidades JavaScript
├── .htaccess                          # Configurações Apache
├── favicon.svg                        # Ícone do site
├── jonas-pro.jpg                      # Foto profissional
│
├── deploy/                            # Arquivos prontos para produção
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── favicon.svg
│   ├── jonas-pro.jpg
│   └── .htaccess
│
├── logo-jonas-dvlpr.svg              # Logo com background
├── logo-jonas-dvlpr-transparent.svg  # Logo transparente
├── logo-jonas-icon.svg               # Ícone/avatar
├── logos.html                         # Página de download de logos
│
├── .gitignore                         # Arquivos ignorados pelo Git
└── README.md                          # Esta documentação
```

## 🎨 Logos e Branding

O projeto inclui um sistema completo de identidade visual com logos profissionais:

### Variações Disponíveis

1. **Logo Completa - Background Escuro** (`logo-jonas-dvlpr.svg`)
   - Dimensões: 400x120px
   - Background preto (#0a0a0a)
   - Ideal para fundos claros e apresentações

2. **Logo Completa - Transparente** (`logo-jonas-dvlpr-transparent.svg`)
   - Dimensões: 400x120px
   - Fundo transparente
   - Versátil para qualquer contexto (Canva, redes sociais)

3. **Ícone/Avatar** (`logo-jonas-icon.svg`)
   - Dimensões: 200x200px circular
   - Para perfis, avatares e redes sociais

### Download de Logos

Acesse [logos.html](logos.html) no navegador para fazer download em múltiplos formatos:

- **SVG:** Vetor escalável, sem perda de qualidade
- **PNG:** Disponível em 3 resoluções:
  - **1x (Padrão):** Para web e perfis
  - **2x (Alta):** Para Retina displays e posts HD
  - **4x (Máxima):** Ideal para Canva, impressão e banners (até 1600x480px)

### Paleta de Cores

| Cor | Hexadecimal | Uso |
|-----|-------------|-----|
| Cyan Blue | `#00d4ff` | Cor primária, destaques |
| Neon Green | `#00ff88` | Cor secundária, CTAs |
| Dark Background | `#0a0a0a` | Fundo principal |
| Gradient | `#00d4ff → #00ff88` | Logos, títulos especiais |

### Uso no Canva

1. Abra `logos.html` no navegador
2. Clique em "Download PNG" e escolha resolução **Máxima (4x)**
3. No Canva: Upload → Faça upload de arquivos
4. Arraste o PNG para seu design
5. Use versão **transparente** para sobrepor em qualquer fundo

## Como Usar

### 1. Visualização Local

Basta abrir o arquivo `index.html` em qualquer navegador moderno:

```bash
# No Windows
start index.html

# Ou clique duas vezes no arquivo index.html
```

### 2. Servidor Local (Recomendado)

Para melhor performance e funcionalidade completa:

```bash
# Python
python -m http.server 8000

# Node.js (http-server)
npx http-server

# PHP
php -S localhost:8000

# VS Code - Live Server extension
# Clique com botão direito no index.html > Open with Live Server
```

Acesse: `http://localhost:8000`

### 3. Deploy

#### GitHub Pages
```bash
# 1. Crie um repositório no GitHub
# 2. Faça upload dos arquivos
# 3. Vá em Settings > Pages
# 4. Selecione a branch main
# 5. Seu site estará em: https://username.github.io/repository-name
```

#### Netlify (Recomendado)
1. Acesse [netlify.com](https://netlify.com)
2. Arraste a pasta do projeto
3. Site publicado instantaneamente!

#### Vercel
```bash
npm i -g vercel
vercel
```

## Personalização

### Alterar Cores

Edite as variáveis CSS no arquivo `styles.css`:

```css
:root {
    --color-blue-primary: #00d4ff;    /* Azul principal */
    --color-green-primary: #00ff88;   /* Verde destaque */
    --color-yellow-primary: #ffd600;  /* Amarelo */
    /* Personalize conforme necessário */
}
```

### Atualizar Conteúdo

1. **Informações pessoais**: Edite o HTML em `index.html`
2. **Projetos**: Atualize a seção `#projects`
3. **Tecnologias**: Modifique a seção `#technologies`
4. **Links sociais**: Atualize os links no hero e footer

### Configurar Formulário de Contato

O formulário atualmente exibe mensagens de sucesso localmente. Para envios reais:

#### Opção 1: Formspree
```html
<form action="https://formspree.io/f/seu-id" method="POST">
```

#### Opção 2: EmailJS
```javascript
// Adicione no script.js
emailjs.send("service_id", "template_id", formData)
    .then(response => {
        showNotification('Mensagem enviada!', 'success');
    });
```

#### Opção 3: Backend próprio
```javascript
fetch('https://sua-api.com/contact', {
    method: 'POST',
    body: JSON.stringify(formData)
})
```

## Otimizações Implementadas

- ✅ CSS minificável
- ✅ JavaScript modular e otimizado
- ✅ Lazy loading de imagens
- ✅ Debounce em eventos de scroll
- ✅ Intersection Observer para animações
- ✅ Responsivo em todos os dispositivos
- ✅ Performance web otimizada
- ✅ SEO-friendly com meta tags
- ✅ Acessibilidade (ARIA labels)

## Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Design system moderno com variáveis CSS
- **JavaScript (ES6+)** - Interatividade e animações
- **Font Awesome 6** - Ícones profissionais
- **Google Fonts** - Inter & Fira Code

## Compatibilidade

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Próximos Passos (Sugestões)

1. **Analytics**: Adicionar Google Analytics ou Plausible
2. **SEO**: Adicionar sitemap.xml e robots.txt
3. **Performance**: Implementar service worker para PWA
4. **Blog**: Adicionar seção de artigos/blog
5. **Certificações**: Adicionar seção de certificados
6. **Depoimentos**: Incluir feedback de clientes
7. **Dark/Light Mode Toggle**: Implementar alternância de tema

## Suporte

Para dúvidas ou sugestões:

- **Email**: [contato@i9script.com](mailto:contato@i9script.com)
- **GitHub**: [@jonasbrito1](https://github.com/jonasbrito1)
- **LinkedIn**: [Jonas Pacheco](https://www.linkedin.com/in/jonaspacheco1/)
- **Instagram**: [@jonasbritopacheco](https://www.instagram.com/jonasbritopacheco/)
- **Website**: [i9script.com/jonas](https://i9script.com/jonas)

## Licença

Este projeto foi desenvolvido exclusivamente para Jonas Pacheco. Todos os direitos reservados © 2025.

---

**Desenvolvido com 💙 por Claude Code**