<?php

/**
 * AAC Search Widget component (.description.php)
 */

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

use Bitrix\Main\Localization\Loc;

$arComponentDescription = [
    'NAME'        => Loc::getMessage('AAC_SEARCH_WIDGET_COMPONENT_NAME') ?: 'AAC Search Widget',
    'DESCRIPTION' => Loc::getMessage('AAC_SEARCH_WIDGET_COMPONENT_DESC') ?: 'Renders the AACsearch search widget on the site.',
    'ICON'        => '/images/icon.gif',
    'SORT'        => 10,
    'CACHE_PATH'  => 'Y',
    'PATH'        => [
        'ID'    => 'aac',
        'NAME'  => Loc::getMessage('AAC_SEARCH_COMPONENTS_GROUP') ?: 'AAC',
        'CHILD' => [
            'ID'   => 'search',
            'NAME' => Loc::getMessage('AAC_SEARCH_COMPONENTS_SUBGROUP') ?: 'Search',
        ],
    ],
];
