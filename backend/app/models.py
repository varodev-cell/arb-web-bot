from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from .db import Base
class Signal(Base):
  __tablename__ = "signals"
  id = Column(Integer, primary_key=True, index=True)
  symbol = Column(String, index=True)
  src = Column(String) # биржа-источник (дешевле)
  dst = Column(String) # биржа-приёмник (дороже)
  src_price = Column(Float)
  dst_price = Column(Float)
  spread_bps = Column(Float)
  created_at = Column(DateTime(timezone=True), server_default=func.now())
