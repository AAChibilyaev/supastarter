<?php

/**
 * Normalizes Bitrix catalog products into the ProductDocument schema
 * expected by the AACsearch Connector API.
 */
namespace AAC\Search;

use Bitrix\Main\Config\Option;
use Bitrix\Main\Loader;
use Bitrix\Main\Type\DateTime;
use CCatalogProduct;
use CCurrencyLang;
use CIBlockElement;
use CIBlockSection;

class ProductExporter
{
    private const MODULE_ID = 'aac.search';

    private array  $iblockIds;
    private string $baseCurrency;
    private string $priceType;

    public function __construct()
    {
        $iblockIdsRaw = Option::get(self::MODULE_ID, 'iblock_ids', '');
        $this->iblockIds = array_filter(
            array_map('intval', explode(',', $iblockIdsRaw)),
        );

        $this->baseCurrency = (string) Option::get(self::MODULE_ID, 'base_currency', 'USD');
        $this->priceType    = (string) Option::get(self::MODULE_ID, 'price_type', 'BASE');
    }

    /**
     * Return all configured iblock IDs.
     *
     * @return int[]
     */
    public function getIblockIds(): array
    {
        return $this->iblockIds;
    }

    /**
     * Export all products from configured catalogs as an array of ProductDocument arrays.
     *
     * @return array<int, array>
     */
    public function exportAll(): array
    {
        if (empty($this->iblockIds)) {
            return [];
        }

        if (!Loader::includeModule('iblock') || !Loader::includeModule('catalog')) {
            return [];
        }

        $products = [];

        foreach ($this->iblockIds as $iblockId) {
            $items = $this->fetchProducts($iblockId);
            foreach ($items as $item) {
                $products[] = $this->normalize($item);
            }
        }

        return $products;
    }

    /**
     * Export a single product by its element ID.
     *
     * @param int $elementId
     * @return array|null Normalized product, or null if not found.
     */
    public function exportOne(int $elementId): ?array
    {
        if (!Loader::includeModule('iblock') || !Loader::includeModule('catalog')) {
            return null;
        }

        $item = $this->fetchProductById($elementId);
        if ($item === null) {
            return null;
        }

        return $this->normalize($item);
    }

    // ─── Data fetching ────────────────────────────────────────────

    /**
     * Fetch all product elements in a given iblock.
     *
     * @param int $iblockId
     * @return array[]
     */
    private function fetchProducts(int $iblockId): array
    {
        $items = [];

        $iterator = CIBlockElement::GetList(
            ['ID' => 'ASC'],
            [
                'IBLOCK_ID'       => $iblockId,
                'ACTIVE'          => 'Y',
                'CHECK_PERMISSIONS' => 'N',
            ],
            false,
            false,
            [
                'ID',
                'IBLOCK_ID',
                'NAME',
                'DETAIL_TEXT',
                'DETAIL_TEXT_TYPE',
                'PREVIEW_TEXT',
                'PREVIEW_TEXT_TYPE',
                'CODE',
                'XML_ID',
                'DETAIL_PICTURE',
                'PREVIEW_PICTURE',
                'DETAIL_PAGE_URL',
                'ACTIVE_FROM',
                'TIMESTAMP_X',
                'DATE_CREATE',
                'SORT',
                'IBLOCK_SECTION_ID',
            ],
        );

        while ($item = $iterator->GetNext()) {
            $items[$item['ID']] = $item;
        }

        // Attach catalog-specific data (price, quantity, weight, etc.)
        $this->attachCatalogData($items);
        $this->attachPrices($items);
        $this->attachSections($items);

        return $items;
    }

    /**
     * Fetch a single product by ID.
     */
    private function fetchProductById(int $elementId): ?array
    {
        $iterator = CIBlockElement::GetList(
            ['ID' => 'ASC'],
            [
                'ID'               => $elementId,
                'CHECK_PERMISSIONS' => 'N',
            ],
            false,
            false,
            [
                'ID',
                'IBLOCK_ID',
                'NAME',
                'DETAIL_TEXT',
                'DETAIL_TEXT_TYPE',
                'PREVIEW_TEXT',
                'PREVIEW_TEXT_TYPE',
                'CODE',
                'XML_ID',
                'DETAIL_PICTURE',
                'PREVIEW_PICTURE',
                'DETAIL_PAGE_URL',
                'ACTIVE_FROM',
                'TIMESTAMP_X',
                'DATE_CREATE',
                'SORT',
                'IBLOCK_SECTION_ID',
            ],
        );

        if (!$item = $iterator->GetNext()) {
            return null;
        }

        $items = [$item['ID'] => $item];
        $this->attachCatalogData($items);
        $this->attachPrices($items);
        $this->attachSections($items);

        return $items[$item['ID']] ?? null;
    }

