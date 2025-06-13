#!/usr/bin/env python3
"""
Quick verification script to check Package and OPT field visibility
in both preview and compare views.
"""
import sys
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import os

def test_package_opt_fields():
    print("🔍 Testing Package and OPT field visibility...")
    
    # Setup Chrome driver with options
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in background
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.get("http://localhost:8080")
        
        wait = WebDriverWait(driver, 10)
        
        print("✅ Page loaded successfully")
        
        # Test file paths
        test_old_file = os.path.abspath("../test-data/a_old.xml")
        test_new_file = os.path.abspath("../test-data/a_new.xml")
        
        print(f"📁 Using test files:")
        print(f"   Old: {test_old_file}")
        print(f"   New: {test_new_file}")
        
        # Upload first file
        file_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']")))
        file_input.send_keys(test_old_file)
        
        time.sleep(2)
        
        # Upload second file
        file_input.send_keys(test_new_file)
        
        time.sleep(3)
        print("✅ Files uploaded")
        
        # Check for preview button and click it
        try:
            preview_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Preview')]")
            if preview_buttons:
                preview_buttons[0].click()
                time.sleep(2)
                print("✅ Preview button clicked")
                
                # Check if Package and OPT columns exist in preview table
                table_headers = driver.find_elements(By.CSS_SELECTOR, "thead th")
                header_texts = [th.text for th in table_headers]
                
                print(f"📊 Preview table headers: {header_texts}")
                
                package_in_preview = any("Package" in header for header in header_texts)
                opt_in_preview = any("OPT" in header for header in header_texts)
                
                print(f"   📦 Package field in preview: {'✅' if package_in_preview else '❌'}")
                print(f"   🔧 OPT field in preview: {'✅' if opt_in_preview else '❌'}")
                
        except Exception as e:
            print(f"⚠️ Preview test failed: {e}")
        
        # Switch to compare tab
        try:
            compare_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Compare')]")))
            compare_tab.click()
            time.sleep(3)
            print("✅ Compare tab clicked")
            
            # Look for compare button and click it
            compare_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Compare Files')]")))
            compare_button.click()
            time.sleep(5)
            print("✅ Compare button clicked")
            
            # Check for Package and OPT in compare tables
            time.sleep(3)
            
            # Look for table headers in compare view
            compare_headers = driver.find_elements(By.CSS_SELECTOR, "table thead th")
            compare_header_texts = [th.text for th in compare_headers]
            
            print(f"📊 Compare table headers: {compare_header_texts}")
            
            package_in_compare = any("Package" in header for header in compare_header_texts)
            opt_in_compare = any("OPT" in header for header in compare_header_texts)
            
            print(f"   📦 Package field in compare: {'✅' if package_in_compare else '❌'}")
            print(f"   🔧 OPT field in compare: {'✅' if opt_in_compare else '❌'}")
            
            # Check for specific component data
            table_cells = driver.find_elements(By.CSS_SELECTOR, "table tbody td")
            cell_texts = [cell.text for cell in table_cells if cell.text.strip()]
            
            print(f"📋 Sample table cell data: {cell_texts[:10]}...")
            
            # Summary
            print("\n📋 SUMMARY:")
            print(f"   Preview - Package: {'✅' if package_in_preview else '❌'}, OPT: {'✅' if opt_in_preview else '❌'}")
            print(f"   Compare - Package: {'✅' if package_in_compare else '❌'}, OPT: {'✅' if opt_in_compare else '❌'}")
            
            if package_in_preview and opt_in_preview and package_in_compare and opt_in_compare:
                print("🎉 SUCCESS: Package and OPT fields are visible in both preview and compare!")
                return True
            else:
                print("⚠️ ISSUE: Some fields are missing from preview or compare view")
                return False
                
        except Exception as e:
            print(f"❌ Compare test failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    if not os.path.exists("../test-data/a_old.xml") or not os.path.exists("../test-data/a_new.xml"):
        print("❌ Test files not found. Please ensure a_old.xml and a_new.xml exist in test-data/")
        sys.exit(1)
    
    success = test_package_opt_fields()
    sys.exit(0 if success else 1)
