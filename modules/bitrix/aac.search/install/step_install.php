<?php

/**
 * Installation step page.
 * Shown after successful module installation.
 */

use Bitrix\Main\Localization\Loc;

global $APPLICATION;

?>
<form action="<?= $APPLICATION->GetCurPage() ?>" method="post">
    <?= bitrix_sessid_post() ?>
    <input type="hidden" name="lang" value="<?= LANGUAGE_ID ?>">
    <input type="hidden" name="id" value="aac.search">
    <input type="hidden" name="install" value="Y">
    <input type="hidden" name="step" value="2">

    <?php
    \CAdminMessage::ShowNote(
        Loc::getMessage('AAC_SEARCH_INSTALL_SUCCESS')
            ?: 'Module AAC Search installed successfully.'
    );
    ?>

    <p>
        <?= Loc::getMessage('AAC_SEARCH_INSTALL_NEXT_STEPS')
            ?: 'Configure the module in the <a href="settings.php?mid=aac.search&lang=' . LANGUAGE_ID . '">settings page</a>.'
        ?>
    </p>

    <input type="submit" value="<?= Loc::getMessage('AAC_SEARCH_INSTALL_FINISH') ?: 'Finish installation' ?>">
</form>
