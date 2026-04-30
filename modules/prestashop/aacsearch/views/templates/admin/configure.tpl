{*
 * AACsearch - PrestaShop 8.x Connector Module
 *
 * Admin settings form template — renders action buttons for
 * manual full sync and diagnostics submission.
 *
 * @author    AACsearch
 * @copyright 2026 AACsearch
 * @license   MIT
 *}

<div class="panel">
    <div class="panel-heading">
        <i class="icon-cogs"></i>
        {l s='Actions' mod='aacsearch'}
    </div>
    <div class="panel-body">
        <div class="row">
            <div class="col-md-6">
                <div class="well">
                    <h4>
                        <i class="icon-refresh"></i>
                        {l s='Full Product Sync' mod='aacsearch'}
                    </h4>
                    <p>
                        {l s='Manually trigger a full synchronization of all active products to the AACsearch API.' mod='aacsearch'}
                    </p>
                    <form action="{$aacsearch_action_url|escape:'htmlall':'UTF-8'}" method="post">
                        <button type="submit" name="submitAacsearchFullSync" class="btn btn-primary" onclick="return confirm('{l s='Are you sure you want to start a full sync? This may take a while for large catalogs.' mod='aacsearch' js_escape=true}');">
                            <i class="icon-play"></i>
                            {l s='Run Full Sync' mod='aacsearch'}
                        </button>
                    </form>
                </div>
            </div>
            <div class="col-md-6">
                <div class="well">
                    <h4>
                        <i class="icon-heartbeat"></i>
                        {l s='Diagnostics' mod='aacsearch'}
                    </h4>
                    <p>
                        {l s='Send diagnostic information to AACsearch to help troubleshoot any issues.' mod='aacsearch'}
                    </p>
                    <form action="{$aacsearch_action_url|escape:'htmlall':'UTF-8'}" method="post">
                        <button type="submit" name="submitAacsearchDiagnostics" class="btn btn-info">
                            <i class="icon-send"></i>
                            {l s='Send Diagnostics' mod='aacsearch'}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <div class="row" style="margin-top: 20px;">
            <div class="col-md-12">
                <div class="alert alert-info">
                    <i class="icon-info-circle"></i>
                    {l s='For automatic synchronization, enable "Sync Enabled" in the configuration above. Product updates, deletions, and stock changes will then be sent to AACsearch automatically.' mod='aacsearch'}
                </div>
            </div>
        </div>
    </div>
</div>
