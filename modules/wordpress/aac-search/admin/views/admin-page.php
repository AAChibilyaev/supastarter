<?php
/**
 * Admin settings page for AACsearch Connector.
 *
 * @since      1.0.0
 * @package    AACsearch
 */

if (!defined('ABSPATH')) {
	exit;
}

/** @var AACSearch_Plugin $this */

$api_url         = get_option(AACSearch_Plugin::CFG_API_URL, '');
$project_id      = get_option(AACSearch_Plugin::CFG_PROJECT_ID, '');
$connector_token = get_option(AACSearch_Plugin::CFG_CONNECTOR_TOKEN, '');
$sync_enabled    = get_option(AACSearch_Plugin::CFG_SYNC_ENABLED, '0');
$widget_enabled  = get_option(AACSearch_Plugin::CFG_WIDGET_ENABLED, '0');
$batch_size      = get_option(AACSearch_Plugin::CFG_BATCH_SIZE, AACSearch_Plugin::DEFAULT_BATCH_SIZE);
$debug_mode      = get_option(AACSearch_Plugin::CFG_DEBUG_MODE, '0');
$last_full_sync  = get_option('aacsearch_last_full_sync', __('Never', AACSearch_Plugin::TEXT_DOMAIN));
$last_delta_sync = get_option('aacsearch_last_delta_sync', __('Never', AACSearch_Plugin::TEXT_DOMAIN));

// Save settings on POST
if (isset($_POST['submit_aacsearch_settings']) && check_admin_referer('aacsearch_settings')) {
	update_option(AACSearch_Plugin::CFG_API_URL,         sanitize_text_field($_POST['aacsearch_api_url'] ?? ''));
	update_option(AACSearch_Plugin::CFG_PROJECT_ID,      sanitize_text_field($_POST['aacsearch_project_id'] ?? ''));
	update_option(AACSearch_Plugin::CFG_CONNECTOR_TOKEN, sanitize_text_field($_POST['aacsearch_connector_token'] ?? ''));
	update_option(AACSearch_Plugin::CFG_SYNC_ENABLED,    isset($_POST['aacsearch_sync_enabled']) ? '1' : '0');
	update_option(AACSearch_Plugin::CFG_WIDGET_ENABLED,  isset($_POST['aacsearch_widget_enabled']) ? '1' : '0');

	$submitted_batch = (int) ($_POST['aacsearch_batch_size'] ?? AACSearch_Plugin::DEFAULT_BATCH_SIZE);
	update_option(AACSearch_Plugin::CFG_BATCH_SIZE, max(1, min(500, $submitted_batch)));
	update_option(AACSearch_Plugin::CFG_DEBUG_MODE, isset($_POST['aacsearch_debug_mode']) ? '1' : '0');

	// Post types
	$post_types = isset($_POST['aacsearch_post_types']) && is_array($_POST['aacsearch_post_types'])
		? array_map('sanitize_text_field', $_POST['aacsearch_post_types'])
		: array('post', 'page');
	update_option(AACSearch_Plugin::CFG_POST_TYPES, $post_types);

	// Taxonomies
	$taxonomies = isset($_POST['aacsearch_taxonomies']) && is_array($_POST['aacsearch_taxonomies'])
		? array_map('sanitize_text_field', $_POST['aacsearch_taxonomies'])
		: array('category', 'post_tag');
	update_option(AACSearch_Plugin::CFG_TAXONOMIES, $taxonomies);

	echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Settings saved.', AACSearch_Plugin::TEXT_DOMAIN) . '</p></div>';

	// Refresh variables
	$sync_enabled   = get_option(AACSearch_Plugin::CFG_SYNC_ENABLED, '0');
	$widget_enabled = get_option(AACSearch_Plugin::CFG_WIDGET_ENABLED, '0');
}

// Get available post types (public ones)
$public_post_types = get_post_types(array('public' => true), 'objects');
$selected_types    = get_option(AACSearch_Plugin::CFG_POST_TYPES, array('post', 'page'));

