from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# NOTE: We used to run this with poolclass=NullPool, which opens a brand
# new Postgres connection (full TCP + TLS + auth handshake against
# Supabase) on *every single request* and throws it away right after.
# That's the right pattern for short-lived serverless functions, but this
# is a long-running uvicorn process on Render -- so every request was
# paying full connection-setup cost for no reason, which is what was
# causing the consistent 5-10s page loads.
#
# Fix: use a small real pool so a handful of connections stay open and
# get reused across requests. `statement_cache_size=0` is kept regardless
# of pool type -- that's an asyncpg-level setting needed for compatibility
# with Supabase's PgBouncer (transaction-mode) pooler, which doesn't
# support server-side prepared statements. `pool_pre_ping` checks a
# connection is still alive before handing it out, so a connection that
# Supabase's pooler silently dropped doesn't surface as a random error.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=5,
    pool_recycle=300,     # recycle before Supabase's pooler idle-times it out
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0
    }
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()