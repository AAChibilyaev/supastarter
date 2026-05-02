<?php
/**
 * AACsearch Logger — stores debug and error messages in WordPress options.
 *
 * @since      1.0.0
 * @package    AACsearch
 */
if (!defined('ABSPATH')) {
	exit;
}

class AACSearch_Logger
{
	const LOG_OPTION      = 'aacsearch_error_log';
	const MAX_LOG_ENTRIES = 100;

	/**
	 * Log a debug message (only when debug mode is enabled).
	 *
	 * @param string $message Debug message.
	 */
	public static function debug($message)
	{
		if (get_option(AACSearch_Plugin::CFG_DEBUG_MODE) !== '1') {
			return;
		}

		self::write('DEBUG', $message);
	}

	/**
	 * Log an error message.
	 *
	 * @param string $message Error message.
	 */
	public static function error($message)
	{
		self::write('ERROR', $message);
	}

	/**
	 * Write a log entry.
	 *
	 * @param string $level   Log level (DEBUG, ERROR).
	 * @param string $message Log message.
	 */
	protected static function write($level, $message)
	{
		$log = get_option(self::LOG_OPTION, array());
		if (!is_array($log)) {
			$log = array();
		}

		$log[] = array(
			'code'      => $level,
			'message'   => $message,
			'timestamp' => current_time('c'),
		);

		// Keep only the last N entries
		if (count($log) > self::MAX_LOG_ENTRIES) {
			$log = array_slice($log, -self::MAX_LOG_ENTRIES);
		}

		update_option(self::LOG_OPTION, $log);
	}

	/**
	 * Get recent error entries.
	 *
	 * @param int $limit Maximum number of entries to return.
	 *
	 * @return array
	 */
	public static function get_recent_errors($limit = 20)
	{
		$log = get_option(self::LOG_OPTION, array());
		if (!is_array($log)) {
			return array();
		}

		$errors = array();
		foreach (array_reverse($log) as $entry) {
			if ($entry['code'] === 'ERROR') {
				$errors[] = $entry;
				if (count($errors) >= $limit) {
					break;
				}
			}
		}

		return $errors;
	}

	/**
	 * Clear all log entries.
	 */
	public static function clear()
	{
		delete_option(self::LOG_OPTION);
	}
}
