"""
FCM Push Notification Service
Firebase Admin SDK already initialized in auth.py — ye same app use karta hai
"""
import json
import firebase_admin
from firebase_admin import messaging, credentials
from app.core.config import settings
import asyncio

def _ensure_firebase():
    """Firebase app ensure karo"""
    if not firebase_admin._apps:
        cred_json = settings.FIREBASE_SERVICE_ACCOUNT_JSON
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)

def _send_to_token(token: str, title: str, body: str, data: dict = None):
    """Single device pe notification bhejo"""
    _ensure_firebase()
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        token=token,
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default", badge=1)
            )
        ),
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title, body=body, icon="/icon-192.png",
                badge="/favicon-32.png",
            ),
            fcm_options=messaging.WebpushFCMOptions(link="https://localkart-five.vercel.app")

        )
    )
    try:
        messaging.send(message)
    except Exception as e:
        print(f"FCM send error: {e}")

def _send_to_topic(topic: str, title: str, body: str, data: dict = None):
    """Topic pe sabko notification bhejo (e.g. delivery partners)"""
    _ensure_firebase()
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        topic=topic,
        android=messaging.AndroidConfig(priority="high"),
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title, body=body, icon="/icon-192.png",
            )
        )
    )
    try:
        messaging.send(message)
    except Exception as e:
        print(f"FCM topic send error: {e}")

async def notify_customer(fcm_token: str, title: str, body: str, order_id: int = None):
    """Customer ko push notification"""
    if not fcm_token:
        return
    data = {"order_id": str(order_id), "type": "order_update"} if order_id else {}
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_to_token, fcm_token, title, body, data)

async def notify_shopkeeper(fcm_token: str, title: str, body: str, order_id: int = None):
    """Shopkeeper ko push notification"""
    if not fcm_token:
        return
    data = {"order_id": str(order_id), "type": "new_order"} if order_id else {}
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_to_token, fcm_token, title, body, data)

async def notify_delivery_partners(title: str, body: str, order_id: int = None):
    """Saare delivery partners ko notification (topic: delivery_partners)"""
    data = {"order_id": str(order_id), "type": "new_delivery"} if order_id else {}
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_to_topic, "delivery_partners", title, body, data)
