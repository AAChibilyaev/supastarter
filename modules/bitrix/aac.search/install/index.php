<?php

use Bitrix\Main\Application;
use Bitrix\Main\Config\Option;
use Bitrix\Main\EventManager;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\ModuleManager;

Loc::loadMessages(__FILE__);

class aac_search extends CModule
{
    public $MODULE_ID = 'aac.search';
    public $MODULE_VERSION;
    public $MODULE_VERSION_DATE;
    public $MODULE_NAME;
    public $MODULE_DESCRIPTION;
    public $MODULE_GROUP_RIGHTS = 'N';
    public $MODULE_CSS;
    public $PARTNER_NAME;
    public $PARTNER_URI;

    public function __construct()
    {
        $arModuleVersion = [];
        include __DIR__ . '/version.php';

        if (is_array($arModuleVersion) && isset($arModuleVersion['VERSION'])) {
            $this->MODULE_VERSION      = $arModuleVersion['VERSION'];
            $this->MODULE_VERSION_DATE = $arModuleVersion['VERSION_DATE'];
        }

        $this->MODULE_NAME        = Loc::getMessage('AAC_SEARCH_MODULE_NAME')
            ?: 'AAC Search: Connector for AACsearch';
        $this->MODULE_DESCRIPTION = Loc::getMessage('AAC_SEARCH_MODULE_DESCRIPTION')
            ?: 'Synchronizes catalog products with AACsearch search engine via Connector API.';

        $this->PARTNER_NAME = Loc::getMessage('AAC_SEARCH_PARTNER_NAME') ?: 'AAC';
        $this->PARTNER_URI  = Loc::getMessage('AAC_SEARCH_PARTNER_URI') ?: 'https://aacsearch.example.com';
    }

