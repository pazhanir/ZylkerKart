from fastapi import FastAPI, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import uvicorn
import time

app = FastAPI()

# Enable CORS for all origins (matching the Spring Boot @CrossOrigin behavior)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test")
def test():
    return "success"

@app.post("/payment")
def charge_customer(payload: dict = Body(...)):
    print(f"Received payment request: {payload}")
    
    # Generate mock values
    timestamp = int(time.time() * 1000)
    charge_id = f"ch_mock_{timestamp}"
    txn_id = f"txn_mock_{timestamp}"
    receipt_url = "http://localhost:9050/receipt"
    
    # Construct response matching PaymentStatus.java
    response = {
        "payment_failed": False,
        "order_id": timestamp,
        "charge_id": charge_id,
        "txn_id": txn_id,
        "receipt_url": receipt_url,
        "brand": "Visa",
        "last4": "4242",
        "exp_year": 2030,
        "exp_month": 12
    }
    
    print(f"Returning successful payment status: {response}")
    return response

@app.get("/receipt", response_class=HTMLResponse)
def get_receipt():
    return """
    <html>
        <head>
            <title>ZylkerKart Receipt</title>
            <style>
                body { font-family: sans-serif; padding: 40px; text-align: center; }
                .container { border: 1px solid #ccc; padding: 20px; border-radius: 8px; max-width: 500px; margin: 0 auto; }
                h1 { color: green; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Payment Successful!</h1>
                <p>Thank you for shopping at ZylkerKart.</p>
                <p>This is receipt for your transaction.</p>
                <p><strong>Amount Paid:</strong> $15.00</p>
            </div>
        </body>
    </html>
    """

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=9050, reload=True)
