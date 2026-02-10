#!/usr/bin/env python3
"""
Backend API Testing for Ferre Inti Store
Tests all backend endpoints before frontend testing
"""

import requests
import sys
import json
from datetime import datetime

class FerreIntiAPITester:
    def __init__(self):
        # Use the public backend URL from frontend/.env
        self.base_url = "https://vista-mosaico.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test statistics
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        print("🏪 Testing Ferre Inti Backend APIs")
        print(f"📍 Backend URL: {self.base_url}")
        print("-" * 50)

    def run_test(self, name, method, endpoint, expected_status=200, data=None, auth_required=False):
        """Run a single API test with detailed logging"""
        url = f"{self.base_url}{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   {method} {endpoint}")
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, timeout=10)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, timeout=10)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, timeout=10)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   📊 Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        keys = list(response_data.keys())[:3]  # Show first 3 keys
                        print(f"   📊 Response keys: {keys}...")
                except:
                    print(f"   📊 Response: {response.text[:100]}...")
            else:
                self.failed_tests.append({
                    'test': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200] if response.text else 'No response'
                })
                print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   📝 Error: {response.text[:150]}...")

            return success, response.json() if success else None, response
            
        except requests.exceptions.Timeout:
            print(f"   ⏱️ TIMEOUT - Request took too long")
            self.failed_tests.append({'test': name, 'endpoint': endpoint, 'error': 'Timeout'})
            return False, None, None
        except requests.exceptions.ConnectionError:
            print(f"   🔌 CONNECTION ERROR - Cannot connect to server")
            self.failed_tests.append({'test': name, 'endpoint': endpoint, 'error': 'Connection Error'})
            return False, None, None
        except Exception as e:
            print(f"   💥 ERROR - {str(e)}")
            self.failed_tests.append({'test': name, 'endpoint': endpoint, 'error': str(e)})
            return False, None, None

    def test_basic_endpoints(self):
        """Test basic non-auth endpoints"""
        print("\n🏗️ TESTING BASIC ENDPOINTS")
        print("=" * 40)
        
        # Test seed endpoint (should initialize data)
        self.run_test("Database Seed", "POST", "/seed", expected_status=200)
        
        # Test categories endpoint
        success, categories, _ = self.run_test("Get Categories", "GET", "/categories", expected_status=200)
        
        # Test products endpoint 
        success, products, _ = self.run_test("Get Products", "GET", "/products", expected_status=200)
        
        # Test specific product filters
        self.run_test("Get Offers", "GET", "/products?is_offer=true", expected_status=200)
        self.run_test("Get Bestsellers", "GET", "/products?is_bestseller=true", expected_status=200)  
        self.run_test("Get New Products", "GET", "/products?is_new=true", expected_status=200)
        
        return categories, products

    def test_category_endpoints(self, categories):
        """Test category-specific endpoints"""
        print("\n📂 TESTING CATEGORY ENDPOINTS")
        print("=" * 40)
        
        if categories and len(categories) > 0:
            cat = categories[0]
            category_slug = cat.get('slug', 'test-category')
            category_id = cat.get('category_id', 'test-id')
            
            # Test category by slug
            self.run_test(f"Get Category by Slug", "GET", f"/categories/{category_slug}", expected_status=200)
            
            # Test products by category
            self.run_test(f"Get Products by Category", "GET", f"/products/category/{category_id}", expected_status=200)
        else:
            print("   ⚠️ No categories available for testing")

    def test_product_endpoints(self, products):
        """Test product-specific endpoints"""
        print("\n🛠️ TESTING PRODUCT ENDPOINTS") 
        print("=" * 40)
        
        if products and len(products) > 0:
            product = products[0]
            product_id = product.get('product_id', 'test-id')
            
            # Test specific product
            self.run_test(f"Get Product by ID", "GET", f"/products/{product_id}", expected_status=200)
            
            # Test related products
            self.run_test(f"Get Related Products", "GET", f"/products/related/{product_id}", expected_status=200)
            
            # Test product reviews
            self.run_test(f"Get Product Reviews", "GET", f"/reviews/{product_id}", expected_status=200)
        else:
            print("   ⚠️ No products available for testing")

    def test_search_endpoint(self):
        """Test search functionality"""
        print("\n🔍 TESTING SEARCH ENDPOINTS")
        print("=" * 40)
        
        # Test search
        self.run_test("Search Products - 'martillo'", "GET", "/products/search?q=martillo", expected_status=200)
        self.run_test("Search Products - 'herramienta'", "GET", "/products/search?q=herramienta", expected_status=200)

    def run_all_tests(self):
        """Execute all tests in sequence"""
        try:
            # Test basic endpoints first
            categories, products = self.test_basic_endpoints()
            
            # Test category-specific endpoints
            self.test_category_endpoints(categories)
            
            # Test product-specific endpoints 
            self.test_product_endpoints(products)
            
            # Test search functionality
            self.test_search_endpoint()
            
            # Print summary
            self.print_summary()
            
        except KeyboardInterrupt:
            print("\n⛔ Testing interrupted by user")
            self.print_summary()
            return 1
        except Exception as e:
            print(f"\n💥 Critical error during testing: {e}")
            self.print_summary()
            return 1
        
        # Return exit code based on test results
        return 0 if self.tests_passed == self.tests_run else 1

    def print_summary(self):
        """Print detailed test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure['test']}")
                print(f"   Endpoint: {failure['endpoint']}")
                if 'expected' in failure:
                    print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
                if 'error' in failure:
                    print(f"   Error: {failure['error']}")
                if 'response' in failure:
                    print(f"   Response: {failure['response']}")
                print()
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is ready for frontend testing.")
        else:
            print("⚠️  Some tests failed. Review issues before frontend testing.")


def main():
    """Main test execution"""
    tester = FerreIntiAPITester()
    return tester.run_all_tests()


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)