    /**
     * Attach SKU, quantity, weight from CCatalogProduct.
     *
     * @param array &$items
     */
    private function attachCatalogData(array &$items): void
    {
        $ids = array_keys($items);
        if (empty($ids)) {
            return;
        }

        $catalogIterator = CCatalogProduct::GetList(
            [],
            ['@ID' => $ids],
            false,
            false,
            [
                'ID',
                'QUANTITY',
                'WEIGHT',
                'WIDTH',
                'LENGTH',
                'HEIGHT',
                'VAT_ID',
                'VAT_INCLUDED',
                'PURCHASING_PRICE',
                'PURCHASING_CURRENCY',
            ],
        );

        while ($cat = $catalogIterator->Fetch()) {
            $id = (int) $cat['ID'];
            if (isset($items[$id])) {
                $items[$id]['CATALOG'] = $cat;
            }
        }
    }

    /**
     * Attach price data (base price by configured price type).
     *
     * @param array &$items
     */
    private function attachPrices(array &$items): void
    {
        $ids = array_keys($items);
        if (empty($ids)) {
            return;
        }

        $priceIterator = \CPrice::GetList(
            [],
            [
                'PRODUCT_ID' => $ids,
                'CATALOG_GROUP_ID' => $this->resolvePriceTypeId(),
            ],
        );

        while ($price = $priceIterator->Fetch()) {
            $id = (int) $price['PRODUCT_ID'];
            if (isset($items[$id])) {
                $items[$id]['PRICE'] = (float) $price['PRICE'];
                $items[$id]['PRICE_CURRENCY'] = $price['CURRENCY'] ?? $this->baseCurrency;
            }
        }
    }

    /**
     * Attach section/category paths.
     *
     * @param array &$items
     */
    private function attachSections(array &$items): void
    {
        $sectionIds = [];
        foreach ($items as $item) {
            if (!empty($item['IBLOCK_SECTION_ID'])) {
                $sectionIds[(int) $item['IBLOCK_SECTION_ID']] = true;
            }
        }

        if (empty($sectionIds)) {
            return;
        }

        $sectionMap = [];

        $sectionIterator = CIBlockSection::GetList(
            ['LEFT_MARGIN' => 'ASC'],
            ['ID' => array_keys($sectionIds)],
            false,
            ['ID', 'NAME', 'IBLOCK_SECTION_ID', 'DEPTH_LEVEL'],
        );

        while ($section = $sectionIterator->Fetch()) {
            $sectionMap[(int) $section['ID']] = $section;
        }

        foreach ($items as &$item) {
            $sectionId = (int) ($item['IBLOCK_SECTION_ID'] ?? 0);
            if ($sectionId > 0 && isset($sectionMap[$sectionId])) {
                $item['SECTION_NAME'] = $sectionMap[$sectionId]['NAME'];
            }
        }
        unset($item);
    }

    /**
     * Resolve the price type CATALOG_GROUP_ID from its XML_ID / name.
     */
    private function resolvePriceTypeId(): int
    {
        static $cache = null;

        if ($cache !== null) {
            return $cache;
        }

        $groupIterator = \CCatalogGroup::GetList(
            [],
            ['@NAME' => [$this->priceType]],
            false,
            false,
            ['ID', 'NAME'],
        );

        if ($group = $groupIterator->Fetch()) {
            $cache = (int) $group['ID'];
        } else {
            // Fallback to first available price type
            $first = \CCatalogGroup::GetList()->Fetch();
            $cache = $first ? (int) $first['ID'] : 1;
        }

        return $cache;
    }

    // ─── Normalization ────────────────────────────────────────────

