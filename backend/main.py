from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from sas7bdat import SAS7BDAT
import json
import tempfile
import shutil
from typing import List, Optional
import uvicorn
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit
import logging
from datetime import datetime, timedelta
import paramiko
from pydantic import BaseModel
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

class SFTPCredentials(BaseModel):
    host: str
    port: int
    username: str
    password: str
    name: str = ""  # Nome para identificar a conexão favorita

# Configurações do JWT
SECRET_KEY = "your-secret-key-here"  # Em produção, use uma chave segura
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Arquivo para armazenar as conexões favoritas
FAVORITES_FILE = "sftp_favorites.json"

# Modelo para o token
class Token(BaseModel):
    access_token: str
    token_type: str

# Modelo para dados do usuário
class User(BaseModel):
    username: str
    password: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def load_favorites():
    try:
        if os.path.exists(FAVORITES_FILE):
            with open(FAVORITES_FILE, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading favorites: {str(e)}")
        return []

def save_favorites(favorites):
    try:
        with open(FAVORITES_FILE, 'w') as f:
            json.dump(favorites, f)
    except Exception as e:
        logger.error(f"Error saving favorites: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save favorite")

def verify_user(username: str, password: str) -> bool:
    try:
        logger.info(f"Attempting to verify user: {username}")
        
        # Ler o arquivo Excel
        df = pd.read_excel('users.xlsx')
        logger.info(f"Users data loaded: \n{df}")
        
        # Verificar se o usuário e senha correspondem
        user_match = df[(df['username'] == username) & (df['password'] == password)]
        logger.info(f"Match result: {not user_match.empty}")
        
        return not user_match.empty
    except Exception as e:
        logger.error(f"Error verifying user: {e}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

@app.get("/")
async def read_root():
    return {"message": "Welcome to Data Portal API"}

@app.post("/api/convert/parquet")
async def convert_to_parquet(file: UploadFile = File(...)):
    try:
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded file
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Read SAS file
            with SAS7BDAT(file_path) as f:
                df = f.to_data_frame()
            
            # Convert to Parquet
            parquet_path = os.path.join(temp_dir, "output.parquet")
            table = pa.Table.from_pandas(df)
            pq.write_table(table, parquet_path)
            
            # Read and return Parquet file
            with open(parquet_path, "rb") as f:
                return {"file": f.read()}
    
    except Exception as e:
        logger.error(f"Error converting to Parquet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert/pdsas")
async def convert_to_pdsas(file: UploadFile = File(...)):
    try:
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded file
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Read SAS file
            with SAS7BDAT(file_path) as f:
                df = f.to_data_frame()
            
            # Convert to PDSAS format (CSV with specific format)
            pdsas_path = os.path.join(temp_dir, "output.csv")
            df.to_csv(pdsas_path, index=False, sep='|')
            
            # Read and return PDSAS file
            with open(pdsas_path, "rb") as f:
                return {"file": f.read()}
    
    except Exception as e:
        logger.error(f"Error converting to PDSAS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sas/job/{job_id}")
async def execute_sas_job(job_id: int, parameters: dict = None):
    try:
        # TODO: Implement SAS job execution
        return {"message": f"SAS Job {job_id} executed successfully", "parameters": parameters}
    
    except Exception as e:
        logger.error(f"Error executing SAS job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bigdata/job/{job_id}")
async def execute_bigdata_job(job_id: int, parameters: dict = None):
    try:
        # TODO: Implement Big Data job execution
        return {"message": f"Big Data Job {job_id} executed successfully", "parameters": parameters}
    
    except Exception as e:
        logger.error(f"Error executing Big Data job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs/view")
async def view_logs():
    try:
        # TODO: Implement log viewing
        return {"message": "Logs retrieved successfully"}
    
    except Exception as e:
        logger.error(f"Error viewing logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs/job")
async def view_job_logs():
    try:
        # TODO: Implement job log viewing
        return {"message": "Job logs retrieved successfully"}
    
    except Exception as e:
        logger.error(f"Error viewing job logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sftp/connect")
async def connect_sftp(credentials: SFTPCredentials):
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect to SFTP server
        ssh.connect(
            hostname=credentials.host,
            port=credentials.port,
            username=credentials.username,
            password=credentials.password
        )
        
        # Create SFTP client
        sftp = ssh.open_sftp()
        
        # Test connection by trying to list directory
        sftp.listdir('.')
        
        # Close connections
        sftp.close()
        ssh.close()
        
        logger.info(f"Successfully connected to SFTP server at {credentials.host}")
        return {"success": True, "message": "Successfully connected to SFTP server"}
    
    except Exception as e:
        logger.error(f"SFTP connection error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/api/sftp/favorites")
async def add_favorite(credentials: SFTPCredentials):
    try:
        # Primeiro testa a conexão
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            hostname=credentials.host,
            port=credentials.port,
            username=credentials.username,
            password=credentials.password
        )
        
        sftp = ssh.open_sftp()
        sftp.listdir('.')
        sftp.close()
        ssh.close()

        # Se a conexão foi bem sucedida, salva nos favoritos
        favorites = load_favorites()
        
        # Remove senha por segurança antes de salvar
        favorite_data = {
            "name": credentials.name or f"Conexão {len(favorites) + 1}",
            "host": credentials.host,
            "port": credentials.port,
            "username": credentials.username
        }
        
        favorites.append(favorite_data)
        save_favorites(favorites)
        
        return {"message": "Favorite added successfully"}
    except Exception as e:
        logger.error(f"Error adding favorite: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sftp/favorites")
async def get_favorites():
    try:
        return load_favorites()
    except Exception as e:
        logger.error(f"Error getting favorites: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sftp/favorites/{favorite_name}")
async def delete_favorite(favorite_name: str):
    try:
        favorites = load_favorites()
        favorites = [f for f in favorites if f["name"] != favorite_name]
        save_favorites(favorites)
        return {"message": "Favorite deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting favorite: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Verificar credenciais
    if not verify_user(form_data.username, form_data.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Criar token de acesso
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login")
async def login_json(user: User):
    logger.info(f"Login attempt for user: {user.username}")
    if not verify_user(user.username, user.password):
        logger.error(f"Login failed for user: {user.username}")
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    logger.info(f"Login successful for user: {user.username}")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 