<?php
/**
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * Syncs PrestaShop product data to AACsearch via the Connector API.
 * Handles full sync, delta sync, product deletion, diagnostics, and
 * front-end widget injection.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class Aacsearch extends Module
{
    /**
     * Configuration keys stored in PS Configuration table.
     */
    const CFG_API_URL        = 'AACSEARCH_API_URL';
    const CFG_PROJECT_ID     = 'AACSEARCH_PROJECT_ID';
    const CFG_CONNECTOR_TOKEN = 'AACSEARCH_CONNECTOR_TOKEN';
    const CFG_SYNC_ENABLED   = 'AACSEARCH_SYNC_ENABLED';
    const CFG_WIDGET_ENABLED = 'AACSEARCH_WIDGET_ENABLED';
    const CFG_LOCALE         = 'AACSEARCH_LOCALE';
    const CFG_CURRENCY       = 'AACSEARCH_CURRENCY';
    const CFG_BATCH_SIZE     = 'AACSEARCH_BATCH_SIZE';
    const CFG_DEBUG_MODE     = 'AACSEARCH_DEBUG_MODE';

    /**
     * Default batch size for product export.
     */
    const DEFAULT_BATCH_SIZE = 50;

    public function __construct()
    {
        $this->name = 'aacsearch';
        $this->tab = 'advertising_marketing';
        $this->version = '1.1.0';
        $this->author = 'AACsearch';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = [
            'min' => '8.0.0',
            'max' => _PS_VERSION_,
        ];
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('AACsearch Connector');
        $this->description = $this->l('Syncs PrestaShop product data to AACsearch via the Connector API.');

        $this->confirmUninstall = $this->l('Are you sure you want to uninstall AACsearch Connector? All configuration will be lost.');

        require_once dirname(__FILE__) . '/classes/AacSearchClient.php';
        require_once dirname(__FILE__) . '/classes/AacSearchProductExporter.php';
        require_once dirname(__FILE__) . '/classes/AacSearchSyncQueue.php';
    }

    /**
     * Install the module.
     *
     * @return bool
     */
    public function install()
    {
        return parent::install()
            && $this->registerHook('displayHeader')
            && $this->registerHook('actionProductUpdate')
            && $this->registerHook('actionObjectProductDeleteAfter')
            && $this->registerHook('actionUpdateQuantity')
            && $this->installConfiguration()
            && $this->installTab();
    }

    /**
     * Uninstall the module.
     *
     * @return bool
     */
    public function uninstall()
    {
        return $this->uninstallTab()
            && $this->uninstallConfiguration()
            && parent::uninstall();
    }

    /**
     * Install default configuration values.
     *
     * @return bool
     */
    protected function installConfiguration()
    {
        return Configuration::updateValue(self::CFG_API_URL, 'https://api.example.com')
            && Configuration::updateValue(self::CFG_PROJECT_ID, '')
            && Configuration::updateValue(self::CFG_CONNECTOR_TOKEN, '')
            && Configuration::updateValue(self::CFG_SYNC_ENABLED, '0')
            && Configuration::updateValue(self::CFG_WIDGET_ENABLED, '0')
            && Configuration::updateValue(self::CFG_LOCALE, 'en')
            && Configuration::updateValue(self::CFG_CURRENCY, 'USD')
            && Configuration::updateValue(self::CFG_BATCH_SIZE, (string) self::DEFAULT_BATCH_SIZE)
            && Configuration::updateValue(self::CFG_DEBUG_MODE, '0')
            && Configuration::updateValue('AACSEARCH_LAST_FULL_SYNC', '')
            && Configuration::updateValue('AACSEARCH_LAST_DELTA_SYNC', '');
    }

    /**
     * Remove all configuration values.
     *
     * @return bool
     */
    protected function uninstallConfiguration()
    {
        return Configuration::deleteByName(self::CFG_API_URL)
            && Configuration::deleteByName(self::CFG_PROJECT_ID)
            && Configuration::deleteByName(self::CFG_CONNECTOR_TOKEN)
            && Configuration::deleteByName(self::CFG_SYNC_ENABLED)
            && Configuration::deleteByName(self::CFG_WIDGET_ENABLED)
            && Configuration::deleteByName(self::CFG_LOCALE)
            && Configuration::deleteByName(self::CFG_CURRENCY)
            && Configuration::deleteByName(self::CFG_BATCH_SIZE)
            && Configuration::deleteByName(self::CFG_DEBUG_MODE)
            && Configuration::deleteByName('AACSEARCH_LAST_FULL_SYNC')
            && Configuration::deleteByName('AACSEARCH_LAST_DELTA_SYNC');
    }

    /**
     * Install the admin controller tab under SELL > Catalog.
     *
     * @return bool
     */
    protected function installTab()
    {
        $tab = new Tab();
        $tab->active = 1;
        $tab->class_name = 'AdminAacSearch';
        $tab->name = [];

        foreach (Language::getLanguages(true) as $lang) {
            $tab->name[$lang['id_lang']] = 'AACsearch';
        }

        $tab->id_parent = (int) Tab::getIdFromClassName('AdminCatalog');
        $tab->module = $this->name;

        return $tab->add();
    }

    /**
     * Uninstall the admin controller tab.
     *
     * @return bool
     */
    protected function uninstallTab()
    {
        $tabId = (int) Tab::getIdFromClassName('AdminAacSearch');
        if (!$tabId) {
            return true;
        }

        $tab = new Tab($tabId);

        return $tab->delete();
    }

    /**
     * Return the module's configuration form content.
     *
     * @return string
     */
    public function getContent()
    {
        $output = '';

        if (Tools::isSubmit('submit' . $this->name)) {
            $output .= $this->handleConfigurationSubmit();
        }

        if (Tools::isSubmit('submitAacsearchSync')) {
            $output .= $this->handleSyncAction();
        }

        if (Tools::isSubmit('submitAacsearchDiagnostics')) {
            $output .= $this->handleDiagnosticsAction();
        }

        return $output . $this->renderConfigurationForm();
    }

    /**
     * Handle configuration form submission.
     *
     * @return string HTML success/error message
     */
    protected function handleConfigurationSubmit()
    {
        $apiUrl = Tools::getValue(self::CFG_API_URL);
        $projectId = Tools::getValue(self::CFG_PROJECT_ID);
        $connectorToken = Tools::getValue(self::CFG_CONNECTOR_TOKEN);
        $syncEnabled = Tools::getValue(self::CFG_SYNC_ENABLED, '0');
        $widgetEnabled = Tools::getValue(self::CFG_WIDGET_ENABLED, '0');
        $locale = Tools::getValue(self::CFG_LOCALE, 'en');
        $currency = Tools::getValue(self::CFG_CURRENCY, 'USD');
        $batchSize = (int) Tools::getValue(self::CFG_BATCH_SIZE, self::DEFAULT_BATCH_SIZE);
        $debugMode = Tools::getValue(self::CFG_DEBUG_MODE, '0');

        if ($batchSize < 1) {
            $batchSize = self::DEFAULT_BATCH_SIZE;
        }

        Configuration::updateValue(self::CFG_API_URL, $apiUrl);
        Configuration::updateValue(self::CFG_PROJECT_ID, $projectId);
        Configuration::updateValue(self::CFG_CONNECTOR_TOKEN, $connectorToken);
        Configuration::updateValue(self::CFG_SYNC_ENABLED, $syncEnabled);
        Configuration::updateValue(self::CFG_WIDGET_ENABLED, $widgetEnabled);
        Configuration::updateValue(self::CFG_LOCALE, $locale);
        Configuration::updateValue(self::CFG_CURRENCY, $currency);
        Configuration::updateValue(self::CFG_BATCH_SIZE, (string) $batchSize);
        Configuration::updateValue(self::CFG_DEBUG_MODE, $debugMode);

        return $this->displayConfirmation($this->l('Settings saved successfully.'));
    }

    /**
     * Handle manual sync action submission.
     *
     * @return string HTML success/error message
     */
    protected function handleSyncAction()
    {
        $client = new AacSearchClient(
            Configuration::get(self::CFG_API_URL),
            Configuration::get(self::CFG_PROJECT_ID),
            Configuration::get(self::CFG_CONNECTOR_TOKEN)
        );

        try {
            // Perform handshake first
            $handshakeResult = $client->handshake();
            if (!$handshakeResult) {
                return $this->displayError($this->l('Handshake with AACsearch API failed. Check your credentials.'));
            }

            // Export products and run full sync
            $exporter = new AacSearchProductExporter(
                (int) Configuration::get(self::CFG_BATCH_SIZE),
                Configuration::get(self::CFG_LOCALE),
                Configuration::get(self::CFG_CURRENCY)
            );

            $products = $exporter->exportAll();
            $syncResult = $client->fullSync($products);

            if ($syncResult) {
                Configuration::updateValue('AACSEARCH_LAST_FULL_SYNC', date('c'));
                return $this->displayConfirmation(
                    $this->l('Full sync completed successfully.') . ' ' .
                    sprintf($this->l('%d products exported.'), count($products))
                );
            }

            return $this->displayError($this->l('Full sync failed. Check debug logs for details.'));
        } catch (Exception $e) {
            $this->logError('Manual sync error: ' . $e->getMessage());

            return $this->displayError($this->l('Sync error: ') . $e->getMessage());
        }
    }

    /**
     * Handle diagnostics action submission.
     *
     * @return string HTML success/error message
     */
    protected function handleDiagnosticsAction()
    {
        $client = new AacSearchClient(
            Configuration::get(self::CFG_API_URL),
            Configuration::get(self::CFG_PROJECT_ID),
            Configuration::get(self::CFG_CONNECTOR_TOKEN)
        );

        try {
            $diagnostics = [
                'lastFullSync'  => Configuration::get('AACSEARCH_LAST_FULL_SYNC', ''),
                'lastDeltaSync' => Configuration::get('AACSEARCH_LAST_DELTA_SYNC', ''),
                'totalProducts' => (int) Db::getInstance()->getValue(
                    'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'product` WHERE `active` = 1'
                ),
                'errors'        => [],
            ];

            $result = $client->sendDiagnostics($diagnostics);

            if ($result) {
                return $this->displayConfirmation($this->l('Diagnostics sent successfully.'));
            }

            return $this->displayError($this->l('Failed to send diagnostics.'));
        } catch (Exception $e) {
            $this->logError('Diagnostics error: ' . $e->getMessage());

            return $this->displayError($this->l('Diagnostics error: ') . $e->getMessage());
        }
    }

    /**
     * Render the configuration form using HelperForm.
     *
     * @return string
     */
    protected function renderConfigurationForm()
    {
        $helper = new HelperForm();

        $helper->module = $this;
        $helper->name_controller = $this->name;
        $helper->token = Tools::getAdminTokenLite('AdminModules');
        $helper->currentIndex = AdminController::$currentIndex . '&configure=' . $this->name;
        $helper->title = $this->displayName;
        $helper->submit_action = 'submit' . $this->name;
        $helper->default_form_language = (int) Configuration::get('PS_LANG_DEFAULT');

        $helper->fields_value = [
            self::CFG_API_URL         => Configuration::get(self::CFG_API_URL),
            self::CFG_PROJECT_ID      => Configuration::get(self::CFG_PROJECT_ID),
            self::CFG_CONNECTOR_TOKEN => Configuration::get(self::CFG_CONNECTOR_TOKEN),
            self::CFG_SYNC_ENABLED    => Configuration::get(self::CFG_SYNC_ENABLED),
            self::CFG_WIDGET_ENABLED  => Configuration::get(self::CFG_WIDGET_ENABLED),
            self::CFG_LOCALE          => Configuration::get(self::CFG_LOCALE),
            self::CFG_CURRENCY        => Configuration::get(self::CFG_CURRENCY),
            self::CFG_BATCH_SIZE      => Configuration::get(self::CFG_BATCH_SIZE),
            self::CFG_DEBUG_MODE      => Configuration::get(self::CFG_DEBUG_MODE),
        ];

        $form = [
            'form' => [
                'legend' => [
                    'title' => $this->l('API Configuration'),
                    'icon' => 'icon-cogs',
                ],
                'input' => [
                    [
                        'type' => 'text',
                        'label' => $this->l('API URL'),
                        'name' => self::CFG_API_URL,
                        'required' => true,
                        'desc' => $this->l('The base URL of the AACsearch Connector API (e.g., https://api.example.com).'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Project ID'),
                        'name' => self::CFG_PROJECT_ID,
                        'required' => true,
                        'desc' => $this->l('Your AACsearch project identifier.'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Connector Token'),
                        'name' => self::CFG_CONNECTOR_TOKEN,
                        'required' => true,
                        'desc' => $this->l('The ss_connector_* token for API authentication.'),
                    ],
                    [
                        'type' => 'switch',
                        'label' => $this->l('Sync Enabled'),
                        'name' => self::CFG_SYNC_ENABLED,
                        'is_bool' => true,
                        'values' => [
                            ['id' => 'active_on', 'value' => 1, 'label' => $this->l('Yes')],
                            ['id' => 'active_off', 'value' => 0, 'label' => $this->l('No')],
                        ],
                        'desc' => $this->l('Enable automatic product synchronization on updates.'),
                    ],
                    [
                        'type' => 'switch',
                        'label' => $this->l('Widget Enabled'),
                        'name' => self::CFG_WIDGET_ENABLED,
                        'is_bool' => true,
                        'values' => [
                            ['id' => 'active_on', 'value' => 1, 'label' => $this->l('Yes')],
                            ['id' => 'active_off', 'value' => 0, 'label' => $this->l('No')],
                        ],
                        'desc' => $this->l('Inject the AACsearch widget on the front-end.'),
                    ],
                    [
                        'type' => 'select',
                        'label' => $this->l('Locale'),
                        'name' => self::CFG_LOCALE,
                        'required' => true,
                        'options' => [
                            'query' => [
                                ['id' => 'en', 'name' => 'English'],
                                ['id' => 'de', 'name' => 'Deutsch'],
                                ['id' => 'es', 'name' => 'Español'],
                                ['id' => 'fr', 'name' => 'Français'],
                                ['id' => 'ru', 'name' => 'Русский'],
                            ],
                            'id' => 'id',
                            'name' => 'name',
                        ],
                        'desc' => $this->l('Default locale for product export and widget.'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Currency'),
                        'name' => self::CFG_CURRENCY,
                        'required' => true,
                        'desc' => $this->l('Default currency ISO code (e.g., USD, EUR, GBP).'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Batch Size'),
                        'name' => self::CFG_BATCH_SIZE,
                        'required' => true,
                        'desc' => $this->l('Number of products to export per batch.'),
                    ],
                    [
                        'type' => 'switch',
                        'label' => $this->l('Debug Mode'),
                        'name' => self::CFG_DEBUG_MODE,
                        'is_bool' => true,
                        'values' => [
                            ['id' => 'active_on', 'value' => 1, 'label' => $this->l('Yes')],
                            ['id' => 'active_off', 'value' => 0, 'label' => $this->l('No')],
                        ],
                        'desc' => $this->l('Enable verbose logging for troubleshooting.'),
                    ],
                ],
                'submit' => [
                    'title' => $this->l('Save'),
                    'class' => 'btn btn-default pull-right',
                ],
            ],
        ];

        return $helper->generateForm([$form]);
    }

    /**
     * Hook: displayHeader — injects widget assets on front-end.
     *
     * @param array $params
     */
    public function hookDisplayHeader($params)
    {
        if (!Configuration::get(self::CFG_WIDGET_ENABLED)) {
            return '';
        }

        $controller = $this->context->controller;
        $widgetEnabled = Configuration::get(self::CFG_WIDGET_ENABLED);

        if ($widgetEnabled && $controller instanceof FrontController) {
            $this->context->smarty->assign([
                'aacsearch_widget_enabled' => true,
                'aacsearch_project_id' => Configuration::get(self::CFG_PROJECT_ID),
                'aacsearch_api_url' => Configuration::get(self::CFG_API_URL),
                'aacsearch_locale' => Configuration::get(self::CFG_LOCALE),
            ]);

            return $this->fetch('module:aacsearch/views/templates/hook/widget.tpl');
        }

        return '';
    }

    /**
     * Hook: actionProductUpdate — triggered when a product is updated.
     *
     * @param array $params
     */
    public function hookActionProductUpdate($params)
    {
        if (!Configuration::get(self::CFG_SYNC_ENABLED)) {
            return;
        }

        $productId = (int) $params['id_product'];
        if (!$productId) {
            return;
        }

        $this->syncSingleProduct($productId);
    }

    /**
     * Hook: actionObjectProductDeleteAfter — triggered after product deletion.
     *
     * @param array $params
     */
    public function hookActionObjectProductDeleteAfter($params)
    {
        if (!Configuration::get(self::CFG_SYNC_ENABLED)) {
            return;
        }

        /** @var Product $product */
        $product = $params['object'];
        $externalId = (int) $product->id;

        try {
            $client = $this->createClient();
            $client->deleteProduct((string) $externalId);
            $this->logDebug('Deleted product ' . $externalId . ' from AACsearch.');
        } catch (Exception $e) {
            $this->logError('Failed to delete product ' . $externalId . ': ' . $e->getMessage());
        }
    }

    /**
     * Hook: actionUpdateQuantity — triggered when stock quantity changes.
     *
     * @param array $params
     */
    public function hookActionUpdateQuantity($params)
    {
        if (!Configuration::get(self::CFG_SYNC_ENABLED)) {
            return;
        }

        $productId = (int) $params['id_product'];
        if (!$productId) {
            return;
        }

        $this->syncSingleProduct($productId);
    }

    /**
     * Export and sync a single product to AACsearch.
     *
     * @param int $productId
     */
    protected function syncSingleProduct($productId)
    {
        try {
            $exporter = new AacSearchProductExporter(
                (int) Configuration::get(self::CFG_BATCH_SIZE),
                Configuration::get(self::CFG_LOCALE),
                Configuration::get(self::CFG_CURRENCY)
            );

            $productDocument = $exporter->exportSingle($productId);
            if (!$productDocument) {
                return;
            }

            $client = $this->createClient();
            $client->deltaSync([$productDocument]);
            Configuration::updateValue('AACSEARCH_LAST_DELTA_SYNC', date('c'));

            $this->logDebug('Delta synced product ' . $productId . ' to AACsearch.');
        } catch (Exception $e) {
            $this->logError('Failed to delta sync product ' . $productId . ': ' . $e->getMessage());
        }
    }

    /**
     * Create a configured API client instance.
     *
     * @return AacSearchClient
     */
    protected function createClient()
    {
        return new AacSearchClient(
            Configuration::get(self::CFG_API_URL),
            Configuration::get(self::CFG_PROJECT_ID),
            Configuration::get(self::CFG_CONNECTOR_TOKEN)
        );
    }

    /**
     * Log a debug message.
     *
     * @param string $message
     */
    protected function logDebug($message)
    {
        if (!Configuration::get(self::CFG_DEBUG_MODE)) {
            return;
        }

        PrestaShopLogger::addLog(
            '[AACsearch] ' . $message,
            1, // severity: 1 = info
            null,
            'Aacsearch',
            null,
            true
        );
    }

    /**
     * Log an error message.
     *
     * @param string $message
     */
    protected function logError($message)
    {
        PrestaShopLogger::addLog(
            '[AACsearch] ' . $message,
            3, // severity: 3 = error
            null,
            'Aacsearch',
            null,
            true
        );
    }

    /**
     * Execute a full sync via CLI or admin action.
     * Returns array with success flag and message.
     *
     * @return array
     */
    public function executeFullSync()
    {
        try {
            $client = $this->createClient();

            $handshakeResult = $client->handshake();
            if (!$handshakeResult) {
                return [
                    'success' => false,
                    'message' => $this->l('Handshake failed.'),
                ];
            }

            $exporter = new AacSearchProductExporter(
                (int) Configuration::get(self::CFG_BATCH_SIZE),
                Configuration::get(self::CFG_LOCALE),
                Configuration::get(self::CFG_CURRENCY)
            );

            $queue = new AacSearchSyncQueue();
            $batches = $exporter->exportBatches();

            foreach ($batches as $batchIndex => $products) {
                $queue->startBatch($batchIndex, count($products));
                $client->fullSync($products);
                $queue->completeBatch($batchIndex);

                $this->logDebug(sprintf(
                    'Full sync batch %d: %d products processed.',
                    $batchIndex + 1,
                    count($products)
                ));
            }

            Configuration::updateValue('AACSEARCH_LAST_FULL_SYNC', date('c'));

            return [
                'success' => true,
                'message' => $this->l('Full sync completed.'),
            ];
        } catch (Exception $e) {
            $this->logError('Full sync error: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
