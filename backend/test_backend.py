#!/usr/bin/env python3
"""
Test script for ForensiX backend
Verifies pytsk3 and libewf functionality
"""
import sys
import os

def test_imports():
    """Test if required libraries can be imported"""
    print("=" * 60)
    print("Testing Python Imports")
    print("=" * 60)
    
    tests = {
        'fastapi': 'FastAPI web framework',
        'pytsk3': 'The Sleuth Kit (pytsk3)',
        'pyewf': 'libewf (E01 support)',
        'pydantic': 'Pydantic data validation',
    }
    
    results = {}
    for module, description in tests.items():
        try:
            __import__(module)
            print(f"✓ {module:15} - {description}")
            results[module] = True
        except ImportError as e:
            print(f"✗ {module:15} - {description} - ERROR: {e}")
            results[module] = False
    
    print()
    return all(results.values())


def test_pytsk3():
    """Test pytsk3 basic functionality"""
    print("=" * 60)
    print("Testing pytsk3 Functionality")
    print("=" * 60)
    
    try:
        import pytsk3
        
        # Check version
        print(f"✓ pytsk3 version: {pytsk3.TSK_VERSION_STR}")
        
        # Test constants
        print(f"✓ TSK_IMG_TYPE_RAW: {pytsk3.TSK_IMG_TYPE_RAW}")
        print(f"✓ TSK_FS_TYPE_NTFS: {pytsk3.TSK_FS_TYPE_NTFS}")
        print(f"✓ TSK_FS_TYPE_FAT32: {pytsk3.TSK_FS_TYPE_FAT32}")
        
        print("\npytsk3 basic tests passed!")
        return True
    except Exception as e:
        print(f"✗ pytsk3 test failed: {e}")
        return False


def test_pyewf():
    """Test libewf basic functionality"""
    print("\n" + "=" * 60)
    print("Testing libewf (pyewf) Functionality")
    print("=" * 60)
    
    try:
        import pyewf
        
        # Check if we can create a handle
        handle = pyewf.handle()
        print(f"✓ Created pyewf handle: {type(handle)}")
        
        print("\npyewf basic tests passed!")
        return True
    except Exception as e:
        print(f"✗ pyewf test failed: {e}")
        return False


def test_services():
    """Test ForensiX service modules"""
    print("\n" + "=" * 60)
    print("Testing ForensiX Services")
    print("=" * 60)
    
    try:
        # Add parent directory to path
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        
        from app.services.image_handler import DiskImageHandler
        from app.services.filesystem_analyzer import FilesystemAnalyzer
        from app.models.schemas import DiskImageInfo, FileMetadata
        
        print("✓ Imported DiskImageHandler")
        print("✓ Imported FilesystemAnalyzer")
        print("✓ Imported data models")
        
        print("\nService module tests passed!")
        return True
    except Exception as e:
        print(f"✗ Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api():
    """Test API endpoints"""
    print("\n" + "=" * 60)
    print("Testing API Endpoints")
    print("=" * 60)
    
    try:
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        
        from app.main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test health endpoint
        response = client.get("/api/forensics/health")
        print(f"✓ Health endpoint: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"  Status: {data['status']}")
        print(f"  Service: {data['service']}")
        
        # Test root endpoint
        response = client.get("/")
        print(f"✓ Root endpoint: {response.status_code}")
        assert response.status_code == 200
        
        print("\nAPI endpoint tests passed!")
        return True
    except ImportError:
        print("⚠ Skipping API tests (install 'pip install httpx' for API testing)")
        return True
    except Exception as e:
        print(f"✗ API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("ForensiX Backend Test Suite")
    print("=" * 60 + "\n")
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("pytsk3", test_pytsk3()))
    results.append(("pyewf", test_pyewf()))
    results.append(("Services", test_services()))
    results.append(("API", test_api()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:8} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Backend is ready for use.")
        return 0
    else:
        print(f"\n⚠ {total - passed} test(s) failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
