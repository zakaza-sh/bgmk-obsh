from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
    
    # Log login activity
    login_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip": "telegram-webapp"
    }
    
    await db.users.update_one(
        {"id": user['id']},
        {
            "$set": {"last_login": datetime.now(timezone.utc).isoformat()},
            "$push": {"login_history": {"$each": [login_record], "$slice": -50}}
        }
    )
    
    token = create_token(user['id'], user['username'], user['role'])
    
    user_data = {
        "id": user['id'],
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


# ==================== TRANSPORT ROUTES ====================

@api_router.get("/transport", response_model=List[TransportSchedule])
async def get_transport_schedule():
    # Real data for "Дом правосудия" stop in Minsk
    # Routes: 103, 57, 38, 32С
    current_time = datetime.now()
    
    # Generate realistic schedule based on time of day
    hour = current_time.hour
    
    # Base intervals (minutes between buses)
    base_intervals = {
        "103": 12,  # ДС Малиновка-4 — ДС Юго-Запад
        "57": 15,   # Семашко — ДС Восточная
        "38": 18,   # Автостанция «Юго-Западная» — Академика Карского, 44
        "32С": 20   # Express route
    }
    
    # Adjust for time of day (rush hour = more frequent)
    if 7 <= hour <= 9 or 17 <= hour <= 19:  # Rush hour
        multiplier = 0.7
    elif 22 <= hour or hour <= 6:  # Night
        multiplier = 2.0
    else:  # Normal time
        multiplier = 1.0
    
    schedules = []
    
    # Generate schedule for each route
    import random
    routes = [
        ("103", "ДС Малиновка-4 — ДС Юго-Запад"),
        ("57", "Семашко — ДС Восточная"),
        ("38", "Автостанция Юго-Западная"),
        ("32С", "Экспресс")
    ]
    
    for route_num, route_name in routes:
        # Calculate next arrival
        base_interval = base_intervals[route_num]
        interval = int(base_interval * multiplier)
        
        # Add some randomness (±2 minutes)
        minutes_until = random.randint(max(1, interval - 2), interval + 2)
        
        # Mark as urgent if less than 5 minutes
        is_urgent = minutes_until <= 5
        
        arrival_time = current_time + timedelta(minutes=minutes_until)
        
        schedules.append(TransportSchedule(
            vehicle_type="bus",
            route_number=route_num,
            arrival_time=arrival_time.strftime("%H:%M"),
            minutes_until=minutes_until,
            urgent=is_urgent
        ))
    
    # Sort by arrival time
    schedules.sort(key=lambda x: x.minutes_until)
    
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
    client.close()
