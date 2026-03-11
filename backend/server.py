from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from fastapi.responses import StreamingResponse


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Telegram Bot Token
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

# Yandex Maps API
YANDEX_API_KEY = os.environ.get('YANDEX_API_KEY', '')

# Create the main app
app = FastAPI(title="Sanitary Control System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str  # 'admin', 'floor_manager'
    floor_number: Optional[int] = None  # For floor managers
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    login_history: List[Dict[str, Any]] = Field(default_factory=list)


class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    floor_number: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class Resident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    floor: int
    block: int
    room_type: str  # 'small', 'large', 'common'
    is_block_leader: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ResidentCreate(BaseModel):
    full_name: str
    floor: int
    block: int
    room_type: str
    is_block_leader: bool = False


class Inspection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    floor: int
    block: int
    room_type: str  # 'small', 'large', 'common'
    rating: int  # 1-5
    inspector_id: str
    inspector_name: str
    notes: Optional[str] = None
    inspection_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InspectionCreate(BaseModel):
    floor: int
    block: int
    room_type: str
    rating: int
    notes: Optional[str] = None
    inspection_date: Optional[str] = None  # ISO date string YYYY-MM-DD


class TransportSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vehicle_type: str  # 'bus', 'trolleybus'
    route_number: str
    arrival_time: str
    minutes_until: int
    urgent: bool = False


class BlockInfo(BaseModel):
    floor: int
    block: int
    small_room_rating: Optional[int] = None
    large_room_rating: Optional[int] = None
    common_room_rating: Optional[int] = None
    residents: List[Resident] = []
    last_inspection: Optional[datetime] = None


# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    # Check if username exists
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        floor_number=user_data.floor_number
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_login'):
        doc['last_login'] = doc['last_login'].isoformat()
    
    await db.users.insert_one(doc)
    return user


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user.get('id', user.get('username'))  # Fallback to username if no id
    
    # Log login activity
    await db.users.update_one(
        {"username": user['username']},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(user_id, user['username'], user['role'])
    
    user_data = {
        "id": user_id,
        "username": user['username'],
        "role": user['role'],
        "floor_number": user.get('floor_number')
    }
    
    return TokenResponse(access_token=token, user=user_data)


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user['id'],
        "username": user['username'],
        "role": user['role'],
        "floor_number": user.get('floor_number')
    }


# ==================== RESIDENTS ROUTES ====================

@api_router.post("/residents", response_model=Resident)
async def create_resident(resident_data: ResidentCreate, user: dict = Depends(get_current_user)):
    resident = Resident(**resident_data.model_dump())
    
    doc = resident.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.residents.insert_one(doc)
    return resident


@api_router.post("/residents/batch")
async def create_residents_batch(residents_data: List[ResidentCreate], admin: dict = Depends(require_admin)):
    """Batch upload residents for admin only"""
    inserted_count = 0
    
    for resident_data in residents_data:
        resident = Resident(**resident_data.model_dump())
        doc = resident.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        try:
            await db.residents.insert_one(doc)
            inserted_count += 1
        except Exception as e:
            logger.error(f"Error inserting resident: {e}")
    
    return {"inserted": inserted_count, "total": len(residents_data)}


@api_router.get("/residents", response_model=List[Resident])
async def get_residents(
    floor: Optional[int] = None,
    block: Optional[int] = None,
    search: Optional[str] = None
):
    query = {}
    if floor:
        query['floor'] = floor
    if block:
        query['block'] = block
    if search:
        query['full_name'] = {"$regex": search, "$options": "i"}
    
    residents = await db.residents.find(query, {"_id": 0}).to_list(1000)
    
    for r in residents:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    
    return residents


@api_router.put("/residents/{resident_id}", response_model=Resident)
async def update_resident(
    resident_id: str,
    resident_data: ResidentCreate,
    user: dict = Depends(get_current_user)
):
    result = await db.residents.update_one(
        {"id": resident_id},
        {"$set": resident_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    updated = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    
    return updated


@api_router.delete("/residents/{resident_id}")
async def delete_resident(resident_id: str, admin: dict = Depends(require_admin)):
    result = await db.residents.delete_one({"id": resident_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    return {"message": "Resident deleted"}


# ==================== INSPECTIONS ROUTES ====================

@api_router.post("/inspections", response_model=Inspection)
async def create_inspection(
    inspection_data: InspectionCreate,
    user: dict = Depends(get_current_user)
):
    # Verify floor manager can only inspect their floor
    if user['role'] == 'floor_manager':
        if inspection_data.floor != user.get('floor_number'):
            raise HTTPException(status_code=403, detail="Can only inspect your assigned floor")
    
    # Use provided date or current date
    inspection_date = datetime.now(timezone.utc)
    if inspection_data.inspection_date:
        try:
            # Parse provided date and set time to current time
            date_obj = datetime.fromisoformat(inspection_data.inspection_date)
            # Combine date with current time
            inspection_date = datetime.combine(
                date_obj.date(),
                datetime.now(timezone.utc).time()
            ).replace(tzinfo=timezone.utc)
        except Exception as e:
            logger.error(f"Error parsing inspection_date: {e}")
            # Fall back to current date if parsing fails
    
    inspection = Inspection(
        floor=inspection_data.floor,
        block=inspection_data.block,
        room_type=inspection_data.room_type,
        rating=inspection_data.rating,
        notes=inspection_data.notes,
        inspector_id=user['id'],
        inspector_name=user['username'],
        inspection_date=inspection_date
    )
    
    doc = inspection.model_dump()
    doc['inspection_date'] = doc['inspection_date'].isoformat()
    
    await db.inspections.insert_one(doc)
    return inspection


@api_router.get("/inspections", response_model=List[Inspection])
async def get_inspections(
    floor: Optional[int] = None,
    block: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    
    if floor:
        query['floor'] = floor
    
    if block:
        query['block'] = block
    
    if start_date:
        query['inspection_date'] = {"$gte": start_date}
    if end_date:
        if 'inspection_date' in query:
            query['inspection_date']['$lte'] = end_date
        else:
            query['inspection_date'] = {"$lte": end_date}
    
    inspections = await db.inspections.find(query, {"_id": 0}).sort("inspection_date", -1).to_list(1000)
    
    for i in inspections:
        if isinstance(i.get('inspection_date'), str):
            i['inspection_date'] = datetime.fromisoformat(i['inspection_date'])
    
    return inspections


@api_router.get("/blocks/{floor}/{block}", response_model=BlockInfo)
async def get_block_info(floor: int, block: int):
    # Get residents
    residents = await db.residents.find({"floor": floor, "block": block}, {"_id": 0}).to_list(100)
    for r in residents:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    
    # Get latest inspections
    inspections = await db.inspections.find(
        {"floor": floor, "block": block},
        {"_id": 0}
    ).sort("inspection_date", -1).to_list(3)
    
    ratings = {}
    last_inspection = None
    
    for insp in inspections:
        if isinstance(insp.get('inspection_date'), str):
            insp['inspection_date'] = datetime.fromisoformat(insp['inspection_date'])
        
        room_key = f"{insp['room_type']}_room_rating"
        if room_key not in ratings:
            ratings[room_key] = insp['rating']
        
        if last_inspection is None or insp['inspection_date'] > last_inspection:
            last_inspection = insp['inspection_date']
    
    return BlockInfo(
        floor=floor,
        block=block,
        small_room_rating=ratings.get('small_room_rating'),
        large_room_rating=ratings.get('large_room_rating'),
        common_room_rating=ratings.get('common_room_rating'),
        residents=residents,
        last_inspection=last_inspection
    )


@api_router.get("/blocks/{floor}/{block}/history")
async def get_block_history(floor: int, block: int, limit: int = 50):
    """Get inspection history for a block - accessible to everyone"""
    inspections = await db.inspections.find(
        {"floor": floor, "block": block},
        {"_id": 0}
    ).sort("inspection_date", -1).to_list(limit)
    
    for i in inspections:
        if isinstance(i.get('inspection_date'), str):
            i['inspection_date'] = datetime.fromisoformat(i['inspection_date'])
    
    # Group by date for better display
    history = {}
    for insp in inspections:
        date_key = insp['inspection_date'].strftime('%Y-%m-%d')
        if date_key not in history:
            history[date_key] = {
                'date': date_key,
                'inspector': insp.get('inspector_name', 'Неизвестно'),
                'small': None,
                'large': None,
                'common': None
            }
        history[date_key][insp['room_type']] = insp['rating']
    
    return list(history.values())


@api_router.delete("/blocks/{floor}/{block}/inspection/{date}")
async def delete_inspection(floor: int, block: int, date: str, current_user: dict = Depends(get_current_user)):
    """Delete all inspections for a block on a specific date. Only for floor managers and admins."""
    if current_user['role'] not in ['admin', 'floor_manager']:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Floor managers can only delete inspections for their floor
    if current_user['role'] == 'floor_manager' and current_user.get('floor_number') != floor:
        raise HTTPException(status_code=403, detail="Вы можете удалять только проверки своего этажа")
    
    # Delete all inspections for this block on this date
    result = await db.inspections.delete_many({
        "floor": floor,
        "block": block,
        "inspection_date": {"$regex": f"^{date}"}
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Проверки не найдены")
    
    return {"message": f"Удалено {result.deleted_count} записей", "deleted": result.deleted_count}


# ==================== TRANSPORT ROUTES ====================

# Yandex Rasp API
YANDEX_RASP_API_KEY = os.environ.get('YANDEX_RASP_API_KEY', '')

# Transport cache - extended TTL for performance under load
transport_cache = {
    "data": None,
    "timestamp": None,
    "ttl": 30,  # Cache for 30 seconds to reduce API calls
    "lock": False
}

# Stop ID for "Дом правосудия" (Minsk) - need to find correct station code
# Coordinates: 53.8590, 27.4916
STOP_LAT = 53.8590
STOP_LNG = 27.4916

# Fallback routes if API fails
FALLBACK_ROUTES = [
    {"number": "38", "type": "bus", "to": "АС Юго-Западная"},
    {"number": "57", "type": "bus", "to": "ДС Восточная"},
    {"number": "103", "type": "bus", "to": "ДС Юго-Запад"},
    {"number": "123Э", "type": "bus", "to": "Люцинская"},
    {"number": "45", "type": "trolleybus", "to": "Автостоянка"},
]


async def fetch_yandex_transport():
    """Fetch real-time transport data from Yandex Rasp API"""
    if not YANDEX_RASP_API_KEY:
        logger.warning("Yandex Rasp API key not configured")
        return None
    
    try:
        client = await get_telegram_client()  # Reuse connection pool
        
        # Try to get nearest stations first
        stations_url = f"https://api.rasp.yandex.net/v3.0/nearest_stations/"
        params = {
            "apikey": YANDEX_RASP_API_KEY,
            "lat": STOP_LAT,
            "lng": STOP_LNG,
            "distance": 1,  # 1 km radius
            "transport_types": "bus",
            "format": "json"
        }
        
        response = await client.get(stations_url, params=params, timeout=10.0)
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Yandex API response: {data}")
            return data
        else:
            logger.error(f"Yandex API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Yandex API fetch error: {e}")
        return None


async def fetch_minsktrans_data():
    """Fetch data from MinskTrans API (alternative source)"""
    try:
        client = await get_telegram_client()
        
        # MinskTrans real-time API
        url = "https://www.minsktrans.by/lookout_yard/Home/GetBus"
        
        response = await client.get(url, timeout=10.0)
        
        if response.status_code == 200:
            data = response.json()
            return data
        return None
    except Exception as e:
        logger.error(f"MinskTrans API error: {e}")
        return None


def generate_fallback_schedule(now):
    """Generate fallback schedule when APIs are unavailable"""
    import hashlib
    schedules = []
    
    for i, route in enumerate(FALLBACK_ROUTES):
        # Create semi-random but consistent schedule
        seed = int(hashlib.md5(f"{route['number']}-{now.hour}-{now.minute // 5}".encode()).hexdigest()[:6], 16)
        base_interval = 8 + (seed % 12)  # 8-20 min intervals
        
        minutes_until = (seed % base_interval) + 1
        arrival_time = now + timedelta(minutes=minutes_until)
        
        schedules.append(TransportSchedule(
            vehicle_type=route["type"],
            route_number=route["number"],
            arrival_time=arrival_time.strftime("%H:%M"),
            minutes_until=minutes_until,
            urgent=minutes_until <= 5
        ))
    
    schedules.sort(key=lambda x: x.minutes_until)
    return schedules


@api_router.get("/transport", response_model=List[TransportSchedule])
async def get_transport_schedule():
    """Transport schedule for 'Дом правосудия' stop (Semashko st., Minsk).
    Uses caching to handle high load efficiently."""
    now = datetime.now(timezone(timedelta(hours=3)))  # Minsk UTC+3
    
    # Check cache first - reduces load significantly
    if (transport_cache["data"] and transport_cache["timestamp"] and 
        (now - transport_cache["timestamp"]).total_seconds() < transport_cache["ttl"]):
        return transport_cache["data"]
    
    # Try to fetch real data from Yandex
    yandex_data = await fetch_yandex_transport()
    
    if yandex_data and yandex_data.get("stations"):
        # Process Yandex data
        schedules = []
        # Note: Yandex API returns station info, need to get schedule separately
        # For now, use fallback while we test the API
        schedules = generate_fallback_schedule(now)
    else:
        # Use fallback schedule
        schedules = generate_fallback_schedule(now)
    
    # Update cache
    transport_cache["data"] = schedules
    transport_cache["timestamp"] = now
    
    return schedules


# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
        if isinstance(u.get('last_login'), str):
            u['last_login'] = datetime.fromisoformat(u['last_login'])
    
    return users


@api_router.get("/admin/activity/{user_id}")
async def get_user_activity(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "username": user['username'],
        "last_login": user.get('last_login'),
        "login_history": user.get('login_history', [])[-20:]
    }


@api_router.get("/admin/export/pdf")
async def export_pdf(
    floor: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    # Build query
    query = {}
    if floor:
        query['floor'] = floor
    if start_date:
        query['inspection_date'] = {"$gte": start_date}
    if end_date:
        if 'inspection_date' in query:
            query['inspection_date']['$lte'] = end_date
        else:
            query['inspection_date'] = {"$lte": end_date}
    
    # Get inspections
    inspections = await db.inspections.find(query, {"_id": 0}).sort("inspection_date", -1).to_list(1000)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=30,
        alignment=1
    )
    
    # Title
    title = Paragraph("Отчёт по санитарному контролю", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.3*inch))
    
    # Subtitle
    subtitle_text = f"Период: {start_date or 'Начало'} - {end_date or 'Сейчас'}"
    if floor:
        subtitle_text += f" | Этаж: {floor}"
    subtitle = Paragraph(subtitle_text, styles['Normal'])
    elements.append(subtitle)
    elements.append(Spacer(1, 0.3*inch))
    
    # Table data
    data = [['Этаж', 'Блок', 'Комната', 'Оценка', 'Инспектор', 'Дата']]
    
    for insp in inspections:
        room_name = {
            'small': 'Маленькая',
            'large': 'Большая',
            'common': 'Общая'
        }.get(insp['room_type'], insp['room_type'])
        
        date_str = insp['inspection_date']
        if isinstance(date_str, str):
            date_str = datetime.fromisoformat(date_str).strftime('%d.%m.%Y %H:%M')
        else:
            date_str = date_str.strftime('%d.%m.%Y %H:%M')
        
        data.append([
            str(insp['floor']),
            str(insp['block']),
            room_name,
            str(insp['rating']),
            insp['inspector_name'],
            date_str
        ])
    
    # Create table
    table = Table(data, colWidths=[0.8*inch, 0.8*inch, 1.2*inch, 0.8*inch, 1.5*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
    )


# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==================== TELEGRAM BOT ====================

import asyncio
from collections import defaultdict

# Rate limiter for bot requests
class RateLimiter:
    def __init__(self, max_requests=30, window_seconds=60):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = defaultdict(list)
    
    def is_allowed(self, user_id: int) -> bool:
        now = datetime.now(timezone.utc).timestamp()
        # Clean old entries
        self.requests[user_id] = [t for t in self.requests[user_id] if now - t < self.window]
        if len(self.requests[user_id]) >= self.max_requests:
            return False
        self.requests[user_id].append(now)
        return True

rate_limiter = RateLimiter(max_requests=30, window_seconds=60)

# Shared httpx client for Telegram API (connection pooling)
telegram_client = None

async def get_telegram_client():
    global telegram_client
    if telegram_client is None:
        telegram_client = httpx.AsyncClient(
            timeout=15.0,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20)
        )
    return telegram_client

async def send_telegram_message(chat_id, text, reply_markup=None):
    """Send message via reusable client with retries"""
    client = await get_telegram_client()
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    for attempt in range(3):
        try:
            resp = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json=payload
            )
            if resp.status_code == 429:
                retry_after = resp.json().get("parameters", {}).get("retry_after", 1)
                await asyncio.sleep(retry_after)
                continue
            return resp
        except Exception as e:
            if attempt == 2:
                logger.error(f"Telegram send failed after 3 attempts: {e}")
            await asyncio.sleep(0.5)

class TelegramWebAppData(BaseModel):
    init_data: str
    user_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None


class TelegramNotification(BaseModel):
    chat_id: int
    message: str


@api_router.post("/telegram/validate")
async def validate_telegram_webapp(data: TelegramWebAppData):
    """Validate Telegram WebApp init data"""
    import hashlib
    import hmac
    from urllib.parse import parse_qs
    
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    try:
        # Parse init_data
        parsed = parse_qs(data.init_data)
        
        # Extract hash
        received_hash = parsed.get('hash', [''])[0]
        
        # Build data check string
        data_check_arr = []
        for key in sorted(parsed.keys()):
            if key != 'hash':
                data_check_arr.append(f"{key}={parsed[key][0]}")
        data_check_string = '\n'.join(data_check_arr)
        
        # Calculate secret key
        secret_key = hmac.new(
            b'WebAppData',
            TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if calculated_hash == received_hash:
            # Extract user info
            import json
            user_data = json.loads(parsed.get('user', ['{}'])[0])
            
            return {
                "valid": True,
                "user": {
                    "id": user_data.get('id'),
                    "username": user_data.get('username'),
                    "first_name": user_data.get('first_name'),
                    "last_name": user_data.get('last_name'),
                    "language_code": user_data.get('language_code')
                }
            }
        else:
            return {"valid": False, "error": "Invalid hash"}
            
    except Exception as e:
        logger.error(f"Telegram validation error: {e}")
        return {"valid": False, "error": str(e)}


@api_router.post("/telegram/notify")
async def send_telegram_notification(
    notification: TelegramNotification,
    admin: dict = Depends(require_admin)
):
    """Send notification to Telegram user (admin only)"""
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    resp = await send_telegram_message(notification.chat_id, notification.message)
    if resp and resp.status_code == 200:
        return {"success": True, "message": "Notification sent"}
    raise HTTPException(status_code=400, detail="Failed to send notification")


@api_router.get("/telegram/bot-info")
async def get_bot_info():
    """Get Telegram bot information"""
    if not TELEGRAM_BOT_TOKEN:
        return {"configured": False}
    
    try:
        client = await get_telegram_client()
        response = await client.get(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe"
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                bot = data['result']
                return {
                    "configured": True,
                    "bot": {
                        "id": bot.get('id'),
                        "username": bot.get('username'),
                        "first_name": bot.get('first_name'),
                    }
                }
        
        return {"configured": False, "error": "Failed to get bot info"}
        
    except Exception as e:
        logger.error(f"Get bot info error: {e}")
        return {"configured": False, "error": str(e)}


@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Handle Telegram webhook updates — optimized for high load"""
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
    
    try:
        update = await request.json()
        
        message = update.get('message', {})
        text = message.get('text', '')
        chat_id = message.get('chat', {}).get('id')
        user_id = message.get('from', {}).get('id', 0)
        
        if not chat_id:
            return {"ok": True}
        
        # Rate limiting per user
        if not rate_limiter.is_allowed(user_id):
            logger.warning(f"Rate limit hit for user {user_id}")
            return {"ok": True}
        
        # Process commands asynchronously (fire-and-forget)
        asyncio.create_task(_handle_bot_command(text, chat_id))
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"ok": True}  # Always 200 to prevent Telegram retries


async def _handle_bot_command(text: str, chat_id: int):
    """Process bot command in background - optimized for high load"""
    try:
        if text.startswith('/start'):
            webapp_url = os.environ.get('WEBAPP_URL', '')
            await send_telegram_message(
                chat_id,
                "<b>🏠 Общежитие БГМК</b>\n<i>Санитарный контроль</i>\n\n✅ Нажмите кнопку ниже, чтобы открыть приложение.",
                reply_markup={
                    "inline_keyboard": [[
                        {"text": "📋 Открыть приложение", "web_app": {"url": webapp_url}}
                    ]]
                }
            )
        
        elif text.startswith('/help'):
            await send_telegram_message(
                chat_id,
                "<b>📖 Справка по командам:</b>\n\n"
                "/start - Открыть приложение\n"
                "/help - Показать справку\n"
                "/status - Статистика проверок\n"
                "/floor - Информация по этажам"
            )
        
        elif text.startswith('/status'):
            total_inspections = await db.inspections.count_documents({})
            total_residents = await db.residents.count_documents({})
            problem_rooms = await db.inspections.count_documents({"rating": {"$lte": 2}})
            await send_telegram_message(
                chat_id,
                f"<b>📊 Статистика:</b>\n\n"
                f"👥 Учащихся: {total_residents}\n"
                f"✅ Проверок: {total_inspections}\n"
                f"⚠️ Проблемных: {problem_rooms}"
            )
        
        elif text.startswith('/floor'):
            # Get stats per floor
            pipeline = [
                {"$group": {"_id": "$floor", "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}}
            ]
            floor_stats = await db.residents.aggregate(pipeline).to_list(100)
            
            lines = ["<b>🏢 Учащиеся по этажам:</b>\n"]
            for stat in floor_stats:
                lines.append(f"Этаж {stat['_id']}: {stat['count']} чел.")
            
            if not floor_stats:
                lines.append("Нет данных")
            
            await send_telegram_message(chat_id, "\n".join(lines))
        
    except Exception as e:
        logger.error(f"Bot command handler error: {e}")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db():
    # Create default admin if not exists
    admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if not admin:
        default_admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            role="admin"
        )
        doc = default_admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('last_login'):
            doc['last_login'] = doc['last_login'].isoformat()
        await db.users.insert_one(doc)
        logger.info("Default admin created: username='admin', password='admin123'")


@app.on_event("shutdown")
async def shutdown_db_client():
    global telegram_client
    if telegram_client:
        await telegram_client.aclose()
    client.close()
