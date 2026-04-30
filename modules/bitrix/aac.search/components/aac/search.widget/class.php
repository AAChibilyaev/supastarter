<?php

/**
 * Component class for AAC Search Widget.
 */

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

use Bitrix\Main\Loader;

class AACSearchWidgetComponent extends \CBitrixComponent
{
    public function onPrepareComponentParams($arParams): array
    {
        $arParams['WIDGET_PLACEMENT'] = $arParams['WIDGET_PLACEMENT']
            ?? \Bitrix\Main\Config\Option::get('aac.search', 'widget_placement', 'auto');

        $arParams['WIDGET_THEME'] = $arParams['WIDGET_THEME']
            ?? \Bitrix\Main\Config\Option::get('aac.search', 'widget_theme', 'light');

        $arParams['WIDGET_LOCALE'] = $arParams['WIDGET_LOCALE']
            ?? \Bitrix\Main\Config\Option::get('aac.search', 'widget_locale', 'en');

        return $arParams;
    }

    public function executeComponent(): void
    {
        if (!Loader::includeModule('aac.search')) {
            ShowError('AAC Search module not installed.');
            return;
        }

        $this->includeComponentTemplate();
    }
}
