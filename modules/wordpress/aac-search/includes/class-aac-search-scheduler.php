<?php
/**
 * AACsearch Scheduler — handles WP-Cron scheduling for multisite sync.
 *
 * @since      1.0.0
 * @package    AACsearch
 */
if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_Scheduler
{
	/**
	 * The main plugin instance.
	 *
	 * @var AACSearch_Plugin
	 */
	protected $plugin;

	/**
	 * @param AACSearch_Plugin $plugin The main plugin instance.
	 */
	public function __construct(AACSearch_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	/**
	 * Register custom cron schedules.
	 *
	 * @param array $schedules Existing WP-Cron schedules.
	 *
	 * @return array
	 */
	public static function add_cron_schedules($schedules)
	{
		$schedules['aacsearch_every_30min'] = array(
			'interval' => 1800,
			'display'  => __('Every 30 minutes', AACSearch_Plugin::TEXT_DOMAIN),
		);

		$schedules['aacsearch_every_6hours'] = array(
			'interval' => 21600,
			'display'  => __('Every 6 hours', AACSearch_Plugin::TEXT_DOMAIN),
		);

		return $schedules;
	}

	/**
	 * Schedule the daily sync if not already scheduled.
	 */
	public static function schedule_events()
	{
		if (!wp_next_scheduled('aacsearch_daily_sync')) {
			wp_schedule_event(time(), 'daily', 'aacsearch_daily_sync');
		}
	}

	/**
	 * Clear all AACsearch scheduled events.
	 */
	public static function clear_events()
	{
		$timestamps = array(
			wp_next_scheduled('aacsearch_daily_sync'),
		);

		foreach ($timestamps as $timestamp) {
			if ($timestamp) {
				wp_unschedule_event($timestamp, 'aacsearch_daily_sync');
			}
		}
	}
}
