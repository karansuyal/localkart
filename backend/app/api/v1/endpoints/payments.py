from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Order, Shop, PaymentStatus
from app.schemas.schemas import PhonePeInitiateRequest, PhonePeInitiateResponse, PhonePeStatusOut
from app.services import phonepe_service
from app.api.v1.endpoints.orders import notify_new_order
from phonepe.sdk.pg.common.exceptions import PhonePeException

router = APIRouter()


@router.post("/phonepe/initiate", response_model=PhonePeInitiateResponse)
async def initiate_phonepe_payment(
    data: PhonePeInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer ne 'Pay Online' choose kiya -- order already ban chuka hai
    (place_order se), ab usko PhonePe checkout pe bhejte hain."""
    result = await db.execute(select(Order).where(Order.id == data.order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.payment_status == PaymentStatus.paid:
        raise HTTPException(status_code=400, detail="Order already paid")

    merchant_order_id = phonepe_service.new_merchant_order_id(order.id)
    total = order.total_amount + (order.delivery_fee or 0.0)

    try:
        redirect_url = phonepe_service.initiate_payment(
            order_id=order.id, amount_rupees=total, merchant_order_id=merchant_order_id
        )
    except PhonePeException as e:
        raise HTTPException(status_code=502, detail=f"PhonePe error: {e.message}")
    except RuntimeError as e:
        # PhonePe credentials not configured yet
        raise HTTPException(status_code=503, detail=str(e))

    order.payment_mode = "phonepe"
    order.payment_status = PaymentStatus.pending
    order.phonepe_merchant_order_id = merchant_order_id
    await db.commit()

    return PhonePeInitiateResponse(redirect_url=redirect_url, merchant_order_id=merchant_order_id)


@router.post("/phonepe/webhook")
async def phonepe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """PhonePe ka server-to-server callback -- source of truth for payment
    status. Configure this URL (https://<your-backend>/api/v1/payments/phonepe/webhook)
    plus PHONEPE_CALLBACK_USERNAME/PASSWORD on the PhonePe Business dashboard."""
    raw_body = (await request.body()).decode("utf-8")
    auth_header = request.headers.get("Authorization", "")

    try:
        callback = phonepe_service.validate_webhook(auth_header, raw_body)
    except PhonePeException:
        # Signature invalid -- don't touch any order, don't leak details
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = callback.payload
    merchant_order_id = payload.merchant_order_id if payload else None
    state = payload.state if payload else None
    txn_id = None
    if payload and payload.payment_details:
        txn_id = payload.payment_details[0].transaction_id

    if not merchant_order_id:
        return {"status": "ignored"}

    result = await db.execute(select(Order).where(Order.phonepe_merchant_order_id == merchant_order_id))
    order = result.scalar_one_or_none()
    if not order:
        return {"status": "ignored"}

    was_already_paid = order.payment_status == PaymentStatus.paid

    if state == "COMPLETED":
        order.payment_status = PaymentStatus.paid
        if txn_id:
            order.phonepe_transaction_id = txn_id
    elif state == "FAILED":
        order.payment_status = PaymentStatus.failed

    await db.commit()

    # Fire the shopkeeper/delivery alerts now that payment is confirmed --
    # skip if we'd already sent them (e.g. a retried webhook delivery).
    if state == "COMPLETED" and not was_already_paid:
        shop_res = await db.execute(select(Shop).where(Shop.id == order.shop_id))
        shop = shop_res.scalar_one_or_none()
        if shop:
            await notify_new_order(db, order, shop, order.total_amount, order.delivery_address)

    return {"status": "ok"}


@router.get("/phonepe/status/{order_id}", response_model=PhonePeStatusOut)
async def phonepe_status(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Frontend ye poll karta hai jab customer PhonePe se wapas redirect
    hota hai. Agar webhook already aa chuka hai to DB se turant answer mil
    jata hai; agar abhi tak PENDING hai to hum PhonePe se seedha check kar
    lete hain (webhook delay/miss ho sakta hai)."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.payment_status == PaymentStatus.pending and order.phonepe_merchant_order_id:
        try:
            status_resp = phonepe_service.check_order_status(order.phonepe_merchant_order_id)
            if status_resp.state == "COMPLETED":
                order.payment_status = PaymentStatus.paid
                await db.commit()
                shop_res = await db.execute(select(Shop).where(Shop.id == order.shop_id))
                shop = shop_res.scalar_one_or_none()
                if shop:
                    await notify_new_order(db, order, shop, order.total_amount, order.delivery_address)
            elif status_resp.state == "FAILED":
                order.payment_status = PaymentStatus.failed
                await db.commit()
        except PhonePeException:
            pass  # keep showing 'pending', frontend will poll again

    return PhonePeStatusOut(order_id=order.id, payment_status=order.payment_status, order_status=order.status)
