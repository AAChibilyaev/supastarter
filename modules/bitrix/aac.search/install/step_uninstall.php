<?php

/**
 * Uninstallation step page.
 * Asks whether to keep database data.
 */

use Bitrix\Main\Localization\Loc;

global $APPLICATION;

?>
<form action="<?= $APPLICATION->GetCurPage() ?>" method="post">
    <?= bitrix_sessid_post() ?>
    <input type="hidden" name="lang" value="<?= LANGUAGE_ID ?>">
    <input type="hidden" name="id" value="aac.search">
    <input type="hidden" name="uninstall" value="Y">
    <input type="hidden" name="step" value="2">

    <?php
    \CAdminMessage::ShowMessage([
        'MESSAGE' => Loc::getMessage('AAC_SEARCH_UNINSTALL_CONFIRM')
            ?: 'Uninstall AAC Search module?',
        'TYPE'    => 'WARNING',
    ]);
    ?>

    <p>
        <label>
            <input type="checkbox" name="savedata" value="Y" checked>
            <?= Loc::getMessage('AAC_SEARCH_UNINSTALL_SAVE_DATA')
                ?: 'Keep database tables and settings' ?>
        </label>
    </p>

    <p>
        <?= Loc::getMessage('AAC_SEARCH_UNINSTALL_WARNING')
            ?: 'All synchronization agents and event handlers will be removed.' ?>
    </p>

    <input type="submit" value="<?= Loc::getMessage('AAC_SEARCH_UNINSTALL_CONFIRM_BTN') ?: 'Uninstall' ?>">
</form>
