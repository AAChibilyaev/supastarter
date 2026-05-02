<?php
/**
 * AACsearch HTTP Client for WordPress.
 *
 * Handles authentication via Bearer token (ss_connector_* prefix) and
 * communicates with the AACsearch Connector API for handshake, full sync,
 * delta sync, product deletion (single + batch), and diagnostics.
 *
 * @since      1.0.0
 * @package    AACsearch
 */
if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_Client
{
	/**
	 * Base URL of the AACsearch Connector API.
	 *
	 * @var string
	 */
	protected $apiUrl;

	/**
	 * Project identifier.
	 *
	 * @var string
	 */
	protected $projectId;

	/**
	 * Bearer token for API authentication (ss_connector_*).
	 *
	 * @var string
	 */
	protected $connectorToken;

	/**
	 * Default connection timeout in seconds.
	 */
	const TIMEOUT = 30;

	/**
	 * @param string $apiUrl         Base URL of the Connector API.
	 * @param string $projectId      AACsearch project ID.
	 * @param string $connectorToken ss_connector_* token.
	 */
	public function __construct($apiUrl, $projectId, $connectorToken)
	{
		$this->apiUrl         = rtrim($apiUrl, '/');
		$this->projectId      = $projectId;
		$this->connectorToken = $connectorToken;
	}

	/**
	 * Perform a handshake with the AACsearch Connector API.
	 * POST /api/connectors/handshake
	 *
	 * @return bool True if handshake succeeded (status === 'active').
	 *
	 * @throws Exception
	 */
	public function handshake()
	{
		$response = $this->request('POST', '/api/connectors/handshake', array(
			'moduleVersion' => AACSEARCH_VERSION,
			'platform'      => 'wordpress',
		));

		return $response !== null && isset($response['status']) && $response['status'] === 'active';
	}

	/**
	 * Send a full sync of all documents.
	 * POST /api/projects/{projectId}/sync/full
	 *
	 * @param array $documents Array of ProductDocument arrays.
	 *
	 * @return bool True if sync succeeded.
	 *
	 * @throws Exception
	 */
	public function fullSync(array $documents)
	{
		$response = $this->request(
			'POST',
			'/api/projects/' . urlencode($this->projectId) . '/sync/full',
			array(
				'products' => $documents,
			)
		);

		return $response !== null && !isset($response['error']);
	}

	/**
	 * Send a delta sync of changed documents.
	 * POST /api/projects/{projectId}/sync/delta
	 *
	 * @param array $documents Array of ProductDocument arrays.
	 *
	 * @return bool True if sync succeeded.
	 *
	 * @throws Exception
	 */
	public function deltaSync(array $documents)
	{
		$response = $this->request(
			'POST',
			'/api/projects/' . urlencode($this->projectId) . '/sync/delta',
			array(
				'products' => $documents,
			)
		);

		return $response !== null && !isset($response['error']);
	}

	/**
	 * Delete a single document from AACsearch by its external ID.
	 * DELETE /api/projects/{projectId}/products/{externalId}
	 *
	 * @param string $externalId The document's external ID.
	 *
	 * @return bool True if deletion succeeded.
	 *
	 * @throws Exception
	 */
	public function deleteProduct($externalId)
	{
		$response = $this->request(
			'DELETE',
			'/api/projects/' . urlencode($this->projectId) . '/products/' . urlencode($externalId)
		);

		return $response !== null && !isset($response['error']);
	}

	/**
	 * Delete a batch of documents from AACsearch.
	 * DELETE /api/connector/documents
	 *
	 * Accepts up to 500 IDs per API call; larger arrays are automatically
	 * split into 500-item chunks.
	 *
	 * @param array $externalIds Array of external document IDs to delete.
	 *
	 * @return int Total number of deleted documents.
	 *
	 * @throws Exception
	 */
	public function batchDelete(array $externalIds)
	{
		if (empty($externalIds)) {
			return 0;
		}

		$total = 0;
		foreach (array_chunk($externalIds, 500) as $chunk) {
			$response = $this->request('DELETE', '/api/connector/documents', array('externalIds' => $chunk));
			$total   += (int) ($response['deleted'] ?? count($chunk));
		}

		return $total;
	}

	/**
	 * Send diagnostics data to AACsearch.
	 * POST /api/projects/{projectId}/diagnostics
	 *
	 * @param array $diagnostics Associative array of diagnostic data.
	 *
	 * @return bool True if diagnostics were accepted.
	 *
	 * @throws Exception
	 */
	public function sendDiagnostics(array $diagnostics = array())
	{
		$defaults = array(
			'moduleVersion' => AACSEARCH_VERSION,
			'phpVersion'    => phpversion(),
			'shopUrl'       => get_site_url(),
			'totalProducts' => 0,
			'errors'        => array(),
		);

		$response = $this->request(
			'POST',
			'/api/projects/' . urlencode($this->projectId) . '/diagnostics',
			array_merge($defaults, $diagnostics)
		);

		return $response !== null && !isset($response['error']);
	}

	/**
	 * Execute an HTTP request against the AACsearch API.
	 *
	 * @param string $method HTTP method (GET, POST, DELETE, etc.).
	 * @param string $path   API path (e.g., /api/connectors/handshake).
	 * @param array  $body   Request body payload (optional).
	 *
	 * @return array|null Decoded response array, or null on failure.
	 *
	 * @throws Exception
	 */
	protected function request($method, $path, array $body = array())
	{
		$url = $this->apiUrl . $path;

		$headers = array(
			'Authorization: Bearer ' . $this->connectorToken,
			'Content-Type: application/json',
			'Accept: application/json',
			'User-Agent: AACsearch-WordPress/' . AACSEARCH_VERSION,
		);

		$ch = curl_init();
		curl_setopt_array($ch, array(
			CURLOPT_URL            => $url,
			CURLOPT_CUSTOMREQUEST  => $method,
			CURLOPT_HTTPHEADER     => $headers,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_TIMEOUT        => self::TIMEOUT,
			CURLOPT_CONNECTTIMEOUT => 10,
			CURLOPT_SSL_VERIFYPEER => true,
			CURLOPT_SSL_VERIFYHOST => 2,
			CURLOPT_FOLLOWLOCATION => false,
		));

		if (!empty($body) && in_array($method, array('POST', 'PUT', 'PATCH', 'DELETE'), true)) {
			curl_setopt($ch, CURLOPT_POSTFIELDS, wp_json_encode($body));
		}

		$responseBody = curl_exec($ch);
		$httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$curlError    = curl_error($ch);
		$curlErrno    = curl_errno($ch);
		curl_close($ch);

		if ($curlErrno !== 0) {
			throw new Exception(
				'AACsearch API request failed: cURL error ' . $curlErrno . ' - ' . $curlError
			);
		}

		// 2xx responses are successful
		if ($httpCode >= 200 && $httpCode < 300) {
			if (empty($responseBody)) {
				return array();
			}

			$decoded = json_decode($responseBody, true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				throw new Exception(
					'AACsearch API: invalid JSON response (' . json_last_error_msg() . ')'
				);
			}

			return $decoded;
		}

		// Handle non-2xx responses
		$errorMessage = 'AACsearch API returned HTTP ' . $httpCode;

		if (!empty($responseBody)) {
			$decoded = json_decode($responseBody, true);
			if (isset($decoded['error'])) {
				$errorMessage .= ': ' . (is_string($decoded['error'])
					? $decoded['error']
					: wp_json_encode($decoded['error']));
			} elseif (isset($decoded['message'])) {
				$errorMessage .= ': ' . $decoded['message'];
			} else {
				$errorMessage .= ': ' . substr($responseBody, 0, 500);
			}
		}

		throw new Exception($errorMessage);
	}

	/**
	 * Validate that the client has the minimum required configuration.
	 *
	 * @return bool
	 */
	public function isConfigured()
	{
		return !empty($this->apiUrl)
			&& !empty($this->projectId)
			&& !empty($this->connectorToken);
	}
}
