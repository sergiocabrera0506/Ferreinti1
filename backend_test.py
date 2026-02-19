#!/usr/bin/env python3
"""
FERRE INTI Backend API Test Suite
Tests all critical endpoints for the hardware store e-commerce application.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class FerreIntiAPITester:
    def __init__(self, base_url: str = "https://shop-cart-flow.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.session_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.session = requests.Session()
        
    def log_result(self, name: str, success: bool, status_code: int, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "status_code": status_code,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name} - Status: {status_code} {details}")
        
    def test_endpoint(self, name: str, method: str, endpoint: str, expected_status: int, 
                     data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict[str, Any]:
        """Test a single API endpoint"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        
        # Default headers
        req_headers = {'Content-Type': 'application/json'}
        if headers:
            req_headers.update(headers)
            
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=req_headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=req_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            try:
                response_data = response.json() if response.content else {}
            except json.JSONDecodeError:
                response_data = {"raw_content": response.text[:200]}
                
            self.log_result(name, success, response.status_code, 
                          f"Expected: {expected_status}")
            
            return {
                "success": success,
                "status_code": response.status_code,
                "data": response_data,
                "response": response
            }
            
        except Exception as e:
            self.log_result(name, False, 0, f"Error: {str(e)}")
            return {
                "success": False,
                "status_code": 0,
                "data": {},
                "error": str(e)
            }
    
    def test_seed_data(self):
        """Test seeding initial data"""
        print("\n🌱 Testing Data Seeding...")
        result = self.test_endpoint("Seed Initial Data", "POST", "/seed", 200)
        return result["success"]
    
    def test_categories(self):
        """Test category endpoints"""
        print("\n📁 Testing Category Endpoints...")
        
        # Get all categories
        result = self.test_endpoint("Get Categories", "GET", "/categories", 200)
        if not result["success"]:
            return False
            
        categories = result["data"]
        if not isinstance(categories, list):
            self.log_result("Categories Data Structure", False, 0, "Expected list")
            return False
            
        expected_count = 6
        if len(categories) < expected_count:
            self.log_result("Categories Count", False, 0, 
                          f"Expected >= {expected_count}, got {len(categories)}")
        else:
            self.log_result("Categories Count", True, 200, 
                          f"Found {len(categories)} categories")
            
        # Test individual category by slug
        if categories:
            first_cat = categories[0]
            if 'slug' in first_cat:
                self.test_endpoint("Get Category by Slug", "GET", 
                                 f"/categories/{first_cat['slug']}", 200)
        
        return True
    
    def test_products(self):
        """Test product endpoints"""
        print("\n📦 Testing Product Endpoints...")
        
        # Get all products
        result = self.test_endpoint("Get Products", "GET", "/products", 200)
        if not result["success"]:
            return False
            
        products = result["data"]
        if not isinstance(products, list):
            self.log_result("Products Data Structure", False, 0, "Expected list")
            return False
            
        expected_count = 7
        if len(products) < expected_count:
            self.log_result("Products Count", False, 0, 
                          f"Expected >= {expected_count}, got {len(products)}")
        else:
            self.log_result("Products Count", True, 200, 
                          f"Found {len(products)} products")
            
        # Test individual product by ID
        if products:
            first_product = products[0]
            if 'product_id' in first_product:
                self.test_endpoint("Get Product by ID", "GET", 
                                 f"/products/{first_product['product_id']}", 200)
        
        return True
    
    def test_auth_registration(self):
        """Test user registration"""
        print("\n👤 Testing Authentication...")
        
        # Try to register admin user (should already exist or create as admin)
        admin_data = {
            "name": "Admin FERRE INTI",
            "email": "admin@ferreinti.com", 
            "password": "admin123"
        }
        
        # This might return 400 if user exists, which is fine
        result = self.test_endpoint("Register Admin User", "POST", "/auth/register", 
                                  200, admin_data)
        
        # Even if registration fails due to existing user, try login
        return True
    
    def test_auth_login(self):
        """Test admin login"""
        print("\n🔑 Testing Admin Login...")
        
        login_data = {
            "email": "admin@ferreinti.com",
            "password": "admin123"
        }
        
        result = self.test_endpoint("Admin Login", "POST", "/auth/login", 200, login_data)
        
        if result["success"] and "session_token" in result["data"]:
            self.admin_token = result["data"]["session_token"]
            # Set cookie for session
            self.session.cookies.set('session_token', self.admin_token)
            self.log_result("Admin Token Obtained", True, 200, "Session established")
            return True
        else:
            self.log_result("Admin Token Failed", False, result["status_code"], 
                          "Could not obtain admin session")
            return False
    
    def test_auth_me(self):
        """Test getting current user info"""
        if not self.admin_token:
            self.log_result("Get Current User", False, 0, "No admin token available")
            return False
            
        result = self.test_endpoint("Get Current User", "GET", "/auth/me", 200)
        
        if result["success"] and result["data"].get("role") == "admin":
            self.log_result("Admin Role Verified", True, 200, "User has admin role")
            return True
        else:
            self.log_result("Admin Role Check", False, result["status_code"], 
                          f"Expected admin role, got: {result['data'].get('role', 'unknown')}")
            return False
    
    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        print("\n📊 Testing Admin Dashboard...")
        
        if not self.admin_token:
            self.log_result("Admin Dashboard", False, 0, "No admin authentication")
            return False
            
        result = self.test_endpoint("Admin Dashboard Stats", "GET", "/admin/dashboard", 200)
        
        if result["success"]:
            data = result["data"]
            required_fields = ["total_products", "total_users", "total_orders", "revenue"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if missing_fields:
                self.log_result("Dashboard Data Structure", False, 200, 
                              f"Missing fields: {missing_fields}")
            else:
                self.log_result("Dashboard Data Complete", True, 200, 
                              f"Products: {data['total_products']}, Users: {data['total_users']}")
                              
        return result["success"]
    
    def test_admin_products(self):
        """Test admin product management"""
        print("\n🛠️  Testing Admin Product Management...")
        
        if not self.admin_token:
            self.log_result("Admin Products", False, 0, "No admin authentication")
            return False
            
        # Get products via admin endpoint
        result = self.test_endpoint("Admin Get Products", "GET", "/admin/products", 200)
        
        if not result["success"]:
            return False
            
        # Try to create a test product
        test_product = {
            "name": "Test Product API",
            "description": "Product created via API test",
            "price": 15.99,
            "category_id": "cat_manual",  # Assuming manual tools category exists
            "stock": 10,
            "sku": f"TEST-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "images": [],
            "features": ["Test feature"],
            "is_new": True
        }
        
        create_result = self.test_endpoint("Admin Create Product", "POST", 
                                         "/admin/products", 200, test_product)
        
        return create_result["success"]
    
    def test_cart_operations(self):
        """Test cart functionality (requires authentication)"""
        print("\n🛒 Testing Cart Operations...")
        
        if not self.admin_token:
            self.log_result("Cart Operations", False, 0, "No user authentication")
            return False
            
        # Get empty cart
        result = self.test_endpoint("Get Cart", "GET", "/cart", 200)
        return result["success"]
    
    def test_public_endpoints_accessibility(self):
        """Test that public endpoints are accessible without auth"""
        print("\n🌐 Testing Public Endpoint Accessibility...")
        
        # Temporarily remove session for public tests
        original_cookies = self.session.cookies.copy()
        self.session.cookies.clear()
        
        try:
            # Test public endpoints
            endpoints = [
                ("Categories Public Access", "GET", "/categories", 200),
                ("Products Public Access", "GET", "/products", 200),
                ("Shipping Config Public", "GET", "/shipping/config", 200),
            ]
            
            all_passed = True
            for name, method, endpoint, expected in endpoints:
                result = self.test_endpoint(name, method, endpoint, expected)
                if not result["success"]:
                    all_passed = False
                    
            return all_passed
            
        finally:
            # Restore session cookies
            self.session.cookies = original_cookies
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting FERRE INTI Backend API Tests")
        print("=" * 60)
        
        # Test sequence
        test_functions = [
            ("Data Seeding", self.test_seed_data),
            ("Public Endpoints", self.test_public_endpoints_accessibility),
            ("Categories", self.test_categories),
            ("Products", self.test_products),
            ("User Registration", self.test_auth_registration),
            ("Admin Login", self.test_auth_login),
            ("User Authentication Check", self.test_auth_me),
            ("Admin Dashboard", self.test_admin_dashboard),
            ("Admin Products", self.test_admin_products),
            ("Cart Operations", self.test_cart_operations),
        ]
        
        for test_name, test_func in test_functions:
            try:
                test_func()
            except Exception as e:
                self.log_result(f"{test_name} (Exception)", False, 0, f"Error: {str(e)}")
                print(f"💥 {test_name} failed with exception: {e}")
        
        # Print final results
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("FERRE INTI - Hardware Store Backend API Test Suite")
    print(f"Backend URL: https://shop-cart-flow.preview.emergentagent.com")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = FerreIntiAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        results = {
            "test_summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "detailed_results": tester.test_results
        }
        
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())