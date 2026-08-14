import os
import sys

# Load environment and set up path so we can import the updater
sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline", "src"))
from updaters.treasury_updater import run_updater

def test_parser_failure():
    print("Running parser failure test...")
    # Pass a valid PDF structure but with garbage text, or just a small file that pdfplumber can open but has no "Amount Offered"
    import io
    from reportlab.pdfgen import canvas
    
    packet = io.BytesIO()
    can = canvas.Canvas(packet)
    can.drawString(10, 100, "Hello world, this is a garbage PDF that has no Treasury Data.")
    can.save()
    
    mock_pdf = packet.getvalue()
    
    # We execute run_updater with this mock PDF
    run_updater(trigger_type="MANUAL_TEST", mock_pdf_bytes=mock_pdf)
    print("Test finished. Please verify in DB that the latest run has PARSER_FAILED.")

if __name__ == "__main__":
    test_parser_failure()
