import sys
import os

try:
    from maternal_health_rag.app import app
    print("SUCCESS: App imported successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("FAILED: App import failed.")
