<?php
/**
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * Normalizes PrestaShop product data into the AACsearch ProductDocument
 * schema. Supports batch iteration and single-product export with full
 * field mapping.
 *
 * ProductDocument schema:
 *   external_id, title, description, sku, brand, categories, category_ids,
 *   tags, price, sale_price, currency, image_url, product_url, availability,
 *   stock_quantity, attributes, locale, created_at, updated_at
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class AacSearchProductExporter
{
    /**
     * Number of products to process per batch.
     *
     * @var int
     */
    protected $batchSize;

    /**
     * Default locale for product export.
     *
     * @var string
     */
    protected $locale;

    /**
     * Default currency ISO code.
     *
     * @var string
     */
    protected $currency;

    /**
     * Default language ID derived from locale.
     *
     * @var int|null
     */
    protected $langId;

    /**
     * @param int    $batchSize Number of products per batch
     * @param string $locale    Default locale (e.g., en, fr, de)
     * @param string $currency  Default currency ISO code (e.g., USD, EUR)
     */
    public function __construct($batchSize = 50, $locale = 'en', $currency = 'USD')
    {
        $this->batchSize = max(1, (int) $batchSize);
        $this->locale = $locale;
        $this->currency = strtoupper($currency);
        $this->langId = $this->resolveLanguageId();
    }

    /**
     * Export all active products as an array of ProductDocument arrays.
     *
     * @return array
     *
     * @throws Exception
     */
    public function exportAll()
    {
        $products = [];
        $batches = $this->exportBatches();

        foreach ($batches as $batch) {
            $products = array_merge($products, $batch);
        }

        return $products;
    }

    /**
     * Export products in batches, yielding one batch at a time.
     *
     * @return array[] Array of batches, each batch is an array of ProductDocument arrays
     *
     * @throws Exception
     */
    public function exportBatches()
    {
        $batches = [];
        $offset = 0;

        while (true) {
            $productIds = $this->getProductIds($offset, $this->batchSize);
            if (empty($productIds)) {
                break;
            }

            $batch = [];
            foreach ($productIds as $row) {
                $document = $this->buildDocument((int) $row['id_product']);
                if ($document !== null) {
                    $batch[] = $document;
                }
            }

            if (!empty($batch)) {
                $batches[] = $batch;
            }

            $offset += $this->batchSize;
        }

        return $batches;
    }

    /**
     * Export a single product by ID as a ProductDocument array.
     *
     * @param int $productId
     *
     * @return array|null ProductDocument array, or null if product not found/inactive
     *
     * @throws Exception
     */
    public function exportSingle($productId)
    {
        $productId = (int) $productId;
        if ($productId <= 0) {
            return null;
        }

        return $this->buildDocument($productId);
    }

    /**
     * Retrieve active product IDs in a given range.
     *
     * @param int $offset
     * @param int $limit
     *
     * @return array
     */
    protected function getProductIds($offset, $limit)
    {
        $sql = new DbQuery();
        $sql->select('id_product');
        $sql->from('product', 'p');
        $sql->where('p.active = 1');
        $sql->orderBy('p.id_product ASC');
        $sql->limit($limit, $offset);

        return Db::getInstance()->executeS($sql);
    }

    /**
     * Build a ProductDocument array from a PrestaShop product ID.
     *
     * @param int $productId
     *
     * @return array|null
     *
     * @throws Exception
     */
    protected function buildDocument($productId)
    {
        $product = new Product($productId, false, $this->langId);
        if (!Validate::isLoadedObject($product) || !$product->active) {
            return null;
        }

        $idShop = (int) $this->context()->shop->id;
        $idLang = $this->langId ?: (int) $this->context()->language->id;

        // Load full product with lang data
        $productFull = new Product($productId, true, $idLang, $idShop);

        // Determine price and sale price
        $price = (float) $productFull->price;
        $wholesalePrice = (float) $productFull->wholesale_price;

        $specificPrice = SpecificPrice::getSpecificPrice($productId, $idShop, $idLang);
        $salePrice = null;
        if ($specificPrice && isset($specificPrice['reduction'])) {
            $reductionType = $specificPrice['reduction_type'];
            $reduction = (float) $specificPrice['reduction'];

            if ($reductionType === 'amount') {
                $salePrice = max(0, $price - $reduction);
            } elseif ($reductionType === 'percentage') {
                $salePrice = $price * (1 - $reduction);
            }
        }

        // Handle tax
        $taxRate = $productFull->getTaxesRate();
        $priceTaxIncl = $price * (1 + $taxRate / 100);
        $salePriceTaxIncl = $salePrice !== null ? $salePrice * (1 + $taxRate / 100) : null;

        // Categories
        $categories = $productFull->getCategories();
        $categoryNames = [];
        $categoryIds = [];

        if (!empty($categories)) {
            foreach ($categories as $catId) {
                $category = new Category((int) $catId, $idLang, $idShop);
                if (Validate::isLoadedObject($category)) {
                    $categoryNames[] = $category->name;
                    $categoryIds[] = (int) $catId;
                }
            }
        }

        // Brand / Manufacturer
        $brand = '';
        if ($productFull->id_manufacturer) {
            $manufacturer = new Manufacturer($productFull->id_manufacturer, $idLang);
            if (Validate::isLoadedObject($manufacturer)) {
                $brand = $manufacturer->name;
            }
        }

        // Tags
        $tags = Tag::getProductTags($productId);
        $tagList = [];
        if (!empty($tags)) {
            foreach ($tags as $langTags) {
                $tagList = array_merge($tagList, $langTags);
            }
            $tagList = array_unique($tagList);
        }

        // Images
        $imageUrl = '';
        $coverImage = $productFull->getCover($productId);
        if ($coverImage && isset($coverImage['id_image'])) {
            $imageUrl = $this->context()->link->getImageLink(
                $productFull->link_rewrite,
                $productFull->id . '-' . $coverImage['id_image'],
                ImageType::getFormattedName('large')
            );
        }

        // Product URL
        $productUrl = $this->context()->link->getProductLink(
            $productFull,
            null,
            null,
            null,
            $idLang,
            $idShop
        );

        // Attributes (combinations)
        $attributes = [];
        $combinations = $productFull->getAttributesGroups($idLang);
        if (!empty($combinations)) {
            $seen = [];
            foreach ($combinations as $combination) {
                $groupName = isset($combination['group_name']) ? $combination['group_name'] : '';
                $attrName = isset($combination['attribute_name']) ? $combination['attribute_name'] : '';

                if ($groupName && $attrName && !isset($seen[$groupName . '-' . $attrName])) {
                    $attributes[] = [
                        'name' => $groupName,
                        'value' => $attrName,
                    ];
                    $seen[$groupName . '-' . $attrName] = true;
                }
            }
        }

        // Stock / Availability
        $stockQuantity = Product::getQuantity($productId, null, null);
        $availability = $stockQuantity > 0 ? 'in_stock' : 'out_of_stock';

        // Dates
        $createdAt = $productFull->date_add ? date('c', strtotime($productFull->date_add)) : date('c');
        $updatedAt = $productFull->date_upd ? date('c', strtotime($productFull->date_upd)) : date('c');

        // Build the ProductDocument
        $document = [
            'external_id' => (string) $productId,
            'title' => $productFull->name ?: '',
            'description' => $this->cleanDescription($productFull->description ?: ''),
            'sku' => $productFull->reference ?: '',
            'brand' => $brand,
            'categories' => $categoryNames,
            'category_ids' => $categoryIds,
            'tags' => $tagList,
            'price' => round($priceTaxIncl, 2),
            'sale_price' => $salePriceTaxIncl !== null ? round($salePriceTaxIncl, 2) : null,
            'currency' => $this->currency,
            'image_url' => $imageUrl,
            'product_url' => $productUrl,
            'availability' => $availability,
            'stock_quantity' => $stockQuantity,
            'attributes' => $attributes,
            'locale' => $this->locale,
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ];

        return $document;
    }

    /**
     * Clean HTML description to plain text.
     *
     * @param string $description
     *
     * @return string
     */
    protected function cleanDescription($description)
    {
        $text = strip_tags($description);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);

        return $text;
    }

    /**
     * Resolve a language ID from the configured locale.
     *
     * @return int|null
     */
    protected function resolveLanguageId()
    {
        $localeParts = explode('_', str_replace('-', '_', $this->locale));
        $isoCode = strtolower($localeParts[0]);

        $sql = new DbQuery();
        $sql->select('id_lang');
        $sql->from('lang');
        $sql->where("iso_code = '" . pSQL($isoCode) . "'");

        $result = Db::getInstance()->getValue($sql);

        return $result ? (int) $result : null;
    }

    /**
     * Get the current context.
     *
     * @return Context
     */
    protected function context()
    {
        return Context::getContext();
    }
}
