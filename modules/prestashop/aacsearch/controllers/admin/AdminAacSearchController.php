<?php
/**
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * Admin controller for the AACsearch module settings page.
 * Provides a dedicated interface for configuration, manual sync,
 * and diagnostics.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class AdminAacSearchController extends ModuleAdminController
{
    /**
     * @var Aacsearch
     */
    public $module;

    public function __construct()
    {
        parent::__construct();

        $this->bootstrap = true;
        $this->display = 'view';
        $this->meta_title = $this->l('AACsearch');
    }

    /**
     * Render the settings view.
     *
     * @return string
     */
    public function renderView()
    {
        $output = '';

        // Handle configuration save
        if (Tools::isSubmit('submitAacsearchConfig')) {
            $output .= $this->saveConfiguration();
        }

        // Handle full sync
        if (Tools::isSubmit('submitAacsearchFullSync')) {
            $output .= $this->executeFullSync();
        }

        // Handle diagnostics
        if (Tools::isSubmit('submitAacsearchDiagnostics')) {
            $output .= $this->sendDiagnostics();
        }

        $output .= $this->renderConfigurationForm();
        $output .= $this->renderActionPanel();

        return $output;
    }

    /**
     * Save configuration values submitted from the form.
     *
     * @return string
     */
    protected function saveConfiguration()
    {
        $apiUrl = Tools::getValue('AACSEARCH_API_URL');
        $projectId = Tools::getValue('AACSEARCH_PROJECT_ID');
        $connectorToken = Tools::getValue('AACSEARCH_CONNECTOR_TOKEN');
        $syncEnabled = Tools::getValue('AACSEARCH_SYNC_ENABLED', '0');
        $widgetEnabled = Tools::getValue('AACSEARCH_WIDGET_ENABLED', '0');
        $locale = Tools::getValue('AACSEARCH_LOCALE', 'en');
        $currency = Tools::getValue('AACSEARCH_CURRENCY', 'USD');
        $batchSize = (int) Tools::getValue('AACSEARCH_BATCH_SIZE', 50);
        $debugMode = Tools::getValue('AACSEARCH_DEBUG_MODE', '0');

        if ($batchSize < 1) {
            $batchSize = 50;
        }

        Configuration::updateValue('AACSEARCH_API_URL', $apiUrl);
        Configuration::updateValue('AACSEARCH_PROJECT_ID', $projectId);
        Configuration::updateValue('AACSEARCH_CONNECTOR_TOKEN', $connectorToken);
        Configuration::updateValue('AACSEARCH_SYNC_ENABLED', $syncEnabled);
        Configuration::updateValue('AACSEARCH_WIDGET_ENABLED', $widgetEnabled);
        Configuration::updateValue('AACSEARCH_LOCALE', $locale);
        Configuration::updateValue('AACSEARCH_CURRENCY', $currency);
        Configuration::updateValue('AACSEARCH_BATCH_SIZE', (string) $batchSize);
        Configuration::updateValue('AACSEARCH_DEBUG_MODE', $debugMode);

        $this->confirmations[] = $this->l('Settings saved successfully.');
        $this->module->logDebug('Configuration updated via AdminAacSearchController.');

        return '';
    }

    /**
     * Execute a full product sync.
     *
     * @return string
     */
    protected function executeFullSync()
    {
        $result = $this->module->executeFullSync();

        if ($result['success']) {
            $this->confirmations[] = $result['message'];
        } else {
            $this->errors[] = $result['message'];
        }

        return '';
    }

    /**
     * Send diagnostics data to AACsearch.
     *
     * @return string
     */
    protected function sendDiagnostics()
    {
        try {
            $client = new AacSearchClient(
                Configuration::get('AACSEARCH_API_URL'),
                Configuration::get('AACSEARCH_PROJECT_ID'),
                Configuration::get('AACSEARCH_CONNECTOR_TOKEN')
            );

            $diagnostics = [
                'module_version' => $this->module->version,
                'prestashop_version' => _PS_VERSION_,
                'php_version' => PHP_VERSION,
                'shop_name' => Configuration::get('PS_SHOP_NAME'),
                'shop_url' => Tools::getShopDomainSsl(true),
                'products_count' => (int) Db::getInstance()->getValue(
                    'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'product` WHERE `active` = 1'
                ),
                'categories_count' => (int) Db::getInstance()->getValue(
                    'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'category`'
                ),
                'sync_enabled' => (bool) Configuration::get('AACSEARCH_SYNC_ENABLED'),
                'widget_enabled' => (bool) Configuration::get('AACSEARCH_WIDGET_ENABLED'),
                'locale' => Configuration::get('AACSEARCH_LOCALE'),
                'currency' => Configuration::get('AACSEARCH_CURRENCY'),
                'batch_size' => (int) Configuration::get('AACSEARCH_BATCH_SIZE'),
            ];

            $result = $client->sendDiagnostics($diagnostics);

            if ($result) {
                $this->confirmations[] = $this->l('Diagnostics sent successfully.');
            } else {
                $this->errors[] = $this->l('Failed to send diagnostics.');
            }
        } catch (Exception $e) {
            $this->errors[] = $this->l('Diagnostics error: ') . $e->getMessage();
        }

        return '';
    }

    /**
     * Render the configuration form using HelperForm.
     *
     * @return string
     */
    protected function renderConfigurationForm()
    {
        $helper = new HelperForm();

        $helper->module = $this->module;
        $helper->name_controller = 'AdminAacSearch';
        $helper->token = Tools::getAdminTokenLite('AdminAacSearch');
        $helper->currentIndex = self::$currentIndex;
        $helper->title = $this->l('AACsearch Settings');
        $helper->submit_action = 'submitAacsearchConfig';
        $helper->default_form_language = (int) Configuration::get('PS_LANG_DEFAULT');

        $helper->fields_value = [
            'AACSEARCH_API_URL'         => Configuration::get('AACSEARCH_API_URL'),
            'AACSEARCH_PROJECT_ID'      => Configuration::get('AACSEARCH_PROJECT_ID'),
            'AACSEARCH_CONNECTOR_TOKEN' => Configuration::get('AACSEARCH_CONNECTOR_TOKEN'),
            'AACSEARCH_SYNC_ENABLED'    => Configuration::get('AACSEARCH_SYNC_ENABLED'),
            'AACSEARCH_WIDGET_ENABLED'  => Configuration::get('AACSEARCH_WIDGET_ENABLED'),
            'AACSEARCH_LOCALE'          => Configuration::get('AACSEARCH_LOCALE'),
            'AACSEARCH_CURRENCY'        => Configuration::get('AACSEARCH_CURRENCY'),
            'AACSEARCH_BATCH_SIZE'      => Configuration::get('AACSEARCH_BATCH_SIZE'),
            'AACSEARCH_DEBUG_MODE'      => Configuration::get('AACSEARCH_DEBUG_MODE'),
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
                        'name' => 'AACSEARCH_API_URL',
                        'required' => true,
                        'desc' => $this->l('The base URL of the AACsearch Connector API.'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Project ID'),
                        'name' => 'AACSEARCH_PROJECT_ID',
                        'required' => true,
                        'desc' => $this->l('Your AACsearch project identifier.'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Connector Token'),
                        'name' => 'AACSEARCH_CONNECTOR_TOKEN',
                        'required' => true,
                        'desc' => $this->l('The ss_connector_* token for API authentication.'),
                    ],
                    [
                        'type' => 'switch',
                        'label' => $this->l('Sync Enabled'),
                        'name' => 'AACSEARCH_SYNC_ENABLED',
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
                        'name' => 'AACSEARCH_WIDGET_ENABLED',
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
                        'name' => 'AACSEARCH_LOCALE',
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
                        'name' => 'AACSEARCH_CURRENCY',
                        'required' => true,
                        'desc' => $this->l('Default currency ISO code (e.g., USD, EUR, GBP).'),
                    ],
                    [
                        'type' => 'text',
                        'label' => $this->l('Batch Size'),
                        'name' => 'AACSEARCH_BATCH_SIZE',
                        'required' => true,
                        'desc' => $this->l('Number of products to export per batch.'),
                    ],
                    [
                        'type' => 'switch',
                        'label' => $this->l('Debug Mode'),
                        'name' => 'AACSEARCH_DEBUG_MODE',
                        'is_bool' => true,
                        'values' => [
                            ['id' => 'active_on', 'value' => 1, 'label' => $this->l('Yes')],
                            ['id' => 'active_off', 'value' => 0, 'label' => $this->l('No')],
                        ],
                        'desc' => $this->l('Enable verbose logging for troubleshooting.'),
                    ],
                ],
                'submit' => [
                    'title' => $this->l('Save Settings'),
                    'class' => 'btn btn-primary',
                ],
            ],
        ];

        return $helper->generateForm([$form]);
    }

    /**
     * Render the action buttons panel for manual sync and diagnostics.
     *
     * @return string
     */
    protected function renderActionPanel()
    {
        $this->context->smarty->assign([
            'aacsearch_action_url' => self::$currentIndex . '&token=' . Tools::getAdminTokenLite('AdminAacSearch'),
        ]);

        return $this->context->smarty->fetch(
            $this->module->getLocalPath() . 'views/templates/admin/configure.tpl'
        );
    }

    /**
     * Set the media for this controller.
     */
    public function setMedia($isNewTheme = false)
    {
        parent::setMedia($isNewTheme);

        $this->addCSS($this->module->getPathUri() . 'views/css/admin.css');
        $this->addJS($this->module->getPathUri() . 'views/js/admin.js');
    }
}