    /**
     * Install database tables.
     */
    public function InstallDB(): bool
    {
        global $DB, $APPLICATION;

        ModuleManager::registerModule($this->MODULE_ID);

        $db = Application::getConnection();

        if (!$db->isTableExists('b_aac_search_sync_log')) {
            $db->queryExecute(
                "CREATE TABLE IF NOT EXISTS b_aac_search_sync_log (
                    ID INT NOT NULL AUTO_INCREMENT,
                    SYNC_TYPE VARCHAR(32) NOT NULL DEFAULT 'full',
                    STATUS VARCHAR(32) NOT NULL DEFAULT 'pending',
                    STARTED_AT DATETIME DEFAULT NULL,
                    FINISHED_AT DATETIME DEFAULT NULL,
                    PRODUCTS_COUNT INT DEFAULT 0,
                    ERROR_MESSAGE TEXT DEFAULT NULL,
                    CREATED_AT DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (ID),
                    INDEX IX_AAC_SEARCH_SYNC_LOG_TYPE (SYNC_TYPE),
                    INDEX IX_AAC_SEARCH_SYNC_LOG_STATUS (STATUS)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        }

        if (!$db->isTableExists('b_aac_search_sync_error')) {
            $db->queryExecute(
                "CREATE TABLE IF NOT EXISTS b_aac_search_sync_error (
                    ID INT NOT NULL AUTO_INCREMENT,
                    SYNC_LOG_ID INT DEFAULT NULL,
                    PRODUCT_ID INT DEFAULT NULL,
                    ERROR_CODE VARCHAR(64) NOT NULL DEFAULT '',
                    ERROR_MESSAGE TEXT NOT NULL,
                    CREATED_AT DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (ID),
                    INDEX IX_AAC_SEARCH_SYNC_ERR_LOG (SYNC_LOG_ID)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        }

        return true;
    }

    /**
     * Uninstall database tables.
     */
    public function UnInstallDB(): bool
    {
        global $DB, $APPLICATION;

        $db = Application::getConnection();

        $db->queryExecute('DROP TABLE IF EXISTS b_aac_search_sync_error');
        $db->queryExecute('DROP TABLE IF EXISTS b_aac_search_sync_log');

        Option::delete($this->MODULE_ID);

        ModuleManager::unRegisterModule($this->MODULE_ID);

        return true;
    }

    /**
     * Install event handlers.
     */
    public function InstallEvents(): bool
    {
        $eventManager = EventManager::getInstance();

        // Iblock element events
        $eventManager->registerEventHandler(
            'iblock',
            'OnAfterIBlockElementAdd',
            $this->MODULE_ID,
            \AAC\Search\EventHandlers::class,
            'onAfterIBlockElementAdd',
        );

        $eventManager->registerEventHandler(
            'iblock',
            'OnAfterIBlockElementUpdate',
            $this->MODULE_ID,
            \AAC\Search\EventHandlers::class,
            'onAfterIBlockElementUpdate',
        );

        $eventManager->registerEventHandler(
            'iblock',
            'OnAfterIBlockElementDelete',
            $this->MODULE_ID,
            \AAC\Search\EventHandlers::class,
            'onAfterIBlockElementDelete',
        );

        return true;
    }

    /**
     * Uninstall event handlers.
     */
    public function UnInstallEvents(): bool
    {
        $eventManager = EventManager::getInstance();

        $eventManager->unRegisterEventHandler(
            'iblock',
            'OnAfterIBlockElementAdd',
            $this->MODULE_ID,
            \AAC\Search\EventHandlers::class,
            'onAfterIBlockElementAdd',
        );

        $eventManager->unRegisterEventHandler(
            'iblock',
            'OnAfterIBlockElementUpdate',
            $this->MODULE_ID,
            \AAC\Search\EventHandlers::class,
            'onAfterIBlockElementUpdate',
        );

        $eventManager->unRegisterEventHandler(
            'iblock',
            'OnAfterIBlockElementDelete',
            $this->MODULE_ID,
            \AAC\Search\EventHandlers::class,
            'onAfterIBlockElementDelete',
        );

        return true;
    }

    /**
     * Install files (admin pages, components, assets).
     */
    public function InstallFiles(): bool
    {
        CopyDirFiles(
            __DIR__ . '/admin',
            $_SERVER['DOCUMENT_ROOT'] . '/bitrix/admin',
            true,
            true,
        );

        CopyDirFiles(
            __DIR__ . '/components',
            $_SERVER['DOCUMENT_ROOT'] . '/bitrix/components',
            true,
            true,
        );

        return true;
    }

    /**
     * Uninstall files.
     */
    public function UnInstallFiles(): bool
    {
        // Remove admin symlinks/pages
        DeleteDirFiles(
            __DIR__ . '/admin',
            $_SERVER['DOCUMENT_ROOT'] . '/bitrix/admin',
        );

        // Remove component directory
        $componentDir = $_SERVER['DOCUMENT_ROOT']
            . '/bitrix/components/aac/search.widget';
        if (file_exists($componentDir)) {
            DeleteDirFilesEx('/bitrix/components/aac/search.widget');
        }

        return true;
    }

    /**
     * Register agents.
     */
    public function InstallAgents(): bool
    {
        $agentName = \AAC\Search\SyncAgent::getAgentName();

        \CAgent::AddAgent(
            $agentName,
            $this->MODULE_ID,
            'N',
            (int) Option::get($this->MODULE_ID, 'sync_interval', 3600),
            '',
            'Y',
            '',
            100,
        );

        return true;
    }

    /**
     * Uninstall agents.
     */
    public function UnInstallAgents(): bool
    {
        $agentName = \AAC\Search\SyncAgent::getAgentName();

        \CAgent::RemoveModuleAgents($this->MODULE_ID);

        return true;
    }

    /**
     * Full install.
     */
    public function DoInstall(): void
    {
        global $APPLICATION;

        if (!IsModuleInstalled($this->MODULE_ID)) {
            $this->InstallDB();
            $this->InstallFiles();
            $this->InstallEvents();
            $this->InstallAgents();
        }

        $APPLICATION->IncludeAdminFile(
            Loc::getMessage('AAC_SEARCH_INSTALL_TITLE')
                ?: 'Installation of AAC Search module',
            __DIR__ . '/step_install.php',
        );
    }

    /**
     * Full uninstall.
     */
    public function DoUninstall(): void
    {
        global $APPLICATION;

        $context = Application::getInstance()->getContext();
        $request = $context->getRequest();

        if ($request->get('step') < 2) {
            $APPLICATION->IncludeAdminFile(
                Loc::getMessage('AAC_SEARCH_UNINSTALL_TITLE')
                    ?: 'Uninstallation of AAC Search module',
                __DIR__ . '/step_uninstall.php',
            );
            return;
        }

        $saveData = $request->get('savedata') === 'Y';

        $this->UnInstallAgents();
        $this->UnInstallEvents();

        if (!$saveData) {
            $this->UnInstallDB();
        }

        $this->UnInstallFiles();
    }
}
