"""
Thin wrapper around PhonePe's official Python SDK (phonepe-pg-sdk-python)
for LocalKart's "pay online" checkout option (PG Standard Checkout, API v2).

Flow:
  1. Customer places an order (COD-style, unpaid) -> we get an order.id
  2. Frontend calls POST /api/v1/payments/phonepe/initiate {order_id}
  3. We call PhonePe's pay() with merchant_order_id = "LK-<order.id>-<uuid4>"
     and get back a redirect_url -> frontend sends the browser there
  4. Customer pays on PhonePe's hosted page
  5. PhonePe calls our webhook (POST /api/v1/payments/phonepe/webhook) with
     the final status -- this is the source of truth, not the redirect
  6. PhonePe also redirects the browser back to FRONTEND_URL/payment/result
     so the UI has something to show immediately; that page polls
     GET /api/v1/payments/phonepe/status/{order_id} until it's non-pending

Sandbox vs Production is purely a config switch (PHONEPE_ENV) -- no code
changes needed when the real merchant account is ready, just swap the
CLIENT_ID / CLIENT_SECRET / CLIENT_VERSION env vars.
"""
from uuid import uuid4
from phonepe.sdk.pg.payments.v2.standard_checkout_client import StandardCheckoutClient
from phonepe.sdk.pg.payments.v2.models.request.standard_checkout_pay_request import StandardCheckoutPayRequest
from phonepe.sdk.pg.common.exceptions import PhonePeException
from phonepe.sdk.pg.env import Env

from app.core.config import settings

_client = None  # lazily created singleton -- StandardCheckoutClient errors if re-instantiated


def get_client() -> StandardCheckoutClient:
    global _client
    if _client is None:
        if not settings.PHONEPE_CLIENT_ID or not settings.PHONEPE_CLIENT_SECRET:
            raise RuntimeError(
                "PhonePe credentials missing. Set PHONEPE_CLIENT_ID / "
                "PHONEPE_CLIENT_SECRET (and CLIENT_VERSION) in .env -- "
                "get UAT sandbox creds from business.phonepe.com onboarding."
            )
        env = Env.PRODUCTION if settings.PHONEPE_ENV.upper() == "PRODUCTION" else Env.SANDBOX
        _client = StandardCheckoutClient.get_instance(
            client_id=settings.PHONEPE_CLIENT_ID,
            client_secret=settings.PHONEPE_CLIENT_SECRET,
            client_version=settings.PHONEPE_CLIENT_VERSION,
            env=env,
            should_publish_events=False,
        )
    return _client


def new_merchant_order_id(order_id: int) -> str:
    """merchantOrderId must be <=63 chars, alnum + '_'/'-' only. Prefixing
    with our order id keeps it human-traceable in the PhonePe dashboard;
    the uuid suffix guarantees uniqueness across retries."""
    return f"LK-{order_id}-{uuid4().hex[:12]}"


def initiate_payment(order_id: int, amount_rupees: float, merchant_order_id: str) -> str:
    """Kicks off a PhonePe Standard Checkout payment. Returns the
    redirect_url the customer's browser should be sent to."""
    client = get_client()
    amount_paise = int(round(amount_rupees * 100))
    redirect_url = f"{settings.FRONTEND_URL}/payment/result?order_id={order_id}"

    pay_request = StandardCheckoutPayRequest.build_request(
        merchant_order_id=merchant_order_id,
        amount=amount_paise,
        redirect_url=redirect_url,
        expire_after=1800,  # 30 min to complete payment
    )
    response = client.pay(pay_request)
    return response.redirect_url


def check_order_status(merchant_order_id: str):
    """Returns PhonePe's OrderStatusResponse -- .state is PENDING/FAILED/COMPLETED."""
    client = get_client()
    return client.get_order_status(merchant_order_id, details=False)


def validate_webhook(authorization_header: str, raw_body: str):
    """Verifies the S2S callback really came from PhonePe using the
    username/password configured on the PhonePe dashboard for this
    callback URL. Raises PhonePeException if invalid."""
    client = get_client()
    return client.validate_callback(
        username=settings.PHONEPE_CALLBACK_USERNAME,
        password=settings.PHONEPE_CALLBACK_PASSWORD,
        callback_header_data=authorization_header,
        callback_response_data=raw_body,
    )
