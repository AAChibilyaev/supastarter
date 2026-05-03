<?php

/**
 * AJAX search proxy handler for AACsearch widget.
 *
 * Called by the inline search widget to proxy search requests
 * through the server (avoids CORS and token exposure).
 *
 * URL: /bitrix/admin/aac_search_ajax.php
 * Method: POST
 * Body: { q: string, limit?: number, offset?: number }
 * Response: JSON { items: array, total: number } or { error: string }
 */

use Bitrix\Main\Loader;
use Bitrix\Main\Config\Option;
use Bitrix\Main\Localization\Loc;

$_SERVER['DOCUMENT_ROOT'] = realpath(__DIR__ . '/../../../..');

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_before.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!Loader::includeModule('aac.search')) {
    http_response_code(500);
    echo json_encode(['error' => 'AAC Search module not installed.']);
    exit;
}

// Read POST body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['q'])) {
    echo json_encode(['items' => [], 'total' => 0]);
    exit;
}

$q      = trim($input['q']);
$limit  = (int) ($input['limit'] ?? 10);
$offset = (int) ($input['offset'] ?? 0);

// Build the search request to AACsearch API
$apiUrl    = rtrim((string) Option::get('aac.search', 'api_url', ''), '/');
$projectId = (string) Option::get('aac.search', 'project_id', '');
$token     = (string) Option::get('aac.search', 'connector_token', '');

if (empty($apiUrl) || empty($projectId) || empty($token)) {
    echo json_encode(['error' => 'AAC Search module is not configured.']);
    exit;
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $apiUrl . '/api/projects/' . urlencode($projectId) . '/search',
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: AACsearch-Bitrix/1.0.0',
    ],
    CURLOPT_POSTFIELDS     => json_encode([
        'q'      => $q,
        'limit'  => $limit,
        'offset' => $offset,
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$responseBody = curl_exec($ch);
$httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError    = curl_error($ch);
curl_close($ch);

if (!empty($curlError)) {
    http_response_code(502);
    echo json_encode(['error' => 'Search request failed: ' . $curlError]);
    exit;
}

if ($httpCode >= 200 && $httpCode < 300 && !empty($responseBody)) {
    $decoded = json_decode($responseBody, true);
    if (is_array($decoded)) {
        echo json_encode([
            'items' => $decoded['items'] ?? $decoded['result'] ?? [],
            'total' => $decoded['total'] ?? count($decoded['items'] ?? []),
        ]);
        exit;
    }
}

http_response_code(502);
echo json_encode(['error' => 'AACsearch API returned HTTP ' . $httpCode]);
