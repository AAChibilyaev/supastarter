<?php
/**
 * AACsearch HTTP Client for WordPress — SDK adapter.
 *
 * Thin wrapper around the Aacsearch\ConnectorClient from the aacsearch-php SDK.
 * Replaces the previous standalone cURL implementation.
 *
 * @since      1.0.0
 * @package    AACsearch
 */

// Load the aacsearch-php SDK (PSR-4 autoload not available in WP context)
require_once AACSEARCH_PLUGIN_DIR . 'lib/aacsearch/ConnectorClient.php';
require_once AACSEARCH_PLUGIN_DIR . 'lib/aacsearch/Exceptions.php';

use Aacsearch\ConnectorClient;
use Aacsearch\AacsearchException;

if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_Client
{
	/**
	 * Underlying SDK ConnectorClient instance.
	 *
	 * @var ConnectorClient
	 */
	protected $connector;

	/**
	 * @param string $apiUrl         Base URL of the Connector API.
	 * @param string $projectId      AACsearch project ID.
	 * @param string $connectorToken ss_connector_* token.
	 */
	public function __construct($apiUrl, $projectId, $connectorToken)
	{
		$this->connector = new ConnectorClient(
			$apiUrl,
			$projectId,
			$connectorToken,
			30,
			'AACsearch-WordPress/' . AACSEARCH_VERSION
		);
	}

	/**
	 * Perform a handshake with the AACsearch Connector API.
	 *
	 * @return bool True if handshake succeeded (status === 'active').
	 *
	 * @throws Exception
	 */
	public function handshake()
	{
		try {
			return $this->connector->handshake(AACSEARCH_VERSION, 'wordpress');
		} catch (AacsearchException $e) {
			throw new Exception($e->getMessage(), $e->getCode(), $e);
		}
	}

	/**
	 * Send a full sync of all documents.
	 *
	 * @param array $documents Array of ProductDocument arrays.
	 *
	 * @return bool True if sync succeeded.
	 *
	 * @throws Exception
	 */
	public function fullSync(array $documents)
	{
		try {
			return $this->connector->fullSync($documents);
		} catch (AacsearchException $e) {
			throw new Exception($e->getMessage(), $e->getCode(), $e);
		}
	}

	/**
	 * Send a delta sync of changed documents.
	 *
	 * @param array $documents Array of ProductDocument arrays.
	 *
	 * @return bool True if sync succeeded.
	 *
	 * @throws Exception
	 */
	public function deltaSync(array $documents)
	{
		try {
			return $this->connector->deltaSync($documents);
		} catch (AacsearchException $e) {
			throw new Exception($e->getMessage(), $e->getCode(), $e);
		}
	}

	/**
	 * Delete a single document from AACsearch by its external ID.
	 *
	 * @param string $externalId The document's external ID.
	 *
	 * @return bool True if deletion succeeded.
	 *
	 * @throws Exception
	 */
	public function deleteProduct($externalId)
	{
		try {
			return $this->connector->deleteProduct($externalId);
		} catch (AacsearchException $e) {
			throw new Exception($e->getMessage(), $e->getCode(), $e);
		}
	}

	/**
	 * Delete a batch of documents from AACsearch.
	 *
	 * @param array $externalIds Array of external document IDs to delete.
	 *
	 * @return int Total number of deleted documents.
	 *
	 * @throws Exception
	 */
	public function batchDelete(array $externalIds)
	{
		try {
			return $this->connector->batchDelete($externalIds);
		} catch (AacsearchException $e) {
			throw new Exception($e->getMessage(), $e->getCode(), $e);
		}
	}

	/**
	 * Send diagnostics data to AACsearch.
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

		try {
			return $this->connector->sendDiagnostics(array_merge($defaults, $diagnostics));
		} catch (AacsearchException $e) {
			throw new Exception($e->getMessage(), $e->getCode(), $e);
		}
	}

	/**
	 * Validate that the client has the minimum required configuration.
	 *
	 * @return bool
	 */
	public function isConfigured()
	{
		return $this->connector->isConfigured();
	}
}
