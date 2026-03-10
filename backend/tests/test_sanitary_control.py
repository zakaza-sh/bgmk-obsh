"""
Backend tests for Sanitary Control System
Tests: Auth, Inspections API, Blocks API, Date filtering
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://room-ratings.preview.emergentagent.com')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print("✓ Health check passed")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success_admin(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == ADMIN_USERNAME
        assert data["user"]["role"] == "admin"
        print("✓ Admin login success")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")
    
    def test_get_me_authenticated(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["access_token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == ADMIN_USERNAME
        assert data["role"] == "admin"
        print("✓ Get current user passed")
    
    def test_get_me_no_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Unauthenticated access rejected")


class TestBlocksAPI:
    """Blocks endpoint tests"""
    
    def test_get_block_info(self):
        """Test getting block info for floor 2, block 1"""
        response = requests.get(f"{BASE_URL}/api/blocks/2/1")
        assert response.status_code == 200
        data = response.json()
        assert data["floor"] == 2
        assert data["block"] == 1
        assert "residents" in data
        assert "small_room_rating" in data
        assert "large_room_rating" in data
        assert "common_room_rating" in data
        print("✓ Get block info passed")
    
    def test_get_all_floors_blocks(self):
        """Test getting blocks from different floors (2-9)"""
        for floor in [2, 5, 9]:
            response = requests.get(f"{BASE_URL}/api/blocks/{floor}/1")
            assert response.status_code == 200
            data = response.json()
            assert data["floor"] == floor
            print(f"✓ Floor {floor} block 1 accessible")
    
    def test_get_nonexistent_block(self):
        """Test getting block that might not have data"""
        response = requests.get(f"{BASE_URL}/api/blocks/9/15")
        # Should return 200 with empty or default data
        assert response.status_code == 200
        print("✓ Nonexistent block returns default response")


class TestInspectionsAPI:
    """Inspections endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_inspection_single_room(self):
        """Test creating a single room inspection"""
        inspection_data = {
            "floor": 2,
            "block": 5,
            "room_type": "small",
            "rating": 4,
            "inspection_date": datetime.now().strftime("%Y-%m-%d")
        }
        response = requests.post(f"{BASE_URL}/api/inspections", 
            json=inspection_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["floor"] == 2
        assert data["block"] == 5
        assert data["room_type"] == "small"
        assert data["rating"] == 4
        assert "id" in data
        print("✓ Single room inspection created")
    
    def test_create_inspection_all_room_types(self):
        """Test creating inspections for all room types (batch simulation)"""
        room_types = ["small", "large", "common"]
        today = datetime.now().strftime("%Y-%m-%d")
        
        for room_type in room_types:
            inspection_data = {
                "floor": 2,
                "block": 6,
                "room_type": room_type,
                "rating": 3,
                "inspection_date": today
            }
            response = requests.post(f"{BASE_URL}/api/inspections", 
                json=inspection_data, headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["room_type"] == room_type
            print(f"✓ Inspection for {room_type} room created")
    
    def test_create_inspection_rating_boundaries(self):
        """Test inspections with rating boundary values (1 and 5)"""
        for rating in [1, 5]:
            inspection_data = {
                "floor": 2,
                "block": 7,
                "room_type": "common",
                "rating": rating,
                "inspection_date": datetime.now().strftime("%Y-%m-%d")
            }
            response = requests.post(f"{BASE_URL}/api/inspections", 
                json=inspection_data, headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["rating"] == rating
            print(f"✓ Rating {rating} inspection created")
    
    def test_get_inspections_with_date_filter(self):
        """Test filtering inspections by date range"""
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/inspections?floor=2&start_date={start_date}&end_date={end_date}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Date filter returned {len(data)} inspections")
    
    def test_get_inspections_by_floor(self):
        """Test filtering inspections by floor"""
        response = requests.get(f"{BASE_URL}/api/inspections?floor=2")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned inspections should be for floor 2
        for insp in data:
            assert insp["floor"] == 2
        print(f"✓ Floor filter returned {len(data)} inspections")
    
    def test_get_inspections_by_block(self):
        """Test filtering inspections by floor and block"""
        response = requests.get(f"{BASE_URL}/api/inspections?floor=2&block=1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for insp in data:
            assert insp["floor"] == 2
            assert insp["block"] == 1
        print(f"✓ Block filter returned {len(data)} inspections")
    
    def test_create_inspection_without_auth(self):
        """Test creating inspection without authentication"""
        inspection_data = {
            "floor": 2,
            "block": 1,
            "room_type": "small",
            "rating": 4
        }
        response = requests.post(f"{BASE_URL}/api/inspections", json=inspection_data)
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Unauthenticated inspection creation rejected")


class TestResidentsAPI:
    """Residents endpoint tests"""
    
    def test_get_residents_by_floor(self):
        """Test getting residents by floor"""
        response = requests.get(f"{BASE_URL}/api/residents?floor=2")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for resident in data:
            assert resident["floor"] == 2
        print(f"✓ Found {len(data)} residents on floor 2")
    
    def test_get_residents_by_block(self):
        """Test getting residents by floor and block"""
        response = requests.get(f"{BASE_URL}/api/residents?floor=2&block=1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for resident in data:
            assert resident["floor"] == 2
            assert resident["block"] == 1
        print(f"✓ Found {len(data)} residents in block 2/1")
    
    def test_search_residents(self):
        """Test searching residents by name"""
        response = requests.get(f"{BASE_URL}/api/residents?search=Загорская")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search returned {len(data)} residents")


class TestAdminEndpoints:
    """Admin-only endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_users(self):
        """Test admin getting all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least admin exists
        print(f"✓ Admin fetched {len(data)} users")
    
    def test_get_users_without_admin(self):
        """Test getting users without admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Non-admin access to users rejected")


class TestTransportAPI:
    """Transport schedule endpoint tests"""
    
    def test_get_transport_schedule(self):
        """Test getting transport schedule"""
        response = requests.get(f"{BASE_URL}/api/transport")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for item in data:
            assert "route_number" in item
            assert "arrival_time" in item
            assert "minutes_until" in item
        print(f"✓ Transport schedule returned {len(data)} routes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
