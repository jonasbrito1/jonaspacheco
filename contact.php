<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://jonaspacheco.cloud');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Rate limiting simples por IP (max 5 req/hora via arquivo)
$ip      = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rl_file = sys_get_temp_dir() . '/contact_rl_' . md5($ip) . '.json';
$now     = time();
$limit   = 5;
$window  = 3600;

$rl_data = file_exists($rl_file) ? json_decode(file_get_contents($rl_file), true) : ['count' => 0, 'reset' => $now + $window];
if ($now > $rl_data['reset']) {
    $rl_data = ['count' => 0, 'reset' => $now + $window];
}
if ($rl_data['count'] >= $limit) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Muitas tentativas. Tente novamente em 1 hora.']);
    exit;
}
$rl_data['count']++;
file_put_contents($rl_file, json_encode($rl_data));

// Sanitizar entradas
$name    = trim(strip_tags($_POST['name']    ?? ''));
$email   = trim(strip_tags($_POST['email']   ?? ''));
$subject = trim(strip_tags($_POST['subject'] ?? ''));
$message = trim(strip_tags($_POST['message'] ?? ''));

// Validar campos
if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos os campos são obrigatórios.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

if (strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Mensagem muito longa (máx. 5000 caracteres).']);
    exit;
}

// Carregar config (só existe no VPS, fora do git)
$config_file = __DIR__ . '/config.php';
if (!file_exists($config_file)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuração de email não encontrada.']);
    exit;
}
require_once $config_file;

// PHPMailer via Composer
require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = SMTP_PORT;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom(SMTP_USER, 'Jonas Pacheco | Portfolio');
    $mail->addAddress(MAIL_TO, 'Jonas Pacheco');
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = '[jonaspacheco.cloud] ' . $subject;
    $mail->Body    = "
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto'>
  <div style='background:#0a0a0a;padding:24px;border-radius:8px 8px 0 0'>
    <h2 style='color:#00d4ff;margin:0'>&lt;jonas.dvlpr /&gt;</h2>
    <p style='color:#808080;margin:4px 0 0'>Nova mensagem via jonaspacheco.cloud</p>
  </div>
  <div style='background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0'>
    <table style='width:100%;border-collapse:collapse'>
      <tr><td style='padding:8px 0;color:#666;width:100px'><strong>Nome:</strong></td><td style='padding:8px 0'>" . htmlspecialchars($name) . "</td></tr>
      <tr><td style='padding:8px 0;color:#666'><strong>Email:</strong></td><td style='padding:8px 0'><a href='mailto:" . htmlspecialchars($email) . "' style='color:#0099cc'>" . htmlspecialchars($email) . "</a></td></tr>
      <tr><td style='padding:8px 0;color:#666'><strong>Assunto:</strong></td><td style='padding:8px 0'>" . htmlspecialchars($subject) . "</td></tr>
    </table>
    <hr style='border:none;border-top:1px solid #e0e0e0;margin:16px 0'>
    <p style='color:#666;margin-bottom:8px'><strong>Mensagem:</strong></p>
    <div style='background:#fff;padding:16px;border-radius:4px;border-left:4px solid #00d4ff;white-space:pre-wrap'>" . htmlspecialchars($message) . "</div>
    <p style='color:#999;font-size:12px;margin-top:24px'>
      Enviado em " . date('d/m/Y H:i:s') . " · IP: " . htmlspecialchars($ip) . "
    </p>
  </div>
</body>
</html>";

    $mail->send();

    // Criar ticket no hub automaticamente (fire-and-forget)
    $hub_key = defined('HUB_TICKET_KEY') ? HUB_TICKET_KEY : '';
    if (!empty($hub_key)) {
        $ticket_title = 'Contato via site: ' . mb_substr($subject, 0, 80, 'UTF-8');
        $ticket_desc  = "De: {$name} <{$email}>\nAssunto: {$subject}\n\n{$message}";
        $ticket_data  = json_encode([
            'title'        => $ticket_title,
            'description'  => $ticket_desc,
            'client_name'  => $name,
            'client_email' => $email,
            'category'     => 'suporte',
            'urgency'      => 'media',
        ]);
        $ch = curl_init('http://localhost:3200/api/tickets/public');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $ticket_data,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'X-Api-Key: ' . $hub_key],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }

    echo json_encode(['success' => true, 'message' => 'Mensagem enviada! Responderei em breve.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao enviar. Tente pelo WhatsApp ou email diretamente.']);
}