// Get available taxonomies (public ones)
$public_taxonomies = get_taxonomies(array('public' => true), 'objects');
$selected_taxes    = get_option(AACSearch_Plugin::CFG_TAXONOMIES, array('category', 'post_tag'));
?>
<div class="wrap aacsearch-admin">
	<h1><?php echo esc_html__('AACsearch Connector', AACSearch_Plugin::TEXT_DOMAIN); ?></h1>
	<p><?php echo esc_html__('Sync your WordPress content to AACsearch hosted search-as-a-service.', AACSearch_Plugin::TEXT_DOMAIN); ?></p>

	<form method="post" action="">
		<?php wp_nonce_field('aacsearch_settings'); ?>

		<h2><?php echo esc_html__('API Configuration', AACSearch_Plugin::TEXT_DOMAIN); ?></h2>
		<table class="form-table">
			<tr>
				<th scope="row"><label for="aacsearch_api_url"><?php echo esc_html__('API URL', AACSearch_Plugin::TEXT_DOMAIN); ?></label></th>
				<td>
					<input type="url" id="aacsearch_api_url" name="aacsearch_api_url"
						value="<?php echo esc_attr($api_url); ?>" class="regular-text" required />
					<p class="description"><?php echo esc_html__('The base URL of the AACsearch Connector API (e.g., https://api.example.com).', AACSearch_Plugin::TEXT_DOMAIN); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="aacsearch_project_id"><?php echo esc_html__('Project ID', AACSearch_Plugin::TEXT_DOMAIN); ?></label></th>
				<td>
					<input type="text" id="aacsearch_project_id" name="aacsearch_project_id"
						value="<?php echo esc_attr($project_id); ?>" class="regular-text" required />
					<p class="description"><?php echo esc_html__('Your AACsearch project identifier.', AACSearch_Plugin::TEXT_DOMAIN); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="aacsearch_connector_token"><?php echo esc_html__('Connector Token', AACSearch_Plugin::TEXT_DOMAIN); ?></label></th>
				<td>
					<input type="password" id="aacsearch_connector_token" name="aacsearch_connector_token"
						value="<?php echo esc_attr($connector_token); ?>" class="regular-text" required />
					<p class="description"><?php echo esc_html__('The ss_connector_* token for API authentication.', AACSearch_Plugin::TEXT_DOMAIN); ?></p>
				</td>
			</tr>
		</table>

		<h2><?php echo esc_html__('Sync Settings', AACSearch_Plugin::TEXT_DOMAIN); ?></h2>
		<table class="form-table">
			<tr>
				<th scope="row"><?php echo esc_html__('Sync Enabled', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
				<td>
					<label>
						<input type="checkbox" name="aacsearch_sync_enabled" value="1"
							<?php checked($sync_enabled, '1'); ?> />
						<?php echo esc_html__('Enable automatic content synchronization on updates.', AACSearch_Plugin::TEXT_DOMAIN); ?>
					</label>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php echo esc_html__('Post Types', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
				<td>
					<fieldset>
						<legend class="screen-reader-text"><?php echo esc_html__('Post Types to Sync', AACSearch_Plugin::TEXT_DOMAIN); ?></legend>
						<?php foreach ($public_post_types as $pt) : ?>
							<label style="display:inline-block; min-width:150px; margin:4px 0;">
								<input type="checkbox" name="aacsearch_post_types[]"
									value="<?php echo esc_attr($pt->name); ?>"
									<?php checked(in_array($pt->name, $selected_types, true)); ?> />
								<?php echo esc_html($pt->labels->singular_name); ?> (<?php echo esc_html($pt->name); ?>)
							</label>
						<?php endforeach; ?>
					</fieldset>
					<p class="description"><?php echo esc_html__('Select which post types to sync to AACsearch.', AACSearch_Plugin::TEXT_DOMAIN); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php echo esc_html__('Taxonomies', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
				<td>
					<fieldset>
						<legend class="screen-reader-text"><?php echo esc_html__('Taxonomies to Sync', AACSearch_Plugin::TEXT_DOMAIN); ?></legend>
						<?php foreach ($public_taxonomies as $tax) : ?>
							<label style="display:inline-block; min-width:150px; margin:4px 0;">
								<input type="checkbox" name="aacsearch_taxonomies[]"
									value="<?php echo esc_attr($tax->name); ?>"
									<?php checked(in_array($tax->name, $selected_taxes, true)); ?> />
								<?php echo esc_html($tax->labels->singular_name); ?> (<?php echo esc_html($tax->name); ?>)
							</label>
						<?php endforeach; ?>
					</fieldset>
					<p class="description"><?php echo esc_html__('Select which taxonomies to sync as searchable content.', AACSearch_Plugin::TEXT_DOMAIN); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="aacsearch_batch_size"><?php echo esc_html__('Batch Size', AACSearch_Plugin::TEXT_DOMAIN); ?></label></th>
				<td>
					<input type="number" id="aacsearch_batch_size" name="aacsearch_batch_size"
						value="<?php echo esc_attr($batch_size); ?>" min="1" max="500" class="small-text" />
					<p class="description"><?php echo esc_html__('Number of items to process per batch during sync (1-500).', AACSearch_Plugin::TEXT_DOMAIN); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php echo esc_html__('Debug Mode', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
				<td>
					<label>
						<input type="checkbox" name="aacsearch_debug_mode" value="1"
							<?php checked($debug_mode, '1'); ?> />
						<?php echo esc_html__('Enable verbose logging for troubleshooting.', AACSearch_Plugin::TEXT_DOMAIN); ?>
					</label>
				</td>
			</tr>
		</table>

		<h2><?php echo esc_html__('Live Search Widget', AACSearch_Plugin::TEXT_DOMAIN); ?></h2>
		<table class="form-table">
			<tr>
				<th scope="row"><?php echo esc_html__('Widget Enabled', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
				<td>
					<label>
						<input type="checkbox" name="aacsearch_widget_enabled" value="1"
							<?php checked($widget_enabled, '1'); ?> />
						<?php echo esc_html__('Inject the AACsearch live search widget on the front-end.', AACSearch_Plugin::TEXT_DOMAIN); ?>
					</label>
				</td>
			</tr>
		</table>

		<p class="submit">
			<button type="submit" name="submit_aacsearch_settings" class="button button-primary">
				<?php echo esc_html__('Save Settings', AACSearch_Plugin::TEXT_DOMAIN); ?>
			</button>
		</p>
	</form>

	<hr />

	<h2><?php echo esc_html__('Actions', AACSearch_Plugin::TEXT_DOMAIN); ?></h2>
	<table class="form-table">
		<tr>
			<th scope="row"><?php echo esc_html__('Test Connection', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
			<td>
				<button id="aacsearch-test-connection" class="button">
					<?php echo esc_html__('Test Connection', AACSearch_Plugin::TEXT_DOMAIN); ?>
				</button>
				<span id="aacsearch-test-result" style="margin-left:10px;"></span>
			</td>
		</tr>
		<tr>
			<th scope="row"><?php echo esc_html__('Full Sync', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
			<td>
				<button id="aacsearch-run-sync" class="button button-primary">
					<?php echo esc_html__('Run Full Sync', AACSearch_Plugin::TEXT_DOMAIN); ?>
				</button>
				<span id="aacsearch-sync-result" style="margin-left:10px;"></span>
				<p class="description">
					<?php
					/* translators: %s: last sync datetime */
					echo esc_html(sprintf(__('Last full sync: %s', AACSearch_Plugin::TEXT_DOMAIN), $last_full_sync));
					?>
				</p>
			</td>
		</tr>
		<tr>
			<th scope="row"><?php echo esc_html__('Diagnostics', AACSearch_Plugin::TEXT_DOMAIN); ?></th>
			<td>
				<button id="aacsearch-send-diagnostics" class="button">
					<?php echo esc_html__('Send Diagnostics', AACSearch_Plugin::TEXT_DOMAIN); ?>
				</button>
				<span id="aacsearch-diagnostics-result" style="margin-left:10px;"></span>
			</td>
		</tr>
	</table>
</div>

<script>
jQuery(document).ready(function($) {
	var nonce = '<?php echo esc_js(wp_create_nonce('aacsearch_admin')); ?>';

	$('#aacsearch-test-connection').on('click', function() {
		var btn = $(this);
		var result = $('#aacsearch-test-result');
		btn.prop('disabled', true);
		result.html('<em><?php echo esc_js(__('Testing...', AACSearch_Plugin::TEXT_DOMAIN)); ?></em>');

		$.post(ajaxurl, {
			action: 'aacsearch_test_connection',
			nonce: nonce
		}, function(resp) {
			if (resp.success) {
				result.html('<span style="color:green;">' + resp.data.message + '</span>');
			} else {
				result.html('<span style="color:red;">' + resp.data.message + '</span>');
			}
		}).fail(function() {
			result.html('<span style="color:red;"><?php echo esc_js(__('Connection failed.', AACSearch_Plugin::TEXT_DOMAIN)); ?></span>');
		}).always(function() {
			btn.prop('disabled', false);
		});
	});

	$('#aacsearch-run-sync').on('click', function() {
		var btn = $(this);
		var result = $('#aacsearch-sync-result');
		btn.prop('disabled', true);
		result.html('<em><?php echo esc_js(__('Syncing...', AACSearch_Plugin::TEXT_DOMAIN)); ?></em>');

		$.post(ajaxurl, {
			action: 'aacsearch_run_full_sync',
			nonce: nonce
		}, function(resp) {
			if (resp.success) {
				result.html('<span style="color:green;">' + resp.data.message + '</span>');
			} else {
				result.html('<span style="color:red;">' + resp.data.message + '</span>');
			}
		}).fail(function() {
			result.html('<span style="color:red;"><?php echo esc_js(__('Sync failed.', AACSearch_Plugin::TEXT_DOMAIN)); ?></span>');
		}).always(function() {
			btn.prop('disabled', false);
		});
	});

	$('#aacsearch-send-diagnostics').on('click', function() {
		var btn = $(this);
		var result = $('#aacsearch-diagnostics-result');
		btn.prop('disabled', true);
		result.html('<em><?php echo esc_js(__('Sending...', AACSearch_Plugin::TEXT_DOMAIN)); ?></em>');

		$.post(ajaxurl, {
			action: 'aacsearch_send_diagnostics',
			nonce: nonce
		}, function(resp) {
			if (resp.success) {
				result.html('<span style="color:green;">' + resp.data.message + '</span>');
			} else {
				result.html('<span style="color:red;">' + resp.data.message + '</span>');
			}
		}).fail(function() {
			result.html('<span style="color:red;"><?php echo esc_js(__('Diagnostics failed.', AACSearch_Plugin::TEXT_DOMAIN)); ?></span>');
		}).always(function() {
			btn.prop('disabled', false);
		});
	});
});
</script>
