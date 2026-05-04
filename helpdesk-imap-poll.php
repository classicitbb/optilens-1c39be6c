<?php
/**
 * helpdesk-imap-poll.php
 *
 * Polls support@classicvisions.net IMAP inbox, forwards each unseen email
 * to the Supabase helpdesk-inbound-email edge function, then marks it as read.
 *
 * Run via cPanel cron every 3 minutes:
 *   *\/3 * * * * /usr/bin/php /home/YOURUSERNAME/public_html/helpdesk-imap-poll.php >> /home/YOURUSERNAME/logs/helpdesk-poll.log 2>&1
 *
 * Requirements: PHP imap extension (standard on cPanel servers)
 */

// ── Configuration ────────────────────────────────────────────────────────────

define('IMAP_HOST',   '{mail.classicvisions.net:993/imap/ssl/novalidate-cert}INBOX');
define('IMAP_USER',   'support@classicvisions.net');
define('IMAP_PASS',   getenv('IMAP_PASS') ?: 'REPLACE_WITH_EMAIL_PASSWORD');

define('SUPABASE_FUNCTION_URL', 'https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/helpdesk-inbound-email');
define('INBOUND_SECRET',        getenv('HELPDESK_INBOUND_SECRET') ?: 'REPLACE_WITH_YOUR_SECRET');

define('MAX_EMAILS_PER_RUN', 20);   // safety cap per cron execution
define('LOCK_FILE', sys_get_temp_dir() . '/helpdesk-poll.lock');

// ── Lock: prevent overlapping runs ──────────────────────────────────────────

if (file_exists(LOCK_FILE) && (time() - filemtime(LOCK_FILE)) < 120) {
    log_msg('Already running — skipping');
    exit(0);
}
file_put_contents(LOCK_FILE, getmypid());

// ── Connect to IMAP ──────────────────────────────────────────────────────────

$mbox = @imap_open(IMAP_HOST, IMAP_USER, IMAP_PASS);
if (!$mbox) {
    log_msg('IMAP connect failed: ' . imap_last_error());
    unlink(LOCK_FILE);
    exit(1);
}

// ── Fetch unseen messages ────────────────────────────────────────────────────

$uids = imap_search($mbox, 'UNSEEN', SE_UID);
if (!$uids) {
    log_msg('No unseen messages');
    imap_close($mbox);
    unlink(LOCK_FILE);
    exit(0);
}

$uids  = array_slice($uids, 0, MAX_EMAILS_PER_RUN);
$count = count($uids);
log_msg("Found {$count} unseen message(s)");

foreach ($uids as $uid) {
    process_email($mbox, $uid);
}

imap_close($mbox);
unlink(LOCK_FILE);
log_msg('Done');
exit(0);

// ── Functions ────────────────────────────────────────────────────────────────

function process_email($mbox, int $uid): void
{
    $header  = imap_fetchheader($mbox, $uid, FT_UID);
    $struct  = imap_fetchstructure($mbox, $uid, FT_UID);
    $overview = imap_fetch_overview($mbox, $uid, FT_UID);
    $overview = $overview[0] ?? null;

    if (!$overview) {
        log_msg("UID {$uid}: could not fetch overview, skipping");
        return;
    }

    // Decode headers
    $subject   = decode_mime($overview->subject ?? '(no subject)');
    $from      = decode_mime($overview->from ?? '');
    $messageId = trim($overview->message_id ?? '');
    $date      = $overview->date ?? '';

    // Extract body parts
    [$bodyText, $bodyHtml] = extract_body($mbox, $uid, $struct);

    log_msg("UID {$uid}: from={$from} subject={$subject} msgid={$messageId}");

    // POST to Supabase edge function
    $payload = json_encode([
        'from'       => $from,
        'to'         => 'support@classicvisions.net',
        'subject'    => $subject,
        'body_text'  => $bodyText,
        'body_html'  => $bodyHtml ?: null,
        'message_id' => $messageId,
        'date'       => $date,
    ]);

    $ch = curl_init(SUPABASE_FUNCTION_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-inbound-secret: ' . INBOUND_SECRET,
        ],
    ]);

    $response   = curl_exec($ch);
    $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError  = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        log_msg("UID {$uid}: curl error — {$curlError}");
        return;
    }

    $result = json_decode($response, true);

    if ($httpStatus === 200 && !empty($result['ok'])) {
        $ticketNum = $result['ticketNumber'] ?? '?';
        $matched   = $result['contactMatched'] ? 'contact matched' : 'no contact match';
        $dup       = !empty($result['duplicate']) ? ' (duplicate)' : '';
        log_msg("UID {$uid}: ✅ ticket {$ticketNum} — {$matched}{$dup}");

        // Mark as read only after successful processing
        imap_setflag_full($mbox, $uid, '\\Seen', ST_UID);
    } else {
        log_msg("UID {$uid}: ⚠ function returned HTTP {$httpStatus} — {$response}");
    }
}

