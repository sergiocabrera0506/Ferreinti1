#!/usr/bin/env python3
"""
Backend API Test Suite for Tienda Ferre Inti
Tests all major functionality including auth, products, admin operations.
"""

import requests
import json
import sys
from datetime import datetime
import time

BACKEND_URL = "https://ferreinti-admin.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Admin credentials from review request
ADMIN_EMAIL = "admin@ferreinti.com"
ADMIN_PASSWORD = "admin123"

class FerreTester:
    def __init__(self):
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.created_products = []
        self.errors = []
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, test_name, test_func):
        """Run a single test with error handling"""
        self.tests_run += 1
        self.log(f"🔍 Testing: {test_name}")
        
        try:
            success = test_func()
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED: {test_name}")
                return True
            else:
                self.log(f"❌ FAILED: {test_name}")
                self.errors.append(f"Failed: {test_name}")
                return False
        except Exception as e:
            self.log(f"❌ ERROR in {test_name}: {str(e)}")
            self.errors.append(f"Error in {test_name}: {str(e)}")
            return False
    
    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{BACKEND_URL}/docs", timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def test_seed_data(self):
        """Initialize seed data"""
        try:
            response = self.session.post(f"{API_BASE}/seed", timeout=15)
            # Should return 200 even if data already exists
            return response.status_code in [200, 400]  # 400 if already seeded
        except:
            return False
    
    def test_get_categories(self):
        """Test getting categories"""
        try:
            response = self.session.get(f"{API_BASE}/categories")
            if response.status_code == 200:
                data = response.json()
                return isinstance(data, list) and len(data) > 0
            return False
        except:
            return False
    
    def test_get_products(self):
        """Test getting products list"""
        try:
            response = self.session.get(f"{API_BASE}/products")
            if response.status_code == 200:
                data = response.json()
                return isinstance(data, list) and len(data) > 0
            return False
        except:
            return False
    
    def test_admin_login(self):
        """Test admin login with provided credentials"""
        try:
            login_data = {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
            
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get('session_token')
                
                # Verify admin role
                if data.get('role') == 'admin':
                    self.log(f"   Admin logged in: {data.get('name')} ({data.get('email')})")
                    return True
                else:
                    self.log(f"   User role is {data.get('role')}, not admin")
                    return False
            else:
                self.log(f"   Login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"   Login exception: {e}")
            return False
    
    def test_admin_dashboard(self):
        """Test admin dashboard access"""
        try:
            response = self.session.get(f"{API_BASE}/admin/dashboard")
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_products', 'total_users', 'total_orders', 'revenue']
                return all(field in data for field in required_fields)
            return False
        except:
            return False
    
    def test_admin_get_products(self):
        """Test admin products endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/admin/products")
            if response.status_code == 200:
                data = response.json()
                return 'products' in data and isinstance(data['products'], list)
            return False
        except:
            return False
    
    def test_create_product(self):
        """Test creating a new product via admin"""
        try:
            # First get categories to use one
            cat_response = self.session.get(f"{API_BASE}/categories")
            if cat_response.status_code != 200:
                return False
                
            categories = cat_response.json()
            if not categories:
                return False
                
            # Create test product
            product_data = {
                "name": f"Test Product {int(time.time())}",
                "description": "Test product created by automated testing",
                "price": 29.99,
                "original_price": 39.99,
                "category_id": categories[0]['category_id'],
                "sku": f"TEST-{int(time.time())}",
                "stock": 100,
                "images": ["https://images.unsplash.com/photo-1586864387789-628af9feed72?w=400"],
                "features": ["Test feature 1", "Test feature 2"],
                "is_offer": True,
                "is_bestseller": False,
                "is_new": True
            }
            
            response = self.session.post(f"{API_BASE}/admin/products", json=product_data)
            
            if response.status_code == 200:
                result = response.json()
                product_id = result.get('product_id')
                if product_id:
                    self.created_products.append(product_id)
                    self.log(f"   Created product: {product_id}")
                    return True
            
            self.log(f"   Create product failed: {response.status_code} - {response.text}")
            return False
            
        except Exception as e:
            self.log(f"   Create product exception: {e}")
            return False
    
    def test_get_created_product(self):
        """Test getting the created product from public API"""
        if not self.created_products:
            return False
            
        try:
            product_id = self.created_products[0]
            response = self.session.get(f"{API_BASE}/products/{product_id}")
            
            if response.status_code == 200:
                product = response.json()
                # Verify product data
                return (product.get('product_id') == product_id and 
                       'name' in product and 
                       'price' in product)
            return False
            
        except:
            return False
    
    def test_update_product(self):
        """Test updating a product"""
        if not self.created_products:
            return False
            
        try:
            product_id = self.created_products[0]
            update_data = {
                "name": "Updated Test Product",
                "price": 35.99
            }
            
            response = self.session.put(f"{API_BASE}/admin/products/{product_id}", json=update_data)
            return response.status_code == 200
            
        except:
            return False
    
    def test_delete_product(self):
        """Test deleting a product"""
        if not self.created_products:
            return False
            
        try:
            product_id = self.created_products.pop(0)  # Remove from our list
            response = self.session.delete(f"{API_BASE}/admin/products/{product_id}")
            return response.status_code == 200
            
        except:
            return False
    
    def test_products_search(self):
        """Test product search functionality"""
        try:
            response = self.session.get(f"{API_BASE}/products?search=martillo")
            if response.status_code == 200:
                products = response.json()
                return isinstance(products, list)
            return False
        except:
            return False
    
    def test_products_filter_offers(self):
        """Test filtering products by offers"""
        try:
            response = self.session.get(f"{API_BASE}/products?is_offer=true")
            if response.status_code == 200:
                products = response.json()
                return isinstance(products, list)
            return False
        except:
            return False
    
    def test_admin_get_categories(self):
        """Test admin categories endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/admin/categories")
            if response.status_code == 200:
                data = response.json()
                return 'categories' in data and isinstance(data['categories'], list)
            return False
        except:
            return False
    
    def cleanup(self):
        """Clean up any remaining test products"""
        for product_id in self.created_products:
            try:
                self.session.delete(f"{API_BASE}/admin/products/{product_id}")
                self.log(f"   Cleaned up product: {product_id}")
            except:
                pass
    
    def run_all_tests(self):
        """Run all tests in order"""
        self.log("🚀 Starting Ferre Inti Backend API Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        # Basic connectivity
        self.run_test("API Connectivity", self.test_basic_connectivity)
        
        # Data setup
        self.run_test("Seed Data", self.test_seed_data)
        
        # Public API tests
        self.run_test("Get Categories", self.test_get_categories)
        self.run_test("Get Products", self.test_get_products)
        self.run_test("Search Products", self.test_products_search)
        self.run_test("Filter Offers", self.test_products_filter_offers)
        
        # Admin authentication
        self.run_test("Admin Login", self.test_admin_login)
        
        # Admin API tests (require authentication)
        if self.admin_token:
            self.run_test("Admin Dashboard", self.test_admin_dashboard)
            self.run_test("Admin Get Products", self.test_admin_get_products)
            self.run_test("Admin Get Categories", self.test_admin_get_categories)
            
            # CRUD operations
            self.run_test("Create Product", self.test_create_product)
            self.run_test("Get Created Product", self.test_get_created_product)
            self.run_test("Update Product", self.test_update_product)
            self.run_test("Delete Product", self.test_delete_product)
        else:
            self.log("⚠️  Skipping admin tests - login failed")
        
        # Cleanup
        self.cleanup()
        
        # Summary
        self.log("\n" + "="*50)
        self.log("📊 TEST SUMMARY")
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.errors:
            self.log("\n❌ ERRORS:")
            for error in self.errors:
                self.log(f"  - {error}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FerreTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())