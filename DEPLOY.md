# 🚀 Guia de Deploy - Portfolio Jonas Pacheco

## 📁 Arquivos para Upload

### Arquivos Obrigatórios (5 arquivos)
```
/home/u674882802/domains/i9script.com/public_html/jonas/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Funcionalidades JavaScript
├── favicon.svg         # Ícone do site
├── jonas-pro.jpg       # Foto de perfil
└── .htaccess           # Configurações do servidor
```

## 🌐 URLs do Site

- **Subdomínio**: https://jonas.i9script.com
- **Caminho completo**: /home/u674882802/domains/i9script.com/public_html/jonas/

## 📤 Métodos de Upload

### Opção 1: FTP/SFTP (Recomendado)

**Usando FileZilla:**
1. Abra o FileZilla
2. Conecte ao servidor:
   - Host: ftp.i9script.com (ou o fornecido pela hospedagem)
   - Usuário: u674882802
   - Porta: 21 (FTP) ou 22 (SFTP)
3. Navegue até: `/home/u674882802/domains/i9script.com/public_html/jonas/`
4. Arraste e solte os 6 arquivos

**Usando WinSCP (Windows):**
1. Abra o WinSCP
2. Novo Site
3. Configure a conexão
4. Conecte e navegue até a pasta jonas
5. Faça upload dos arquivos

### Opção 2: cPanel File Manager

1. Acesse o cPanel da hospedagem
2. Abra "Gerenciador de Arquivos"
3. Navegue até: `public_html/jonas/`
4. Clique em "Upload"
5. Selecione os 6 arquivos
6. Aguarde o upload completar

### Opção 3: Linha de Comando (SCP)

```bash
# Upload individual
scp index.html u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/
scp styles.css u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/
scp script.js u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/
scp favicon.svg u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/
scp jonas-pro.jpg u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/
scp .htaccess u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/

# Ou upload de tudo de uma vez
scp index.html styles.css script.js favicon.svg jonas-pro.jpg .htaccess u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/
```

## ✅ Checklist de Deploy

### Antes do Upload
- [x] Todos os arquivos estão presentes
- [x] Código testado localmente
- [x] Traduções PT/EN funcionando
- [x] Responsividade verificada
- [x] Links de contato atualizados

### Durante o Upload
- [ ] Conectado ao servidor
- [ ] Pasta `jonas` existe em public_html
- [ ] Upload de index.html
- [ ] Upload de styles.css
- [ ] Upload de script.js
- [ ] Upload de favicon.svg
- [ ] Upload de jonas-pro.jpg
- [ ] Upload de .htaccess

### Após o Upload
- [ ] Verificar permissões dos arquivos (644 para arquivos, 755 para pastas)
- [ ] Acessar https://jonas.i9script.com
- [ ] Testar alternância de idiomas (PT/EN)
- [ ] Testar formulário de contato
- [ ] Verificar responsividade mobile
- [ ] Testar todos os links
- [ ] Verificar carregamento de imagens
- [ ] Testar animações e efeitos

## 🔧 Configuração de Permissões

```bash
# Via SSH/Terminal
cd /home/u674882802/domains/i9script.com/public_html/jonas/
chmod 644 index.html styles.css script.js favicon.svg jonas-pro.jpg .htaccess
chmod 755 .

# Ou via cPanel File Manager:
# Clique direito no arquivo > Permissões > 644
```

## 🔍 Testes Pós-Deploy

### 1. Teste de Funcionalidades
```
✓ Hero section carrega corretamente
✓ Animação de digitação funciona
✓ Scroll suave entre seções
✓ Botão de idioma alterna PT/EN
✓ Seção Sobre com stats animados
✓ Depoimentos aparecem
✓ Timeline do processo funciona
✓ Projetos com métricas visíveis
✓ Garantias no contato exibidas
✓ Formulário de contato funcional
✓ Footer com links corretos
✓ Botão "Voltar ao topo" funciona
```

### 2. Teste de Performance
- Abra: https://pagespeed.web.dev/
- Digite: https://jonas.i9script.com
- Verifique score de performance

### 3. Teste de Responsividade
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

### 4. Teste de Navegadores
- Chrome
- Firefox
- Safari
- Edge

## 📧 Configuração de Email (Formulário de Contato)

O formulário atualmente mostra apenas mensagens de sucesso localmente. Para configurar envio real:

### Opção 1: PHP Mail (Servidor)
Criar arquivo `send-mail.php` no servidor:

```php
<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = strip_tags(trim($_POST['name']));
    $email = filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL);
    $subject = strip_tags(trim($_POST['subject']));
    $message = strip_tags(trim($_POST['message']));

    $to = 'contato@jonaspacheco.dev'; // Seu email
    $email_subject = "Contato do Site: $subject";
    $email_body = "Nome: $name\nEmail: $email\n\nMensagem:\n$message";

    $headers = "From: $email\r\n";
    $headers .= "Reply-To: $email\r\n";

    if (mail($to, $email_subject, $email_body, $headers)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
}
?>
```

Depois, atualizar script.js para usar o PHP:
```javascript
// No script.js, linha ~223
const response = await fetch('send-mail.php', {
    method: 'POST',
    body: new FormData(contactForm)
});
```

### Opção 2: EmailJS (Sem Backend)
1. Criar conta em https://emailjs.com
2. Configurar serviço de email
3. Adicionar no script.js antes do formulário:

```javascript
// Adicionar SDK do EmailJS no index.html antes do </body>
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

// No script.js
emailjs.init("YOUR_PUBLIC_KEY");

// Na função de submit do formulário
emailjs.send("service_id", "template_id", {
    name: formData.name,
    email: formData.email,
    subject: formData.subject,
    message: formData.message
}).then(response => {
    showNotification('Mensagem enviada com sucesso!', 'success');
});
```

## 🔐 Segurança

### Headers de Segurança (já configurados no .htaccess)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

### SSL/HTTPS
Certifique-se que o subdomínio tem certificado SSL instalado:
1. No cPanel > SSL/TLS Status
2. Verificar se jonas.i9script.com está listado
3. Se não, instalar certificado Let's Encrypt gratuito

## 📊 Analytics e SEO

### Google Analytics (Opcional)
Adicionar no `<head>` do index.html:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Meta Tags SEO (já incluídas)
✓ Title
✓ Description
✓ Keywords
✓ Open Graph
✓ Twitter Cards

## 🛠️ Manutenção

### Atualizar Conteúdo
1. Baixe os arquivos do servidor
2. Edite localmente
3. Teste no navegador
4. Faça upload novamente

### Backup
Recomendado fazer backup semanal:
```bash
# Baixar backup completo
scp -r u674882802@i9script.com:/home/u674882802/domains/i9script.com/public_html/jonas/ ./backup-$(date +%Y%m%d)/
```

## 🆘 Troubleshooting

### Site não carrega
1. Verificar permissões dos arquivos
2. Verificar se index.html está na pasta correta
3. Limpar cache do navegador
4. Verificar logs de erro do servidor

### Imagem não aparece
1. Verificar se jonas-pro.jpg foi enviado
2. Verificar permissões do arquivo
3. Verificar caminho no index.html

### CSS/JS não funciona
1. Verificar permissões (644)
2. Limpar cache do navegador (Ctrl+F5)
3. Verificar console do navegador para erros

### Formulário não envia
1. Configurar backend PHP ou EmailJS
2. Verificar permissões de envio de email no servidor
3. Verificar configurações de SMTP

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs de erro do servidor
2. Abrir ticket no suporte da hospedagem
3. Verificar documentação do cPanel

---

✨ **Desenvolvido com sucesso! Boa sorte com o deploy!**
