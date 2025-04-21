from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
from config.mongodb import init_db
from controllers import auth_controller, file_converter_controller, sftp_controller
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar MongoDB
@app.on_event("startup")
async def startup_event():
    await init_db()

# Incluir rotas dos controladores
app.include_router(auth_controller.router)
app.include_router(file_converter_controller.router)
app.include_router(sftp_controller.router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 