    /**
     * Normalize a raw Bitrix element into ProductDocument format.
     *
     * @param array $item Raw element with attached CATALOG, PRICE, SECTION data.
     * @return array
     */
    private function normalize(array $item): array
    {
        $description = !empty($item['DETAIL_TEXT'])
            ? $item['DETAIL_TEXT']
            : ($item['PREVIEW_TEXT'] ?? '');

        $price = (float) ($item['PRICE'] ?? 0);
        $currency = $item['PRICE_CURRENCY'] ?? $this->baseCurrency;

        $availability = 'out_of_stock';
        $stockQty = -1;

        if (isset($item['CATALOG']['QUANTITY'])) {
            $stockQty = (int) $item['CATALOG']['QUANTITY'];
            $availability = $stockQty > 0 ? 'in_stock' : 'out_of_stock';
        }

        $imageUrl = $this->getImageUrl($item);
        $productUrl = $this->getProductUrl($item);

        $createdAt = $this->dateToTimestamp($item['DATE_CREATE'] ?? null);
        $updatedAt = $this->dateToTimestamp($item['TIMESTAMP_X'] ?? null);

        return [
            'external_id'    => (string) $item['ID'],
            'title'          => (string) $item['NAME'],
            'description'    => $this->stripTags($description),
            'sku'            => (string) ($item['CATALOG']['ID'] ?? $item['XML_ID'] ?? ''),
            'brand'          => '',
            'categories'     => !empty($item['SECTION_NAME'])
                ? [$item['SECTION_NAME']]
                : [],
            'category_ids'   => !empty($item['IBLOCK_SECTION_ID'])
                ? [(string) $item['IBLOCK_SECTION_ID']]
                : [],
            'tags'           => [],
            'price'          => $price,
            'sale_price'     => null,
            'currency'       => $currency,
            'image_url'      => $imageUrl,
            'product_url'    => $productUrl,
            'availability'   => $availability,
            'stock_quantity' => $stockQty,
            'attributes'     => $this->buildAttributes($item),
            'locale'         => LANGUAGE_ID ?: 'en',
            'created_at'     => $createdAt,
            'updated_at'     => $updatedAt,
        ];
    }

    /**
     * Build a product URL from the element data.
     */
    private function getProductUrl(array $item): string
    {
        if (!empty($item['DETAIL_PAGE_URL'])) {
            $url = $item['DETAIL_PAGE_URL'];
            // If it's a relative URL, prepend the site URL
            if (str_starts_with($url, '/')) {
                $siteUrl = $this->getShopUrl();
                return rtrim($siteUrl, '/') . $url;
            }
            return $url;
        }

        return '';
    }

    /**
     * Extract the first available image URL.
     */
    private function getImageUrl(array $item): string
    {
        $fileId = $item['DETAIL_PICTURE'] ?: ($item['PREVIEW_PICTURE'] ?? 0);
        if ($fileId > 0) {
            $file = \CFile::GetFileArray($fileId);
            if ($file && !empty($file['SRC'])) {
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
                    ? 'https'
                    : 'http';
                $host = $_SERVER['SERVER_NAME'] ?? '';
                if ($host) {
                    return "{$protocol}://{$host}{$file['SRC']}";
                }
                return $file['SRC'];
            }
        }

        return '';
    }

    /**
     * Build arbitrary key-value attributes from selected Bitrix fields.
     */
    private function buildAttributes(array $item): array
    {
        $attrs = [];

        if (!empty($item['CODE'])) {
            $attrs['code'] = $item['CODE'];
        }

        if (!empty($item['XML_ID'])) {
            $attrs['xml_id'] = $item['XML_ID'];
        }

        if (!empty($item['SORT'])) {
            $attrs['sort'] = (int) $item['SORT'];
        }

        if (isset($item['CATALOG']['WEIGHT'])) {
            $attrs['weight'] = (float) $item['CATALOG']['WEIGHT'];
        }

        if (!empty($item['CATALOG']['VAT_ID'])) {
            $attrs['vat_id'] = (int) $item['CATALOG']['VAT_ID'];
        }

        if (!empty($item['DETAIL_TEXT_TYPE'])) {
            $attrs['text_type'] = $item['DETAIL_TEXT_TYPE'];
        }

        return $attrs;
    }

    /**
     * Convert Bitrix DateTime string to Unix timestamp.
     */
    private function dateToTimestamp($date): ?int
    {
        if ($date instanceof DateTime) {
            return $date->getTimestamp();
        }

        if (is_string($date) && $date !== '') {
            $ts = strtotime($date);
            return $ts !== false ? $ts : null;
        }

        return null;
    }

    /**
     * Strip HTML tags and decode entities for description.
     */
    private function stripTags(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(strip_tags($text));
    }

    /**
     * Get the shop's base URL.
     */
    private function getShopUrl(): string
    {
        if (!empty($_SERVER['SERVER_NAME'])) {
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
                ? 'https'
                : 'http';
            return "{$protocol}://{$_SERVER['SERVER_NAME']}";
        }

        if (defined('BX24_HOST_NAME')) {
            return 'https://' . BX24_HOST_NAME;
        }

        return '';
    }
}
