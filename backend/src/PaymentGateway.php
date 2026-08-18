<?php

declare(strict_types=1);

namespace Matchpoint;

use Mollie\Api\MollieApiClient;
use RuntimeException;

final class PaymentGateway
{
    public static function create(array $parameters): object
    {
        if (self::usesFake()) {
            return new FakePayment(
                'tr_test_' . bin2hex(random_bytes(8)),
                'open',
                (string)($parameters['redirectUrl'] ?? '')
            );
        }

        return self::client()->payments->create($parameters);
    }

    public static function get(string $paymentId): object
    {
        if (self::usesFake()) {
            $status = trim((string)(getenv('MOLLIE_FAKE_GET_STATUS') ?: 'paid'));
            if (!in_array($status, ['open', 'pending', 'paid', 'failed', 'canceled', 'expired'], true)) {
                throw new RuntimeException('Ongeldige MOLLIE_FAKE_GET_STATUS voor de integratietests.');
            }
            return new FakePayment($paymentId, $status);
        }

        return self::client()->payments->get($paymentId);
    }

    private static function usesFake(): bool
    {
        $enabled = strtolower(trim((string)getenv('MOLLIE_FAKE'))) === 'true';
        if ($enabled && getenv('APP_ENV') !== 'testing') {
            throw new RuntimeException('De fake betaalprovider mag alleen in de testomgeving worden gebruikt.');
        }
        return $enabled;
    }

    private static function client(): MollieApiClient
    {
        $client = new MollieApiClient();
        $client->setApiKey(getenv('MOLLIE_API_KEY') ?: '');
        return $client;
    }
}

final class FakePayment
{
    public function __construct(
        public readonly string $id,
        public readonly string $status,
        private readonly string $redirectUrl = ''
    ) {}

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function getCheckoutUrl(): string
    {
        $query = http_build_query(['payment_id' => $this->id, 'redirect_url' => $this->redirectUrl]);
        return 'https://payments.test/checkout?' . $query;
    }
}
