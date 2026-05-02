<?php

namespace Aacsearch;

/**
 * Base exception for all AACSearch SDK errors.
 */
class AacsearchException extends \RuntimeException
{
    public function __construct(
        string $message = '',
        int $statusCode = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);
    }

    public function getStatusCode(): int
    {
        return $this->getCode();
    }
}

/**
 * Raised when the API key is missing, invalid, or expired.
 */
class AuthenticationException extends AacsearchException {}

/**
 * Raised when the requested resource does not exist.
 */
class NotFoundException extends AacsearchException {}

/**
 * Raised when the API rate limit has been exceeded.
 */
class RateLimitException extends AacsearchException {}