/**
 * Walk the MIME structure and extract plain-text and HTML body parts.
 */
function extract_body($mbox, int $uid, $struct): array
{
    $text = '';
    $html = '';

    if (!isset($struct->parts)) {
        // Single-part message
        $raw = imap_fetchbody($mbox, $uid, '1', FT_UID);
        $decoded = decode_part($raw, $struct->encoding ?? 0);
        if (isset($struct->subtype) && strtolower($struct->subtype) === 'html') {
            $html = $decoded;
        } else {
            $text = $decoded;
        }
        return [$text, $html];
    }

    // Multi-part: walk parts
    foreach ($struct->parts as $index => $part) {
        $partNum = (string)($index + 1);
        $subtype = strtolower($part->subtype ?? '');

        if ($subtype === 'plain' && $text === '') {
            $raw  = imap_fetchbody($mbox, $uid, $partNum, FT_UID);
            $text = decode_part($raw, $part->encoding ?? 0);
        } elseif ($subtype === 'html' && $html === '') {
            $raw  = imap_fetchbody($mbox, $uid, $partNum, FT_UID);
            $html = decode_part($raw, $part->encoding ?? 0);
        }

        // Handle nested multipart (e.g. multipart/alternative inside multipart/mixed)
        if (!empty($part->parts) && $text === '' && $html === '') {
            [$nestedText, $nestedHtml] = extract_nested($mbox, $uid, $part->parts, $partNum);
            if ($nestedText) $text = $nestedText;
            if ($nestedHtml) $html = $nestedHtml;
        }
    }

    return [$text ?: strip_tags($html), $html];
}

function extract_nested($mbox, int $uid, array $parts, string $parentNum): array
{
    $text = '';
    $html = '';
    foreach ($parts as $index => $part) {
        $partNum = $parentNum . '.' . ($index + 1);
        $subtype = strtolower($part->subtype ?? '');
        if ($subtype === 'plain' && $text === '') {
            $raw  = imap_fetchbody($mbox, $uid, $partNum, FT_UID);
            $text = decode_part($raw, $part->encoding ?? 0);
        } elseif ($subtype === 'html' && $html === '') {
            $raw  = imap_fetchbody($mbox, $uid, $partNum, FT_UID);
            $html = decode_part($raw, $part->encoding ?? 0);
        }
    }
    return [$text, $html];
}

function decode_part(string $raw, int $encoding): string
{
    switch ($encoding) {
        case 3: return base64_decode($raw);           // BASE64
        case 4: return quoted_printable_decode($raw); // QUOTED-PRINTABLE
        default: return $raw;
    }
}

function decode_mime(string $str): string
{
    if (empty($str)) return $str;
    $decoded = imap_mime_header_decode($str);
    $result  = '';
    foreach ($decoded as $part) {
        $charset = strtolower($part->charset ?? 'default');
        $text    = $part->text ?? '';
        if ($charset !== 'default' && $charset !== 'utf-8' && function_exists('mb_convert_encoding')) {
            $text = mb_convert_encoding($text, 'UTF-8', $charset);
        }
        $result .= $text;
    }
    return trim($result) ?: $str;
}

function log_msg(string $msg): void
{
    echo '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
}
