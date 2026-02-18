import requests
import sys
import json
from datetime import datetime
import uuid

class FerreIntiAPITester:
    def __init__(self, base_url="https://7596b2e0-c665-4f89-99c7-03cc23934f03.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, message="", response_data=None):
        """Log a test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {message}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "message": message,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add session token if available
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        # Merge additional headers
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            if success:
                self.log_test(name, True, response_data=response_data)
            else:
                self.log_test(name, False, 
                    f"Expected {expected_status}, got {response.status_code}. Response: {response_data}")

            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Network error: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Test seeding initial data"""
        print("\n🌱 Testing seed data creation...")
        success, response = self.run_test(
            "Seed Data Creation",
            "POST",
            "seed",
            200
        )
        return success

    def test_categories_api(self):
        """Test categories API endpoints"""
        print("\n📂 Testing categories API...")
        
        # Test get all categories
        success, response = self.run_test(
            "Get All Categories",
            "GET", 
            "categories",
            200
        )
        
        if success and response:
            categories = response
            if len(categories) > 0:
                self.log_test("Categories Data Available", True, f"Found {len(categories)} categories")
                
                # Test individual category by slug
                first_category = categories[0]
                if 'slug' in first_category:
                    success, _ = self.run_test(
                        "Get Category by Slug",
                        "GET",
                        f"categories/{first_category['slug']}",
                        200
                    )
            else:
                self.log_test("Categories Data Available", False, "No categories found")
        
        return success

    def test_products_api(self):
        """Test products API endpoints"""
        print("\n📦 Testing products API...")
        
        # Test get all products
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        if success and response:
            products = response
            if len(products) > 0:
                self.log_test("Products Data Available", True, f"Found {len(products)} products")
                
                # Test individual product
                first_product = products[0]
                if 'product_id' in first_product:
                    success, _ = self.run_test(
                        "Get Product by ID",
                        "GET",
                        f"products/{first_product['product_id']}",
                        200
                    )
                    
                    # Test products by category
                    if 'category_id' in first_product:
                        success, _ = self.run_test(
                            "Get Products by Category",
                            "GET",
                            f"products/category/{first_product['category_id']}",
                            200
                        )
                        
                        # Test related products
                        success, _ = self.run_test(
                            "Get Related Products",
                            "GET", 
                            f"products/related/{first_product['product_id']}",
                            200
                        )
            else:
                self.log_test("Products Data Available", False, "No products found")
        
        # Test filtered products
        self.run_test("Get Offers", "GET", "products?is_offer=true&limit=8", 200)
        self.run_test("Get Bestsellers", "GET", "products?is_bestseller=true&limit=8", 200)
        self.run_test("Get New Products", "GET", "products?is_new=true&limit=8", 200)
        
        return success

    def test_user_registration(self):
        """Test user registration (first user becomes admin)"""
        print("\n👤 Testing user registration...")
        
        # Generate unique user data
        timestamp = int(datetime.now().timestamp())
        test_email = f"admin_test_{timestamp}@ferreinti.com"
        test_password = "TestAdmin123!"
        test_name = "Admin Test User"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            {
                "email": test_email,
                "password": test_password, 
                "name": test_name
            }
        )
        
        if success and response:
            self.user_data = response
            self.session_token = response.get('session_token')
            
            # Check if first user got admin role
            if response.get('role') == 'admin':
                self.log_test("First User is Admin", True, "User correctly assigned admin role")
            else:
                self.log_test("First User is Admin", False, f"Expected admin role, got: {response.get('role')}")
        
        return success

    def test_user_login(self):
        """Test user login"""
        print("\n🔐 Testing user login...")
        
        if not self.user_data:
            self.log_test("Login Test", False, "No user data available for login test")
            return False
            
        # Test login with registered user
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login", 
            200,
            {
                "email": self.user_data.get('email'),
                "password": "TestAdmin123!"  # Known password from registration
            }
        )
        
        if success and response:
            self.session_token = response.get('session_token')
            
            # Test auth/me endpoint
            success, me_response = self.run_test(
                "Get Current User",
                "GET",
                "auth/me",
                200
            )
            
            if success and me_response:
                if me_response.get('role') == 'admin':
                    self.log_test("Admin Authentication", True, "Admin user authenticated successfully")
                else:
                    self.log_test("Admin Authentication", False, f"Expected admin, got: {me_response.get('role')}")
        
        return success

    def test_admin_endpoints(self):
        """Test admin-protected endpoints"""
        print("\n🔧 Testing admin endpoints...")
        
        if not self.session_token:
            self.log_test("Admin Endpoints", False, "No session token available")
            return False
        
        # Test admin dashboard
        success, _ = self.run_test(
            "Admin Dashboard",
            "GET",
            "admin/dashboard",
            200
        )
        
        # Test admin products
        success, _ = self.run_test(
            "Admin Get Products",
            "GET", 
            "admin/products",
            200
        )
        
        # Test admin categories
        success, _ = self.run_test(
            "Admin Get Categories",
            "GET",
            "admin/categories", 
            200
        )
        
        # Test admin orders
        success, _ = self.run_test(
            "Admin Get Orders",
            "GET",
            "admin/orders",
            200
        )
        
        return success

    def test_product_crud(self):
        """Test product CRUD operations"""
        print("\n📝 Testing product CRUD operations...")
        
        if not self.session_token:
            self.log_test("Product CRUD", False, "No admin session available")
            return False
        
        # Get categories first
        cat_success, cat_response = self.run_test(
            "Get Categories for CRUD",
            "GET",
            "categories", 
            200
        )
        
        if not cat_success or not cat_response:
            self.log_test("Product CRUD", False, "No categories available for testing")
            return False
        
        first_category = cat_response[0]
        
        # Create test product
        test_product = {
            "name": f"Test Product {uuid.uuid4().hex[:8]}",
            "description": "Test product for API testing",
            "price": 29.99,
            "original_price": 39.99,
            "category_id": first_category['category_id'],
            "sku": f"TEST-{uuid.uuid4().hex[:8].upper()}",
            "stock": 10,
            "images": ["https://via.placeholder.com/400"],
            "features": ["Test feature 1", "Test feature 2"],
            "is_offer": True,
            "is_bestseller": False,
            "is_new": True,
            "has_variants": False,
            "variants": []
        }
        
        # Test create product
        success, response = self.run_test(
            "Create Product",
            "POST",
            "admin/products",
            200,
            test_product
        )
        
        if success and response:
            product_id = response.get('product_id')
            if product_id:
                # Test update product
                update_data = {"name": "Updated Test Product"}
                success, _ = self.run_test(
                    "Update Product",
                    "PUT",
                    f"admin/products/{product_id}",
                    200,
                    update_data
                )
                
                # Test delete product
                success, _ = self.run_test(
                    "Delete Product",
                    "DELETE",
                    f"admin/products/{product_id}",
                    200
                )
        
        return success

    def test_category_crud(self):
        """Test category CRUD operations"""
        print("\n📂 Testing category CRUD operations...")
        
        if not self.session_token:
            self.log_test("Category CRUD", False, "No admin session available")
            return False
        
        # Create test category
        test_category = {
            "name": f"Test Category {uuid.uuid4().hex[:8]}",
            "slug": f"test-category-{uuid.uuid4().hex[:8]}",
            "image": "https://via.placeholder.com/400",
            "icon": "Wrench"
        }
        
        # Test create category
        success, response = self.run_test(
            "Create Category",
            "POST",
            "admin/categories",
            200,
            test_category
        )
        
        if success and response:
            category_id = response.get('category_id')
            if category_id:
                # Test update category
                update_data = {"name": "Updated Test Category"}
                success, _ = self.run_test(
                    "Update Category",
                    "PUT",
                    f"admin/categories/{category_id}",
                    200,
                    update_data
                )
                
                # Test delete category (should work since no products)
                success, _ = self.run_test(
                    "Delete Category",
                    "DELETE",
                    f"admin/categories/{category_id}",
                    200
                )
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting FERRE INTI API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Seed Data", self.test_seed_data),
            ("Categories API", self.test_categories_api),
            ("Products API", self.test_products_api),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Admin Endpoints", self.test_admin_endpoints),
            ("Product CRUD", self.test_product_crud),
            ("Category CRUD", self.test_category_crud),
        ]
        
        failed_tests = []
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                if not success:
                    failed_tests.append(test_name)
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
                failed_tests.append(test_name)
        
        # Final summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results Summary:")
        print(f"   Total tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if failed_tests:
            print(f"\n❌ Failed test categories: {', '.join(failed_tests)}")
        else:
            print(f"\n✅ All test categories passed!")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FerreIntiAPITester()
    success = tester.run_all_tests()
    
    # Return exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())