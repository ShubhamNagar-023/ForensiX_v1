"""
ForensiX - Real Forensics Application Backend
Using pytsk3 and libewf for disk image analysis
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router

# Create FastAPI application
app = FastAPI(
    title="ForensiX Backend",
    description="Real forensics application using pytsk3 and libewf for E01 support",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ForensiX Backend",
        "version": "1.0.0",
        "status": "operational",
        "features": [
            "pytsk3 filesystem analysis",
            "libewf E01 image support",
            "Real forensic disk analysis"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
