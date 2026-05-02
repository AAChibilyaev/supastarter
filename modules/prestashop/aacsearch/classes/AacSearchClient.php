<?php
/**
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * HTTP client adapter for the AACsearch Connector API.
 * Thin wrapper around the Aacsearch\ConnectorClient from the aacsearch-php SDK.
 * Replaces the previous standalone cURL implementation.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

// Load the aacsearch-php SDK
require_once dirname(__FILE__) . '/../lib/aacsearch/ConnectorClient.php';
require_once dirname(__FILE__) . '/../lib/aacsearch/Exceptions.php';

use Aacsearch\ConnectorClient;
use Aacsearch\AacsearchException;

class AacSearchClient
{
    /**
     * Underlying SDK ConnectorClient instance.
     *
     * @var ConnectorClient
     */
    protected $connector;

    /**
     * @param string $apiUrl         Base URL of the Connector API
     * @param string $projectId      AACsearch project ID
     * @param string $connectorToken ss_connector_* token
     */
    public function __construct($apiUrl, $projectId, $connectorToken)
    {
        $this->connector = new ConnectorClient(
            $apiUrl,
            $projectId,
            $connectorToken,
            30,
            'AACsearch-PrestaShop/1.0.0'
        );
    }

    /**
     * Perform a handshake with the AACsearch Connector API.
     *
     * @return bool True if handshake succeeded
     *
     * @throws Exception
     */
    public function handshake()
    {
        try {
            return $this->connector->handshake(
                defined('_PS_VERSION_') ? _PS_VERSION_ : 'unknown',
                'prestashop'
            );
        } catch (AacsearchException $e) {
            throw new Exception($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Send a full sync of all products.
     *
     * @param array $products Array of ProductDocument arrays
     *
     * @return bool True if sync succeeded
     *
     * @throws Exception
     */
    public function fullSync(array $products)
    {
        try {
            return $this->connector->fullSync($products);
        } catch (AacsearchException $e) {
            throw new Exception($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Send a delta sync of changed products.
     *
     * @param array $products Array of ProductDocument arrays
     *
     * @return bool True if sync succeeded
     *
     * @throws Exception
     */
    public function deltaSync(array $products)
    {
        try {
            return $this->connector->deltaSync($products);
        } catch (AacsearchException $e) {
            throw new Exception($e->getMessage(), $e->getCode(), $e);
        }
    }

    /**
     * Delete a product from AACsearch by its external ID.
     *
     * @param string $externalId The product's external ID
     *
     * @return bool True if deletion succeeded
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
     * Delete a batch of products from AACsearch.
     *
     * Accepts up to 500 IDs per API call; larger arrays are automatically
     * split into 500-item chunks.
     *
     * @param array $externalIds Array of external product IDs to delete
     *
     * @return int Total number of deleted documents
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
     * @param array $diagnostics Associative array of diagnostic data
     *
     * @return bool True if diagnostics were accepted
     *
     * @throws Exception
     */
    public function sendDiagnostics(array $diagnostics = [])
    {
        $defaults = [
            'moduleVersion' => defined('_PS_VERSION_') ? _PS_VERSION_ : 'unknown',
            'phpVersion'    => PHP_VERSION,
            'shopUrl'       => defined('Tools::getShopDomainSsl')
                ? Tools::getShopDomainSsl(true)
                : '',
            'totalProducts' => 0,
            'errors'        => [],
        ];

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
