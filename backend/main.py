from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response
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
import stat
from minio import Minio
from minio.error import S3Error
import uuid

# Configuração do MinIO
MINIO_ENDPOINT = "minio-hlg.tpn.terra.com"
MINIO_ACCESS_KEY = ""  # Será preenchido posteriormente
MINIO_SECRET_KEY = ""  # Será preenchido posteriormente
MINIO_BUCKET_NAME = ""  # Será preenchido posteriormente
MINIO_SECURE = True

# Inicializar cliente MinIO
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

# Função para salvar arquivo temporário no MinIO
async def save_to_minio(file: UploadFile) -> str:
    try:
        # Gerar nome único para o arquivo
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        object_name = f"temp/{file_id}{file_extension}"
        
        # Ler o conteúdo do arquivo
        content = await file.read()
        
        # Fazer upload para o MinIO
        minio_client.put_object(
            MINIO_BUCKET_NAME,
            object_name,
            data=content,
            length=len(content),
            content_type=file.content_type
        )
        
        return object_name
    except S3Error as e:
        logger.error(f"Erro ao salvar arquivo no MinIO: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao salvar arquivo temporário")

# Função para obter arquivo do MinIO
def get_from_minio(object_name: str) -> bytes:
    try:
        response = minio_client.get_object(MINIO_BUCKET_NAME, object_name)
        return response.read()
    except S3Error as e:
        logger.error(f"Erro ao obter arquivo do MinIO: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao obter arquivo temporário")

# Função para remover arquivo do MinIO
def remove_from_minio(object_name: str):
    try:
        minio_client.remove_object(MINIO_BUCKET_NAME, object_name)
    except S3Error as e:
        logger.error(f"Erro ao remover arquivo do MinIO: {str(e)}")

class SFTPCredentials(BaseModel):
    host: str
    port: int
    username: str
    password: str
    name: str = ""  # Nome para identificar a conexão favorita
    path: str = "/sasdata"  # Caminho para listar arquivos

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
    allow_origins=["*"],  # Permitir todas as origens durante o desenvolvimento
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
        # Salvar arquivo no MinIO
        object_name = await save_to_minio(file)
        
        try:
            # Obter arquivo do MinIO
            file_content = get_from_minio(object_name)
            
            # Criar arquivo temporário
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            # Ler arquivo SAS
            with SAS7BDAT(temp_path) as f:
                df = f.to_data_frame()
            
            # Converter para Parquet
            table = pa.Table.from_pandas(df)
            parquet_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.parquet")
            pq.write_table(table, parquet_path)
            
            # Ler arquivo Parquet
            with open(parquet_path, "rb") as f:
                result = {"file": f.read()}
            
            # Limpar arquivos temporários
            os.unlink(temp_path)
            os.unlink(parquet_path)
            remove_from_minio(object_name)
            
            return result
            
        except Exception as e:
            # Garantir que o arquivo seja removido do MinIO em caso de erro
            remove_from_minio(object_name)
            raise e
    
    except Exception as e:
        logger.error(f"Erro ao converter para Parquet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert/pdsas")
async def convert_to_pdsas(file: UploadFile = File(...)):
    try:
        # Salvar arquivo no MinIO
        object_name = await save_to_minio(file)
        
        try:
            # Obter arquivo do MinIO
            file_content = get_from_minio(object_name)
            
            # Criar arquivo temporário
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            # Ler arquivo SAS
            with SAS7BDAT(temp_path) as f:
                df = f.to_data_frame()
            
            # Converter para PDSAS (CSV com formato específico)
            pdsas_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.csv")
            df.to_csv(pdsas_path, index=False, sep='|')
            
            # Ler arquivo PDSAS
            with open(pdsas_path, "rb") as f:
                result = {"file": f.read()}
            
            # Limpar arquivos temporários
            os.unlink(temp_path)
            os.unlink(pdsas_path)
            remove_from_minio(object_name)
            
            return result
            
        except Exception as e:
            # Garantir que o arquivo seja removido do MinIO em caso de erro
            remove_from_minio(object_name)
            raise e
    
    except Exception as e:
        logger.error(f"Erro ao converter para PDSAS: {str(e)}")
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
    
    if verify_user(user.username, user.password):
        logger.info(f"Login successful for user: {user.username}")
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    logger.error(f"Login failed for user: {user.username}")
    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.get("/users/me")
async def read_users_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}

@app.post("/api/sftp/list")
async def list_sftp_files(credentials: SFTPCredentials, current_user: str = Depends(get_current_user)):
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
        
        # List files in the specified directory
        files = []
        for item in sftp.listdir_attr(credentials.path):
            file_info = {
                "name": item.filename,
                "path": f"{credentials.path}/{item.filename}",
                "isDirectory": stat.S_ISDIR(item.st_mode),
                "size": item.st_size,
                "modified": datetime.fromtimestamp(item.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            }
            files.append(file_info)
        
        # Close connections
        sftp.close()
        ssh.close()
        
        return {"files": files}
    
    except Exception as e:
        logger.error(f"Error listing SFTP files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sftp/download")
async def download_file(credentials: SFTPCredentials):
    try:
        # Estabelecer conexão SSH
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=credentials.host,
            port=credentials.port,
            username=credentials.username,
            password=credentials.password
        )

        # Criar cliente SFTP
        sftp = ssh.open_sftp()

        # Verificar se o arquivo existe
        try:
            sftp.stat(credentials.path)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        # Ler o arquivo
        file_data = sftp.file(credentials.path, 'rb').read()

        # Fechar conexões
        sftp.close()
        ssh.close()

        # Retornar o arquivo como resposta
        return Response(
            content=file_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(credentials.path)}"
            }
        )

    except Exception as e:
        logger.error(f"Erro ao baixar arquivo: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao baixar arquivo")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 